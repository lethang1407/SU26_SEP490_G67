package project.be_sep490_g67.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.dto.AuditAnomalyDTO;
import project.be_sep490_g67.dto.ResolveAnomalyDTO;
import project.be_sep490_g67.entity.AuditResolution;
import project.be_sep490_g67.service.AuditAnomalyService;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/audit/anomalies")
@RequiredArgsConstructor
@CrossOrigin("*") // Enable CORS for FE testing
public class AuditAnomalyController {

    private final AuditAnomalyService auditAnomalyService;

    @PreAuthorize("hasAuthority('AUDIT:VIEW')")
    @GetMapping
    public ResponseEntity<List<AuditAnomalyDTO>> getAnomalies(
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now();
        if (endDate == null) endDate = LocalDate.now();
        
        return ResponseEntity.ok(auditAnomalyService.getAnomalies(startDate, endDate));
    }

    @PreAuthorize("hasAuthority('AUDIT:RESOLVE')")
    @PostMapping("/resolve")
    public ResponseEntity<AuditResolution> resolveAnomaly(@RequestBody ResolveAnomalyDTO dto) {
        return ResponseEntity.ok(auditAnomalyService.resolveAnomaly(dto));
    }
}
