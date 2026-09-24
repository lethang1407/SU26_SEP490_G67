package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.UpdateStoreRequest;
import project.be_sep490_g67.dto.response.StorePaymentInfoResponse;
import project.be_sep490_g67.dto.response.StoreResponse;
import project.be_sep490_g67.entity.StoreConfig;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.StoreConfigRepository;
import project.be_sep490_g67.repository.BusinessTaxProfileRepository;
import project.be_sep490_g67.repository.AccountingPeriodRepository;
import project.be_sep490_g67.repository.RevenueAdjustmentRepository;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.repository.TaxRecordRepository;
import project.be_sep490_g67.entity.BusinessTaxProfile;
import project.be_sep490_g67.entity.TaxRecord;
import project.be_sep490_g67.dto.request.*;
import project.be_sep490_g67.dto.response.TaxProfileResponse;
import project.be_sep490_g67.enums.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;


@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class StoreService {

    static final Integer STORE_ID = 1;

    StoreConfigRepository storeRepository;
    BusinessTaxProfileRepository taxProfileRepository;
    AccountingPeriodRepository accountingPeriodRepository;
    RevenueAdjustmentRepository revenueAdjustmentRepository;
    UserRepository userRepository;
    TaxRecordRepository taxRecordRepository;
    AuditLogService auditLogService;

    static final ZoneId TAX_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('MANAGER')")
    public List<TaxProfileResponse> getTaxProfiles() {
        requireStore();
        return taxProfileRepository.findByStoreIdAndIsRemovedFalseOrderByTaxYearDesc(STORE_ID)
                .stream().map(TaxProfileResponse::from).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('MANAGER')")
    public TaxProfileResponse getTaxProfile(Integer year) {
        return TaxProfileResponse.from(taxProfileRepository
                .findByStoreIdAndTaxYearAndIsRemovedFalse(STORE_ID, year)
                .orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm")));
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public TaxProfileResponse createTaxProfile(CreateTaxProfileRequest request) {
        StoreConfig store = lockStore();
        Integer actor = taxActor();
        List<BusinessTaxProfile> profiles = taxProfileRepository.findAllForUpdate(STORE_ID);
        if (request.taxYear() == null || request.taxYear() < 2000 || request.taxYear() > 2100) {
            throw failure(HttpStatus.BAD_REQUEST, "Năm hồ sơ phải từ 2000 đến 2100");
        }
        if (profiles.stream().anyMatch(p -> p.getTaxYear().equals(request.taxYear()))) {
            throw failure(HttpStatus.CONFLICT, "Hồ sơ năm đã tồn tại, kể cả hồ sơ đã xóa mềm");
        }
        Instant supplied = normalizedStart(request.trackingStartedAt());
        Instant start = supplied;
        validateStart(start, request.taxYear());
        BusinessTaxProfile profile = new BusinessTaxProfile();
        profile.setStore(store);
        profile.setTaxYear(request.taxYear());
        profile.setTrackingStartedAt(start);
        profile.setCreatedBy(actor);
        profile.setUpdatedBy(actor);
        applyInformation(profile, request.information());
        profile = taxProfileRepository.saveAndFlush(profile);
        auditLogService.logTaxProfile(actor, profile.getId(), "TAX_PROFILE_CREATE", null, snapshot(profile));
        return TaxProfileResponse.from(profile);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public TaxProfileResponse updateTaxProfile(Integer year, UpdateTaxProfileRequest request) {
        lockStore();
        Integer actor = taxActor();
        BusinessTaxProfile profile = selected(taxProfileRepository.findAllForUpdate(STORE_ID), year);
        checkVersion(profile, request.version());
        ensureNotDeclared(profile);
        if (accountingPeriodRepository.existsByProfileIdAndStatus(profile.getId(), PeriodStatus.CLOSED)) {
            throw failure(HttpStatus.CONFLICT, "Hồ sơ có kỳ đóng; chưa hỗ trợ thay đổi thông tin");
        }
        String before = snapshot(profile);
        applyInformation(profile, request.information());
        invalidateConfirmation(profile);
        profile.setUpdatedBy(actor);
        taxProfileRepository.flush();
        auditLogService.logTaxProfile(actor, profile.getId(), "TAX_PROFILE_UPDATE", before, snapshot(profile));
        return TaxProfileResponse.from(profile);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public TaxProfileResponse confirmTaxProfile(Integer year, ConfirmTaxProfileRequest request) {
        lockStore();
        Integer actor = taxActor();
        List<BusinessTaxProfile> profiles = taxProfileRepository.findAllForUpdate(STORE_ID);
        BusinessTaxProfile profile = selected(profiles, year);
        checkVersion(profile, request.version());
        if (profile.getStatus() == ProfileStatus.CONFIRMED) {
            throw failure(HttpStatus.CONFLICT, "Hồ sơ đã được xác nhận");
        }
        Instant start = profile.getTrackingStartedAt();
        if (start == null || blank(profile.getTaxpayerIdentity()) || blank(profile.getTaxpayerName())
                || blank(profile.getTaxpayerAddress())) {
            throw failure(HttpStatus.BAD_REQUEST, "Cần đủ mã số thuế/định danh, tên, địa chỉ và mốc theo dõi");
        }
        String before = snapshot(profile);
        profile.setStatus(ProfileStatus.CONFIRMED);
        profile.setConfirmedBy(actor);
        profile.setConfirmedAt(Instant.now());
        profile.setUpdatedBy(actor);
        taxProfileRepository.flush();
        auditLogService.logTaxProfile(actor, profile.getId(), "TAX_PROFILE_CONFIRM", before, snapshot(profile));
        return TaxProfileResponse.from(profile);
    }

    @Transactional
    @PreAuthorize("hasRole('MANAGER')")
    public List<TaxProfileResponse> changeTrackingStart(Integer year, ChangeTrackingStartRequest request) {
        lockStore();
        Integer actor = taxActor();
        List<BusinessTaxProfile> profiles = taxProfileRepository.findAllForUpdate(STORE_ID);
        BusinessTaxProfile profile = selected(profiles, year);
        checkVersion(profile, request.version());
        if (profile.getStatus() == ProfileStatus.CONFIRMED) {
            throw failure(HttpStatus.CONFLICT, "Không được đổi mốc theo dõi sau khi hồ sơ đã xác nhận");
        }
        Instant start = normalizedStart(request.trackingStartedAt());
        if (start == null || blank(request.reason()) || request.reason().length() > 1000) {
            throw failure(HttpStatus.BAD_REQUEST, "Cần mốc theo dõi và lý do tối đa 1000 ký tự");
        }
        if (start.equals(profile.getTrackingStartedAt())) {
            throw failure(HttpStatus.CONFLICT, "Mốc mới trùng mốc hiện tại");
        }
        validateStart(start, profile.getTaxYear());
        ensureTrackingChangeAllowed(profile);
        String before = snapshot(profile);
        profile.setTrackingStartedAt(start);
        invalidateConfirmation(profile);
        profile.setUpdatedBy(actor);
        taxProfileRepository.flush();
        auditLogService.logTaxProfile(actor, profile.getId(), "TAX_TRACKING_START_CHANGE", before,
                snapshot(profile) + "\nreason=" + request.reason().trim());
        return List.of(TaxProfileResponse.from(profile));
    }

    private StoreConfig lockStore() {
        return storeRepository.findByIdForUpdate(STORE_ID)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_STORE));
    }

    private Integer taxActor() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw failure(HttpStatus.UNAUTHORIZED, "Cần đăng nhập");
        }
        return userRepository.findByUsernameAndIsRemovedFalse(authentication.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)).getId();
    }

    private BusinessTaxProfile selected(List<BusinessTaxProfile> profiles, Integer year) {
        return profiles.stream().filter(p -> p.getTaxYear().equals(year) && !Boolean.TRUE.equals(p.getIsRemoved()))
                .findFirst().orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ năm"));
    }

    private void checkVersion(BusinessTaxProfile profile, Long version) {
        if (version == null || !version.equals(profile.getVersion())) {
            throw failure(HttpStatus.CONFLICT, "Hồ sơ đã thay đổi; hãy tải lại trước khi lưu");
        }
    }

    private Instant normalizedStart(Instant start) {
        // Match DATETIME(6), so a round-trip does not create a false mismatch.
        return start == null ? null : start.truncatedTo(ChronoUnit.MICROS);
    }

    private void validateStart(Instant start, Integer year) {
        if (start != null && (start.isAfter(Instant.now()) || start.atZone(TAX_ZONE).getYear() > year
                || start.atZone(TAX_ZONE).getYear() < 1000)) {
            throw failure(HttpStatus.BAD_REQUEST, "Mốc không được ở tương lai, sau năm hồ sơ hoặc ngoài phạm vi lưu trữ");
        }
    }

    private void ensureTrackingChangeAllowed(BusinessTaxProfile profile) {
        if (accountingPeriodRepository.existsByProfileStoreIdAndStatus(STORE_ID, PeriodStatus.CLOSED)) {
            throw failure(HttpStatus.CONFLICT, "Có kỳ đóng; không được đổi mốc theo dõi");
        }
        // Until rebuilding open periods/lines is implemented, never leave existing data out of scope.
        if (accountingPeriodRepository.existsByProfileId(profile.getId())
                || revenueAdjustmentRepository.existsByProfileId(profile.getId())) {
            throw failure(HttpStatus.CONFLICT, "Đã có kỳ hoặc điều chỉnh; cần quy trình đối chiếu lại trước khi đổi mốc");
        }
    }

    private void synchronizeStart(List<BusinessTaxProfile> profiles, Instant start, Integer actor, String reason) {
        for (BusinessTaxProfile p : profiles) {
            String before = snapshot(p);
            p.setTrackingStartedAt(start);
            invalidateConfirmation(p);
            p.setUpdatedBy(actor);
            taxProfileRepository.flush();
            auditLogService.logTaxProfile(actor, p.getId(), "TAX_TRACKING_START_CHANGE", before,
                    snapshot(p) + "\nreason=" + reason);
        }
    }

    private void invalidateConfirmation(BusinessTaxProfile p) {
        p.setStatus(ProfileStatus.DRAFT);
        p.setConfirmedBy(null);
        p.setConfirmedAt(null);
        p.setUpdatedAt(Instant.now());
    }

    private void ensureNotDeclared(BusinessTaxProfile profile) {
        if (taxRecordRepository.findByProfileIdAndPeriodTypeAndIsRemovedFalse(
                profile.getId(), TaxPeriodType.YEAR)
                .map(TaxRecord::getDeclarationStatus)
                .filter(TaxDeclarationStatus.DECLARED::equals)
                .isPresent()) {
            throw failure(HttpStatus.CONFLICT, "Năm đã kê khai; không được cập nhật hồ sơ thuế");
        }
    }

    private void applyInformation(BusinessTaxProfile p, TaxProfileInformation info) {
        if (info == null) {
            throw failure(HttpStatus.BAD_REQUEST, "Cần thông tin hồ sơ, dùng UNKNOWN nếu chưa xác định");
        }
        p.setTaxpayerIdentity(trimToNull(info.taxpayerIdentity()));
        p.setTaxpayerName(trimToNull(info.taxpayerName()));
        p.setTaxpayerAddress(trimToNull(info.taxpayerAddress()));
        p.setTaxAuthority(trimToNull(info.taxAuthority()));
        p.setDeclaredMethod(info.declaredMethod() == null
                ? DeclaredMethod.REVENUE_BASED : info.declaredMethod());
        p.setInvoiceRegistrationStatus(info.invoiceRegistrationStatus() == null
                ? InvoiceRegistrationStatus.NOT_REGISTERED : info.invoiceRegistrationStatus());
    }

    private boolean blank(String value) { return value == null || value.isBlank(); }

    private String snapshot(BusinessTaxProfile p) { return TaxProfileResponse.from(p).toString(); }

    private static ResponseStatusException failure(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }

    // View store config
    @Transactional(readOnly = true)
    public StoreResponse getStoreInfo(){
        return toResponse(requireStore());
    }

    @Transactional(readOnly = true)
    public StorePaymentInfoResponse getPaymentInfo() {
        StoreConfig store = requireStore();

        return StorePaymentInfoResponse.builder()
                .storeName(store.getStoreName())
                .bankId(trimToNull(store.getBankId()))
                .bankAccountNo(trimToNull(store.getBankAccountNo()))
                .bankAccountName(trimToNull(store.getBankAccountName()))
                .build();
    }

    // Update store config
    @Transactional
    public StoreResponse updateStoreInfo(UpdateStoreRequest request, String username) {
        StoreConfig store = requireStore();

        store.setStoreName(request.getStoreName());
        store.setOwnerFullName(request.getOwnerFullName());
        store.setTaxCode(request.getTaxCode());
        store.setAddress(request.getAddress());

        // set thong tin ngan hang cua cua hang
        store.setBankId(trimToNull(request.getBankId()));
        store.setBankAccountNo(trimToNull(request.getBankAccountNo()));
        store.setBankAccountName(trimToNull(request.getBankAccountName()));

        storeRepository.save(store);
        log.info("Update store config by store id {}", store.getId());

        return toResponse(store);
    }

    private StoreConfig requireStore() {
        return storeRepository
                .findById(STORE_ID)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_STORE));
    }

    private static StoreResponse toResponse(StoreConfig store) {
        return StoreResponse.builder()
                .id(store.getId())
                .storeName(store.getStoreName())
                .ownerFullName(store.getOwnerFullName())
                .taxCode(store.getTaxCode())
                .address(store.getAddress())
                .bankId(store.getBankId())
                .bankAccountNo(store.getBankAccountNo())
                .bankAccountName(store.getBankAccountName())
                .build();
    }

    // Neu chua co thong tin tai khoan ngan hang => null
    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
