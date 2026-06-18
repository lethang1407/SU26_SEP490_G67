package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.UpdateStoreRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.StoreResponse;
import project.be_sep490_g67.service.StoreService;

@RestController
@RequestMapping(ApiPath.STORE)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StoreController {
    StoreService storeService;

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    ApiResponse<StoreResponse> getStoreInfor(){
        StoreResponse storeInfo = storeService.getStoreInfo();
        return ApiResponse.<StoreResponse>builder()
                .result(storeInfo)
                .build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping
    ApiResponse<StoreResponse> updateStoreInfor(@Valid @RequestBody UpdateStoreRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        StoreResponse updateStore = storeService.updateStoreInfo(request, username);
        return ApiResponse.<StoreResponse>builder()
                .result(updateStore)
                .message("Cập nhật thông tin cửa hàng thành công")
                .build();
    }
}
