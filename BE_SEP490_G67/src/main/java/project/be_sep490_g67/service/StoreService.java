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


@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class StoreService {

    static final Integer STORE_ID = 1;

    StoreConfigRepository storeRepository;

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
