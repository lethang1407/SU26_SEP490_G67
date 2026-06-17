package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    StoreConfigRepository storeRepository;

    // View store config
    @Transactional(readOnly = true)
    public StoreResponse getStoreInfo(){
        StoreConfig store = storeRepository
                .findById(1)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND_STORE));
        log.info("Get Store Config by store id = 1");

        return StoreResponse.builder()
                .id(store.getId())
                .storeName(store.getStoreName())
                .ownerFullName(store.getOwnerFullName())
                .taxCode(store.getTaxCode())
                .address(store.getAddress())
                .build();
    }

}
