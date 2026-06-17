package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
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
}
