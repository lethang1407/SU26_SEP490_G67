package project.be_sep490_g67.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.dto.ReconciliationSubmitDTO;
import project.be_sep490_g67.dto.ReconciliationSummaryDTO;
import project.be_sep490_g67.service.ReconciliationService;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reconciliations")
@RequiredArgsConstructor
@CrossOrigin("*")
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @GetMapping("/summary")
    public ResponseEntity<ReconciliationSummaryDTO> getSummary(
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reconciliationService.getSummary(date != null ? date : LocalDate.now()));
    }

    @PostMapping
    public ResponseEntity<ReconciliationSummaryDTO> submitReconciliation(@RequestBody ReconciliationSubmitDTO dto) {
        return ResponseEntity.ok(reconciliationService.submitReconciliation(dto));
    }
}
