package project.be_sep490_g67.controller;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ImportHistoryRowDTO;
import project.be_sep490_g67.dto.response.ImportHistorySummaryDTO;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.service.ImportHistoryService;

import java.time.LocalDate;

@RestController
@RequestMapping(ApiPath.IMPORT_HISTORY)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImportHistoryController {

    ImportHistoryService importHistoryService;

    @GetMapping
    public ApiResponse<PageResponse<ImportHistoryRowDTO>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String supplierKeyword,
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "5") int size
    ) {
        return ApiResponse.<PageResponse<ImportHistoryRowDTO>>builder()
                .result(importHistoryService.list(from, to, supplierKeyword, productId, status, page, size))
                .message("Lấy lịch sử nhập hàng thành công")
                .build();
    }

    @GetMapping("/summary")
    public ApiResponse<ImportHistorySummaryDTO> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer productId
    ) {
        return ApiResponse.<ImportHistorySummaryDTO>builder()
                .result(importHistoryService.summary(from, to, productId))
                .message("Lấy tổng quan nhập hàng thành công")
                .build();
    }
}
