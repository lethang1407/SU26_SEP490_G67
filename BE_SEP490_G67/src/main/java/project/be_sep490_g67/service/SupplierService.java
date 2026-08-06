package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.AddNewSupplierRequest;
import project.be_sep490_g67.dto.response.AddNewSupplierResponse;
import project.be_sep490_g67.dto.response.CategoryResponse;
import project.be_sep490_g67.dto.response.SupplierDetailResponse;
import project.be_sep490_g67.dto.response.SupplierListItemResponse;
import project.be_sep490_g67.dto.response.SupplierListPageResponse;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.ImportOrderRepository;
import project.be_sep490_g67.repository.SupplierPaymentRepository;
import project.be_sep490_g67.repository.SupplierRepository;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.utils.PhoneNumberUtil;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierService {

    SupplierRepository supplierRepository;
    ImportOrderRepository importOrderRepository;
    SupplierPaymentRepository supplierPaymentRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public SupplierListPageResponse findAllSuppliers(String search, Integer categoryId, int page, int size) {
        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();

        // Bước 1: Lấy NCC khớp từ khóa + danh mục (nếu có)
        List<Supplier> suppliers = supplierRepository.searchSuppliers(safeSearch, categoryId);

        // Bước 2: Tính nợ hiện tại của từng NCC — derive từ (totalCost - đã trả),
        // KHÔNG đọc từ cột cache nào để tránh lệch số liệu khi thanh toán mới phát sinh.
        Map<Integer, BigDecimal> debtMap = calculateDebtPerSupplier();

        // Bước 3: Gắn nợ vào từng NCC, tạo danh sách response
        List<SupplierListItemResponse> allItems = suppliers.stream()
                .map(s -> SupplierListItemResponse.builder()
                        .id(s.getId())
                        .supplierCode(s.getSupplierCode())
                        .name(s.getName())
                        .phoneNumber(s.getPhoneNumber())
                        .address(s.getAddress())
                        .currentDebt(debtMap.getOrDefault(s.getId(), BigDecimal.ZERO))
                        .build())
                .toList();

        // Bước 4: Sort nợ giảm dần (ưu tiên NCC nợ nhiều), cùng nợ thì theo tên A–Z
        List<SupplierListItemResponse> sorted = allItems.stream()
                .sorted(Comparator
                        .comparing(SupplierListItemResponse::getCurrentDebt,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(item -> item.getName() == null ? "" : item.getName(),
                                String.CASE_INSENSITIVE_ORDER))
                .toList();

        // Bước 5: Phân trang thủ công
        int totalElements = sorted.size();
        int totalPages    = Math.max(1, (int) Math.ceil((double) totalElements / size));
        int safePage      = Math.min(page, totalPages - 1);
        int from          = safePage * size;
        int to            = Math.min(from + size, totalElements);
        List<SupplierListItemResponse> pageContent =
                totalElements == 0 ? List.of() : sorted.subList(from, to);

        // Bước 6: Tổng nợ + số NCC đang nợ toàn hệ thống (không bị ảnh hưởng bởi filter/search)
        BigDecimal totalDebt = debtMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        long debtSupplierCount = debtMap.values().stream()
                .filter(debt -> debt.compareTo(BigDecimal.ZERO) > 0)
                .count();

        return SupplierListPageResponse.builder()
                .content(pageContent)
                .page(safePage)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .totalDebt(totalDebt)
                .debtSupplierCount(debtSupplierCount)
                .build();
    }

    private Map<Integer, BigDecimal> calculateDebtPerSupplier() {
        Map<Integer, BigDecimal> paidPerOrder = supplierPaymentRepository.sumPaidAmountGroupByImportOrder()
                .stream()
                .collect(Collectors.toMap(
                        row -> (Integer) row[0],
                        row -> (BigDecimal) row[1]
                ));

        Map<Integer, BigDecimal> debtPerSupplier = new HashMap<>();
        for (ImportOrder order : importOrderRepository.findAllActiveWithActiveSupplier()) {
            BigDecimal totalCost = order.getTotalCost() != null ? order.getTotalCost() : BigDecimal.ZERO;
            BigDecimal paid = paidPerOrder.getOrDefault(order.getId(), BigDecimal.ZERO);
            BigDecimal remaining = totalCost.subtract(paid).max(BigDecimal.ZERO);

            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                debtPerSupplier.merge(order.getSupplier().getId(), remaining, BigDecimal::add);
            }
        }
        return debtPerSupplier;
    }

    @Transactional(readOnly = true)
    public SupplierDetailResponse getSupplierDetail(Integer id) {
        Supplier supplier = supplierRepository.findByIdAndIsRemovedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));
                
        BigDecimal currentDebt = calculateDebtPerSupplier().getOrDefault(id, BigDecimal.ZERO);

        List<CategoryResponse> categories = supplier.getCategories() == null
                ? List.of()
                : supplier.getCategories().stream()
                        .map(category -> CategoryResponse.builder()
                                .id(category.getId())
                                .name(category.getName())
                                .description(category.getDescription())
                                .build())
                        .sorted(Comparator.comparing(CategoryResponse::getName, Comparator.nullsLast(String::compareToIgnoreCase)))
                        .toList();

        return SupplierDetailResponse.builder()
                .id(supplier.getId())
                .supplierCode(supplier.getSupplierCode())
                .name(supplier.getName())
                .contactPerson(supplier.getContactPerson())
                .phoneNumber(supplier.getPhoneNumber())
                .address(supplier.getAddress())
                .notes(supplier.getNotes())
                .categories(categories)
                .currentDebt(currentDebt)
                .build();
    }

    @Transactional
    public SupplierDetailResponse updateSupplier(Integer id, AddNewSupplierRequest request) {
        Supplier supplier = supplierRepository.findByIdAndIsRemovedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));

        String name = trimToNull(request.getName());
        String phoneNumber = normalizeOptionalPhone(request.getPhoneNumber());

        // Mã nhà cung cấp không cho phép đổi sau khi tạo
        supplier.setName(name);
        supplier.setContactPerson(trimToNull(request.getContactPerson()));
        supplier.setAddress(trimToNull(request.getAddress()));
        supplier.setPhoneNumber(phoneNumber);
        supplier.setNotes(trimToNull(request.getNotes()));
        supplier.setCategories(request.getCategories() != null
                ? request.getCategories()
                : new HashSet<>());

        supplierRepository.save(supplier);
        log.info("Updated supplier id={} code={}", id, supplier.getSupplierCode());

        return getSupplierDetail(id);
    }

    @Transactional
    public void deleteSupplier(Integer id) {
        Supplier supplier = supplierRepository.findByIdAndIsRemovedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_SUPPLIER));

        BigDecimal currentDebt = calculateDebtPerSupplier().getOrDefault(id, BigDecimal.ZERO);
        if (currentDebt.compareTo(BigDecimal.ZERO) > 0) {
            throw new AppException(ErrorCode.SUPPLIER_HAS_DEBT);
        }

        supplier.setIsRemoved(true);
        supplierRepository.save(supplier);
        log.info("Soft-deleted supplier id={} code={}", id, supplier.getSupplierCode());
    }

    @Transactional
    public AddNewSupplierResponse addNewSupplier(AddNewSupplierRequest request) {
        String name = trimToNull(request.getName());
        String phoneNumber = normalizeOptionalPhone(request.getPhoneNumber());
        String supplierCode = generateNextSupplierCode();

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Supplier supplier = new Supplier();
        supplier.setName(name);
        supplier.setContactPerson(trimToNull(request.getContactPerson()));
        supplier.setSupplierCode(supplierCode);
        supplier.setAddress(trimToNull(request.getAddress()));
        supplier.setPhoneNumber(phoneNumber);
        supplier.setNotes(trimToNull(request.getNotes()));
        supplier.setCategories(request.getCategories());
        supplier.setIsRemoved(false);

        Supplier savedSupplier = supplierRepository.save(supplier);
        log.info("Created new supplier with code {}", savedSupplier.getSupplierCode());

        return AddNewSupplierResponse.builder()
                .name(savedSupplier.getName())
                .contactPerson(savedSupplier.getContactPerson())
                .supplierCode(savedSupplier.getSupplierCode())
                .address(savedSupplier.getAddress())
                .phoneNumber(savedSupplier.getPhoneNumber())
                .notes(savedSupplier.getNotes())
                .categories(savedSupplier.getCategories())
                .createdAt(savedSupplier.getCreatedAt())
                .createdBy(user)
                .build();
    }

    private String generateNextSupplierCode() {
        Long maxSequence = supplierRepository.findMaxNccSequence();
        long next = (maxSequence == null ? 0L : maxSequence) + 1;
        String code = String.format("NCC%05d", next);

        // Phòng trường hợp race / mã đã tồn tại ngoài pattern — thử tăng tiếp
        int attempts = 0;
        while (supplierRepository.existsSuppliersBySupplierCode(code) && attempts < 20) {
            next++;
            code = String.format("NCC%05d", next);
            attempts++;
        }
        if (supplierRepository.existsSuppliersBySupplierCode(code)) {
            throw new AppException(ErrorCode.EXISTED_SUPPLIER);
        }
        return code;
    }

    private String normalizeOptionalPhone(String phoneNumber) {
        String raw = phoneNumber == null ? "" : phoneNumber.trim();
        if (raw.isEmpty()) {
            return null;
        }
        if (!PhoneNumberUtil.isValid(raw)) {
            throw new AppException(ErrorCode.INVALID_PHONE_NUMBER);
        }
        return PhoneNumberUtil.normalize(raw);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
