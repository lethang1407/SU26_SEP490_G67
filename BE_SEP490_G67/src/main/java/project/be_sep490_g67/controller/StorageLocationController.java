package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.AppendStorageBinRequest;
import project.be_sep490_g67.dto.request.AppendStorageFloorRequest;
import project.be_sep490_g67.dto.request.AssignBatchRequest;
import project.be_sep490_g67.dto.request.CancelReturnHoldRequest;
import project.be_sep490_g67.dto.request.CreateStorageLocationRequest;
import project.be_sep490_g67.dto.request.CreateStorageRackRequest;
import project.be_sep490_g67.dto.request.MoveAllBatchesRequest;
import project.be_sep490_g67.dto.request.MoveBatchRequest;
import project.be_sep490_g67.dto.request.ReleaseReturnHoldRequest;
import project.be_sep490_g67.dto.request.SetLocationFullRequest;
import project.be_sep490_g67.dto.request.SupplierReturnFromHoldRequest;
import project.be_sep490_g67.dto.request.UnassignBatchRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportReturnDetailResponse;
import project.be_sep490_g67.dto.response.StorageLocationResponse;
import project.be_sep490_g67.dto.response.UnplacedBatchResponse;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.ImportReturnService;
import project.be_sep490_g67.service.StorageLocationService;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping(ApiPath.STORAGE_LOCATIONS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StorageLocationController {

    StorageLocationService storageLocationService;
    ImportReturnService importReturnService;
    UserRepository userRepository;

   // @PreAuthorize("hasAuthority('WAREHOUSE:VIEW')")
    @GetMapping
    public ApiResponse<List<StorageLocationResponse>> getLocations() {
        return ApiResponse.<List<StorageLocationResponse>>builder()
                .result(storageLocationService.getAllLocations())
                .message("Lấy danh sách vị trí kho thành công")
                .build();
    }

    //@PreAuthorize("hasAuthority('WAREHOUSE:VIEW')")
    @GetMapping("/unplaced-batches")
    public ApiResponse<List<UnplacedBatchResponse>> getUnplacedBatches() {
        return ApiResponse.<List<UnplacedBatchResponse>>builder()
                .result(storageLocationService.getUnplacedBatches())
                .message("Lấy danh sách lô chưa xếp kệ thành công")
                .build();
    }

    //@PreAuthorize("hasAuthority('WAREHOUSE:VIEW')")
    @GetMapping("/{locationId}")
    public ApiResponse<StorageLocationResponse> getLocationById(@PathVariable("locationId") Integer locationId) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.getLocationById(locationId))
                .message("Lấy chi tiết vị trí kho thành công")
                .build();
    }

   // @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping
    public ApiResponse<StorageLocationResponse> createLocation(
            @Valid @RequestBody CreateStorageLocationRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.createLocation(request))
                .message("Tạo vị trí kho thành công")
                .build();
    }

   // @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping("/rack")
    public ApiResponse<List<StorageLocationResponse>> createRack(
            @Valid @RequestBody CreateStorageRackRequest request) {
        List<StorageLocationResponse> created = storageLocationService.createRack(request);
        return ApiResponse.<List<StorageLocationResponse>>builder()
                .result(created)
                .message("Tạo khu kệ thành công (" + created.size() + " ô)")
                .build();
    }

   // @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping("/rack/floors")
    public ApiResponse<List<StorageLocationResponse>> appendFloor(
            @Valid @RequestBody AppendStorageFloorRequest request) {
        List<StorageLocationResponse> created = storageLocationService.appendFloor(request);
        return ApiResponse.<List<StorageLocationResponse>>builder()
                .result(created)
                .message("Đã thêm tầng mới")
                .build();
    }

   // @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping("/rack/bins")
    public ApiResponse<StorageLocationResponse> appendBin(
            @Valid @RequestBody AppendStorageBinRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.appendBin(request))
                .message("Đã thêm ô mới")
                .build();
    }

    //@PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping("/assign-batch")
    public ApiResponse<StorageLocationResponse> assignBatch(
            @Valid @RequestBody AssignBatchRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.assignBatch(request))
                .message("Xếp lô vào kệ thành công")
                .build();
    }

   // @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping("/move-batch")
    public ApiResponse<StorageLocationResponse> moveBatch(
            @Valid @RequestBody MoveBatchRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.moveBatch(request))
                .message("Chuyển lô sang kệ khác thành công")
                .build();
    }

  //  @PostMapping("/move-all")
    public ApiResponse<StorageLocationResponse> moveAllBatches(
            @Valid @RequestBody MoveAllBatchesRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.moveAllBatches(request))
                .message("Đã chuyển toàn bộ hàng sang kệ đích")
                .build();
    }

   // @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping("/unassign-batch")
    public ApiResponse<Void> unassignBatch(@Valid @RequestBody UnassignBatchRequest request) {
        storageLocationService.unassignBatch(request);
        return ApiResponse.<Void>builder()
                .message("Gỡ lô khỏi kệ thành công")
                .build();
    }

   // @PreAuthorize("hasAuthority('WAREHOUSE:LOCATION_MANAGE')")
    @PostMapping("/{locationId}/full")
    public ApiResponse<StorageLocationResponse> setLocationFull(
            @PathVariable("locationId") Integer locationId,
            @Valid @RequestBody SetLocationFullRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.setLocationFull(locationId, request.getIsFull()))
                .message(Boolean.TRUE.equals(request.getIsFull())
                        ? "Đã đánh dấu ô đầy"
                        : "Đã bỏ đánh dấu ô đầy")
                .build();
    }

    @PostMapping("/return-hold/release")
    public ApiResponse<StorageLocationResponse> releaseReturnHold(
            @Valid @RequestBody ReleaseReturnHoldRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.releaseReturnHold(request, resolveStaffId()))
                .message("Đã đẩy hàng từ kho đổi trả vào kệ bán")
                .build();
    }

    @PostMapping("/return-hold/cancel")
    public ApiResponse<StorageLocationResponse> cancelReturnHold(
            @Valid @RequestBody CancelReturnHoldRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.cancelReturnHold(request, resolveStaffId()))
                .message("Đã hủy hàng trong kho đổi trả")
                .build();
    }

    @PostMapping("/return-hold/supplier-return")
    public ApiResponse<ImportReturnDetailResponse> createSupplierReturnFromHold(
            @Valid @RequestBody SupplierReturnFromHoldRequest request) {
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.createFromReturnHold(
                        resolveStaffId(),
                        request.getBatchLocationId(),
                        request.getQuantity(),
                        request.getMethod(),
                        request.getNote()))
                .message("Đã tạo phiếu đổi/trả nhà cung cấp từ kho đổi trả")
                .build();
    }

    private Integer resolveStaffId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return null;
        }
        return userRepository.findByUsername(auth.getName())
                .map(u -> u.getId())
                .orElse(null);
    }
}
