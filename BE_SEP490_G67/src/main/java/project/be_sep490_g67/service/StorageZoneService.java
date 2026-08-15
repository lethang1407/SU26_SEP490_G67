package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.constants.StorageZoneConstants;
import project.be_sep490_g67.constants.StorageZoneType;
import project.be_sep490_g67.dto.request.UpdateStorageZoneRequest;
import project.be_sep490_g67.dto.response.StorageZoneResponse;
import project.be_sep490_g67.entity.StorageZone;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.StorageZoneRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StorageZoneService {

    StorageZoneRepository storageZoneRepository;

    @Transactional(readOnly = true)
    public List<StorageZoneResponse> getAllZones() {
        return storageZoneRepository.findAllActiveOrdered().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StorageZone getRequiredByCode(String code) {
        return storageZoneRepository.findByCodeIgnoreCaseAndIsRemovedFalse(normalizeCode(code))
                .orElseThrow(() -> new AppException(ErrorCode.STORAGE_ZONE_NOT_FOUND));
    }

    /**
     * Đảm bảo khu tồn tại; nếu chưa có thì tạo mới với loại WAREHOUSE.
     */
    @Transactional
    public StorageZone ensureZoneExists(String rawCode) {
        String code = normalizeCode(rawCode);
        return storageZoneRepository.findByCodeIgnoreCaseAndIsRemovedFalse(code)
                .orElseGet(() -> {
                    StorageZone created = new StorageZone();
                    created.setCode(code);
                    created.setTitle(StorageZoneConstants.resolveZoneTitle(code));
                    created.setZoneType(StorageZoneType.WAREHOUSE);
                    created.setSortOrder(0);
                    created.setIsRemoved(false);
                    return storageZoneRepository.save(created);
                });
    }

    @Transactional(readOnly = true)
    public String resolveZoneType(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return StorageZoneType.WAREHOUSE;
        }
        return storageZoneRepository.findByCodeIgnoreCaseAndIsRemovedFalse(normalizeCode(rawCode))
                .map(StorageZone::getZoneType)
                .orElse(StorageZoneType.WAREHOUSE);
    }

    @Transactional(readOnly = true)
    public boolean isSalesZone(String rawCode) {
        return StorageZoneType.SALES.equals(resolveZoneType(rawCode));
    }

    @Transactional(readOnly = true)
    public boolean isSalesZone(StorageZone zone) {
        if (zone == null || zone.getZoneType() == null) {
            return false;
        }
        return StorageZoneType.SALES.equals(zone.getZoneType());
    }

    @Transactional(readOnly = true)
    public boolean isReturnHoldZone(StorageZone zone) {
        if (zone == null || zone.getZoneType() == null) {
            return false;
        }
        return StorageZoneType.RETURN_HOLD.equals(zone.getZoneType());
    }

    @Transactional
    public StorageZoneResponse updateZone(String code, UpdateStorageZoneRequest request) {
        StorageZone zone = getRequiredByCode(code);

        if (StorageZoneType.RETURN_HOLD.equals(zone.getZoneType())) {
            if (request.getZoneType() != null
                    && !request.getZoneType().isBlank()
                    && !StorageZoneType.RETURN_HOLD.equals(StorageZoneType.normalize(request.getZoneType()))) {
                throw new AppException(ErrorCode.STORAGE_RETURN_HOLD_LOCKED);
            }
        }

        if (request.getZoneType() != null && !request.getZoneType().isBlank()) {
            String type = StorageZoneType.normalize(request.getZoneType());
            if (StorageZoneType.RETURN_HOLD.equals(zone.getZoneType())) {
                // Giữ nguyên loại khu chứa hàng đổi trả
            } else if (!StorageZoneType.isAssignableZoneType(type)) {
                throw new AppException(ErrorCode.INVALID_STORAGE_ZONE_TYPE);
            } else {
                zone.setZoneType(type);
            }
        }
        if (request.getTitle() != null) {
            String title = request.getTitle().trim();
            zone.setTitle(title.isEmpty() ? StorageZoneConstants.resolveZoneTitle(zone.getCode()) : title);
        }
        if (request.getSortOrder() != null) {
            zone.setSortOrder(request.getSortOrder());
        }

        return toResponse(storageZoneRepository.save(zone));
    }

    private StorageZoneResponse toResponse(StorageZone zone) {
        return StorageZoneResponse.builder()
                .id(zone.getId())
                .code(zone.getCode())
                .title(zone.getTitle() != null && !zone.getTitle().isBlank()
                        ? zone.getTitle()
                        : StorageZoneConstants.resolveZoneTitle(zone.getCode()))
                .zoneType(zone.getZoneType())
                .sortOrder(zone.getSortOrder() != null ? zone.getSortOrder() : 0)
                .build();
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase();
    }
}
