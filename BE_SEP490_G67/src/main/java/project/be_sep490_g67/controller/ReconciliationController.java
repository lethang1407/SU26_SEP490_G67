package project.be_sep490_g67.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.dto.request.ReconciliationSubmitRequest;
import project.be_sep490_g67.dto.response.ReconciliationSummaryResponse;
import project.be_sep490_g67.service.ReconciliationService;

import java.math.BigDecimal;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reconciliations")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @GetMapping("/summary")
    public ResponseEntity<ReconciliationSummaryResponse> getSummary(
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "openingCash", required = false) BigDecimal openingCash) {
        return ResponseEntity.ok(reconciliationService.getSummary(date != null ? date : LocalDate.now(), openingCash));
    }

    @PostMapping
    public ResponseEntity<ReconciliationSummaryResponse> submitReconciliation(@RequestBody ReconciliationSubmitRequest dto) {
        return ResponseEntity.ok(reconciliationService.submitReconciliation(dto));
    }
}
