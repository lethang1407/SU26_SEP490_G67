package project.be_sep490_g67.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.dto.ReconciliationSubmitDTO;
import project.be_sep490_g67.dto.ReconciliationSummaryDTO;
import project.be_sep490_g67.entity.DailyReconciliation;
import project.be_sep490_g67.service.ReconciliationService;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reconciliations")
@RequiredArgsConstructor
@CrossOrigin("*") // Enable CORS for FE testing
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @GetMapping("/summary")
    public ResponseEntity<ReconciliationSummaryDTO> getSummary(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reconciliationService.getSummary(date));
    }

    @PostMapping
    public ResponseEntity<DailyReconciliation> submitReconciliation(@RequestBody ReconciliationSubmitDTO dto) {
        return ResponseEntity.ok(reconciliationService.submitReconciliation(dto));
    }
}
