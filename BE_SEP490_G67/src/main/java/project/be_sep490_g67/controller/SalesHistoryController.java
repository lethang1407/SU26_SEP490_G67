package project.be_sep490_g67.controller;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.HourRevenueResponse;
import project.be_sep490_g67.dto.response.HourlyRevenueResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.SalesHistoryRowResponse;
import project.be_sep490_g67.dto.response.SalesHistorySummaryResponse;
import project.be_sep490_g67.service.SalesHistoryService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiPath.SALES_HISTORY)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SalesHistoryController {

    SalesHistoryService salesHistoryService;

    @GetMapping
    public ApiResponse<PageResponse<SalesHistoryRowResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer productId,
            @RequestParam(required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "5") int size
    ) {
        return ApiResponse.<PageResponse<SalesHistoryRowResponse>>builder()
                .result(salesHistoryService.list(from, to, keyword, productId, status, page, size))
                .message("Lấy lịch sử bán hàng thành công")
                .build();
    }

    @GetMapping("/hourly")
    public ApiResponse<List<HourRevenueResponse>> hourly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.<List<HourevenueResponse>>builder()
                .result(salesHistoryService.hourlyRevenue(date))
                .message("Lấy doanh thu theo giờ thành công")
                .build();
    }

    @GetMapping("/summary")
    public ApiResponse<SalesHistorySummaryResponse> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer productId
    ) {
        return ApiResponse.<SalesHistorySummaryResponse>builder()
                .result(salesHistoryService.summary(from, to, productId))
                .message("Lấy tổng quan bán hàng thành công")
                .build();
    }
}
