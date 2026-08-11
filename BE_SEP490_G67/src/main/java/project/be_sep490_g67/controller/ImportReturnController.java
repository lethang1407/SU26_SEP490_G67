package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.constants.ImportReturnConstants;
import project.be_sep490_g67.dto.request.CreateImportReturnFromInventoryCheckRequest;
import project.be_sep490_g67.dto.request.SaveImportReturnRequest;
import project.be_sep490_g67.dto.request.UpdateImportReturnLineStatusRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportReturnDetailResponse;
import project.be_sep490_g67.dto.response.ImportReturnListItemResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.repository.UserRepository;
import project.be_sep490_g67.service.ImportReturnService;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping(ApiPath.IMPORT_RETURNS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportReturnController {

    ImportReturnService importReturnService;
    UserRepository userRepository;

    @GetMapping
    public ApiResponse<PageResponse<ImportReturnListItemResponse>> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String statuses,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer days,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {
        Instant fromTime = null;
        Instant toTime = null;
        ZoneId zone = ZoneId.systemDefault();
        if (days != null && days > 0) {
            fromTime = LocalDate.now(zone).minusDays(days - 1L).atStartOfDay(zone).toInstant();
            toTime = LocalDate.now(zone).plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1);
        }
        if (from != null) {
            fromTime = from.atStartOfDay(zone).toInstant();
        }
        if (to != null) {
            toTime = to.plusDays(1).atStartOfDay(zone).toInstant().minusMillis(1);
        }

        List<String> statusList = new ArrayList<>();
        if (statuses != null && !statuses.isBlank()) {
            for (String part : statuses.split(",")) {
                if (!part.isBlank()) {
                    statusList.add(part.trim().toUpperCase());
                }
            }
        }

        return ApiResponse.<PageResponse<ImportReturnListItemResponse>>builder()
                .result(importReturnService.search(
                        status, statusList, source, q, fromTime, toTime, page, size))
                .message("Lấy danh sách phiếu đổi trả thành công")
                .build();
    }

    /** Compat banner / legacy — must be before /{id}. */
    @GetMapping("/draft")
    public ApiResponse<ImportReturnDetailResponse> getLatestDraft(
            @RequestParam(defaultValue = ImportReturnConstants.SOURCE_INVENTORY_CHECK) String source,
            @RequestParam(defaultValue = "false") boolean createIfMissing) {
        PageResponse<ImportReturnListItemResponse> page = importReturnService.search(
                ImportReturnConstants.STATUS_DRAFT,
                List.of(),
                source,
                null,
                null,
                null,
                0,
                1);
        if (page.getContent().isEmpty()) {
            return ApiResponse.<ImportReturnDetailResponse>builder()
                    .result(ImportReturnDetailResponse.builder()
                            .status(ImportReturnConstants.STATUS_DRAFT)
                            .source(source)
                            .totalRefund(java.math.BigDecimal.ZERO)
                            .lines(List.of())
                            .build())
                    .message("Không có phiếu nháp")
                    .build();
        }
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.getById(page.getContent().get(0).getId()))
                .message("Lấy phiếu nháp thành công")
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<ImportReturnDetailResponse> getById(@PathVariable Integer id) {
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.getById(id))
                .message("Lấy chi tiết phiếu đổi trả thành công")
                .build();
    }

    @PostMapping("/drafts")
    public ApiResponse<ImportReturnDetailResponse> createDraft(
            @Valid @RequestBody SaveImportReturnRequest request) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.createDraft(staffId, request))
                .message("Đã lưu phiếu nháp và trừ tồn")
                .build();
    }

    @PutMapping("/drafts/{id}")
    public ApiResponse<ImportReturnDetailResponse> updateDraft(
            @PathVariable Integer id,
            @Valid @RequestBody SaveImportReturnRequest request) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.updateDraft(staffId, id, request))
                .message("Đã cập nhật phiếu nháp")
                .build();
    }

    @DeleteMapping("/drafts/{id}")
    public ApiResponse<Void> deleteDraft(@PathVariable Integer id) {
        Integer staffId = resolveStaffId();
        importReturnService.deleteDraft(staffId, id);
        return ApiResponse.<Void>builder()
                .message("Đã xóa phiếu nháp và hoàn tồn")
                .build();
    }

    @DeleteMapping("/drafts/{id}/lines/{detailId}")
    public ApiResponse<ImportReturnDetailResponse> deleteDraftLine(
            @PathVariable Integer id,
            @PathVariable Integer detailId) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.deleteDraftLine(staffId, id, detailId))
                .message("Đã xóa dòng nháp và hoàn tồn")
                .build();
    }

    @PostMapping("/{id}/submit")
    public ApiResponse<ImportReturnDetailResponse> submit(@PathVariable Integer id) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.submit(staffId, id))
                .message("Đã lưu đổi trả — chờ nhà cung cấp")
                .build();
    }

    @PostMapping
    public ApiResponse<ImportReturnDetailResponse> createAndSubmit(
            @Valid @RequestBody SaveImportReturnRequest request) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.createAndSubmit(staffId, request))
                .message("Đã lưu đổi trả và trừ tồn")
                .build();
    }

    @PatchMapping("/{id}/lines/{detailId}/status")
    public ApiResponse<ImportReturnDetailResponse> updateLineStatus(
            @PathVariable Integer id,
            @PathVariable Integer detailId,
            @Valid @RequestBody UpdateImportReturnLineStatusRequest request) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.updateLineStatus(staffId, id, detailId, request))
                .message("Đã cập nhật trạng thái dòng")
                .build();
    }

    @PostMapping("/draft/from-inventory-check")
    public ApiResponse<ImportReturnDetailResponse> createFromInventoryCheck(
            @Valid @RequestBody CreateImportReturnFromInventoryCheckRequest request) {
        Integer staffId = resolveStaffId();
        return ApiResponse.<ImportReturnDetailResponse>builder()
                .result(importReturnService.createFromInventoryCheck(staffId, request))
                .message("Đã tạo phiếu trả nháp từ kiểm kho")
                .build();
    }

    private Integer resolveStaffId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(u -> u.getId())
                .orElse(null);
    }
}
