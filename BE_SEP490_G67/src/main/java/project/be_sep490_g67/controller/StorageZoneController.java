package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.UpdateStorageZoneRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.StorageZoneResponse;
import project.be_sep490_g67.service.StorageZoneService;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping(ApiPath.STORAGE_ZONES)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StorageZoneController {

    StorageZoneService storageZoneService;

   // @PreAuthorize("hasAuthority('WAREHOUSE:VIEW')")
    @GetMapping
    public ApiResponse<List<StorageZoneResponse>> getZones() {
        return ApiResponse.<List<StorageZoneResponse>>builder()
                .result(storageZoneService.getAllZones())
                .message("Lấy danh sách khu thành công")
                .build();
    }

  //  @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PutMapping("/{code}")
    public ApiResponse<StorageZoneResponse> updateZone(
            @PathVariable("code") String code,
            @Valid @RequestBody UpdateStorageZoneRequest request) {
        return ApiResponse.<StorageZoneResponse>builder()
                .result(storageZoneService.updateZone(code, request))
                .message("Cập nhật khu thành công")
                .build();
    }
}
