package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.RevenueReportOverviewResponse;
import project.be_sep490_g67.dto.response.RevenueStaffOptionResponse;
import project.be_sep490_g67.dto.response.RevenueTransactionRowResponse;
import project.be_sep490_g67.service.RevenueReportService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiPath.REVENUE_REPORT)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RevenueReportController {

    RevenueReportService revenueReportService;

    @GetMapping("/overview")
    public ApiResponse<RevenueReportOverviewResponse> overview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) Integer staffId
    ) {
        return ApiResponse.<RevenueReportOverviewResponse>builder()
                .result(revenueReportService.overview(from, to, paymentMethod, staffId))
                .message("Lấy báo cáo doanh thu thành công")
                .build();
    }

    @GetMapping("/transactions")
    public ApiResponse<PageResponse<RevenueTransactionRowResponse>> transactions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) Integer staffId,
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "15") int size
    ) {
        return ApiResponse.<PageResponse<RevenueTransactionRowResponse>>builder()
                .result(revenueReportService.transactions(from, to, paymentMethod, staffId, keyword, page, size))
                .message("Lấy danh sách giao dịch doanh thu thành công")
                .build();
    }

    @GetMapping("/staff-options")
    public ApiResponse<List<RevenueStaffOptionResponse>> staffOptions() {
        return ApiResponse.<List<RevenueStaffOptionResponse>>builder()
                .result(revenueReportService.staffOptions())
                .message("Lấy danh sách nhân viên bán hàng thành công")
                .build();
    }
}
