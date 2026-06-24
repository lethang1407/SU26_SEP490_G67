package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.UpdateStoreRequest;
import project.be_sep490_g67.dto.response.StoreResponse;
import project.be_sep490_g67.entity.StoreConfig;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.StoreConfigRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class StoreService {
    StoreConfigRepository storeRepository;

    // View store config
    @Transactional(readOnly = true)
    public StoreResponse getStoreInfo(){
        Integer storeId = 1;

        StoreConfig store = storeRepository
                .findById(storeId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_STORE));
        log.info("Get Store Config by store id {}", store.getId());

        return StoreResponse.builder()
                .id(store.getId())
                .storeName(store.getStoreName())
                .ownerFullName(store.getOwnerFullName())
                .taxCode(store.getTaxCode())
                .address(store.getAddress())
                .build();
    }

    // Update store config
    @Transactional
    public StoreResponse updateStoreInfo(UpdateStoreRequest request, String username) {
        Integer storeId = 1;

        StoreConfig store = storeRepository
                .findById(storeId)
                .orElseThrow(() ->
                        new AppException(ErrorCode.NOT_FOUND_STORE));

        store.setStoreName(request.getStoreName());
        store.setOwnerFullName(request.getOwnerFullName());
        store.setTaxCode(request.getTaxCode());
        store.setAddress(request.getAddress());

        storeRepository.save(store);
        log.info("Update store config by store id {}", store.getId());

        return StoreResponse.builder()
                .id(store.getId())
                .storeName(store.getStoreName())
                .ownerFullName(store.getOwnerFullName())
                .taxCode(store.getTaxCode())
                .address(store.getAddress())
                .build();
    }
}
