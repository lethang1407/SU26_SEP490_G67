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
import project.be_sep490_g67.dto.request.AssignBatchRequest;
import project.be_sep490_g67.dto.request.CreateStorageLocationRequest;
import project.be_sep490_g67.dto.request.MoveBatchRequest;
import project.be_sep490_g67.dto.request.SetLocationFullRequest;
import project.be_sep490_g67.dto.request.UnassignBatchRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.StorageLocationResponse;
import project.be_sep490_g67.dto.response.UnplacedBatchResponse;
import project.be_sep490_g67.service.StorageLocationService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.STORAGE_LOCATIONS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StorageLocationController {

    StorageLocationService storageLocationService;

    @GetMapping
    public ApiResponse<List<StorageLocationResponse>> getLocations() {
        return ApiResponse.<List<StorageLocationResponse>>builder()
                .result(storageLocationService.getAllLocations())
                .message("Lấy danh sách vị trí kho thành công")
                .build();
    }

    @GetMapping("/unplaced-batches")
    public ApiResponse<List<UnplacedBatchResponse>> getUnplacedBatches() {
        return ApiResponse.<List<UnplacedBatchResponse>>builder()
                .result(storageLocationService.getUnplacedBatches())
                .message("Lấy danh sách lô chưa xếp kệ thành công")
                .build();
    }

    @GetMapping("/{locationId}")
    public ApiResponse<StorageLocationResponse> getLocationById(@PathVariable("locationId") Integer locationId) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.getLocationById(locationId))
                .message("Lấy chi tiết vị trí kho thành công")
                .build();
    }

    @PostMapping
    public ApiResponse<StorageLocationResponse> createLocation(
            @Valid @RequestBody CreateStorageLocationRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.createLocation(request))
                .message("Tạo vị trí kho thành công")
                .build();
    }

    @PostMapping("/assign-batch")
    public ApiResponse<StorageLocationResponse> assignBatch(
            @Valid @RequestBody AssignBatchRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.assignBatch(request))
                .message("Xếp lô vào kệ thành công")
                .build();
    }

    @PostMapping("/move-batch")
    public ApiResponse<StorageLocationResponse> moveBatch(
            @Valid @RequestBody MoveBatchRequest request) {
        return ApiResponse.<StorageLocationResponse>builder()
                .result(storageLocationService.moveBatch(request))
                .message("Chuyển lô sang kệ khác thành công")
                .build();
    }

    @PostMapping("/unassign-batch")
    public ApiResponse<Void> unassignBatch(@Valid @RequestBody UnassignBatchRequest request) {
        storageLocationService.unassignBatch(request);
        return ApiResponse.<Void>builder()
                .message("Gỡ lô khỏi kệ thành công")
                .build();
    }

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
}
