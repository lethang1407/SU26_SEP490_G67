package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.WarehouseIoReportDTO;
import project.be_sep490_g67.service.WarehouseReportService;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping(ApiPath.WAREHOUSE_REPORT)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WarehouseReportController {

    WarehouseReportService warehouseReportService;

    @GetMapping("/inventory-io")
    public ApiResponse<WarehouseIoReportDTO> inventoryIo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) List<Integer> productIds,
            @RequestParam(required = false) List<String> types,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "15") int size
    ) {
        return ApiResponse.<WarehouseIoReportDTO>builder()
                .result(warehouseReportService.getInventoryIo(from, to, productIds, types, page, size))
                .message("Lấy báo cáo nhập xuất tồn thành công")
                .build();
    }

    @GetMapping("/inventory-io/export")
    public ResponseEntity<byte[]> exportInventoryIo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) List<Integer> productIds,
            @RequestParam(required = false) List<String> types
    ) {
        byte[] csv = warehouseReportService.exportInventoryIoCsv(from, to, productIds, types);
        String filename = "bao-cao-nhap-xuat-ton-"
                + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)
                + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .body(csv);
    }
}
