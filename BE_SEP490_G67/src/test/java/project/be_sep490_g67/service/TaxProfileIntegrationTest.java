package project.be_sep490_g67.service;

import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import project.be_sep490_g67.controller.StoreController;
import project.be_sep490_g67.dto.request.*;
import project.be_sep490_g67.dto.response.TaxProfileResponse;
import project.be_sep490_g67.enums.*;
import project.be_sep490_g67.exception.GlobalExceptionHandler;
import project.be_sep490_g67.repository.*;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real service transactions, pessimistic locks, @Version and V67 schema on disposable MySQL. */
@Testcontainers
@SpringJUnitConfig(TaxProfileIntegrationTest.Config.class)
class TaxProfileIntegrationTest {
    @Container static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withCommand("--log-bin-trust-function-creators=1");
    static final Instant START = Instant.parse("2025-03-15T03:00:00Z");
    static final TaxProfileInformation INFO = new TaxProfileInformation(
            "0123456789", "Hộ tạp hóa", "Địa chỉ cửa hàng", "Cơ quan thuế",
            DeclaredMethod.REVENUE_BASED, InvoiceRegistrationStatus.NOT_REGISTERED);

    @Autowired StoreService service;
    @Autowired StoreController controller;
    @Autowired AccountingService accounting;
    @Autowired project.be_sep490_g67.controller.AccountingController accountingController;
    @Autowired project.be_sep490_g67.controller.RevenueAdjustmentController adjustmentController;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired StoreConfigRepository stores;
    @Autowired SalesOrderRepository sales;
    @Autowired ReturnOrderRepository returns;
    @Autowired AccountingRevenueLineRepository revenueLines;
    MockMvc mvc;

    @BeforeEach void setUp() {
        jdbc.execute("DROP TRIGGER IF EXISTS reject_profile_audit");
        jdbc.update("DELETE FROM accounting_revenue_lines");
        jdbc.update("DELETE FROM return_orders");
        jdbc.update("DELETE FROM sales_orders");
        jdbc.update("UPDATE revenue_adjustments SET original_adjustment_id=NULL");
        jdbc.update("DELETE FROM revenue_adjustments");
        jdbc.update("DELETE FROM accounting_periods");
        jdbc.update("DELETE FROM audit_logs");
        jdbc.update("DELETE FROM business_tax_profiles");
        manager();
        mvc = MockMvcBuilders.standaloneSetup(controller, accountingController, adjustmentController)
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }
    @AfterEach void clearSecurity() { SecurityContextHolder.clearContext(); }
    static void manager() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("manager", "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))));
    }
    TaxProfileResponse create(int year, Instant start) {
        return service.createTaxProfile(new CreateTaxProfileRequest(year, start, INFO));
    }
    void expectStatus(int expected, org.junit.jupiter.api.function.Executable operation) {
        assertEquals(expected, assertThrows(ResponseStatusException.class, operation).getStatusCode().value());
    }
    long count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class); }

    @Test void createsDraftAndCopiesSameStartIntoLaterYear() {
        TaxProfileResponse first = create(2025, START);
        assertNotNull(first.id());
        TaxProfileResponse second = create(2026, null);
        assertEquals(ProfileStatus.DRAFT, first.status());
        assertEquals(START, second.trackingStartedAt());
        assertEquals(2, service.getTaxProfiles().size());
        assertEquals(2, count("audit_logs"));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE entity_id IS NOT NULL", Integer.class));
    }
    @Test void allowsUnknownDraftButRequiresCompleteConfirmation() {
        var draft = service.createTaxProfile(new CreateTaxProfileRequest(2025, null,
                new TaxProfileInformation(null, null, null, null,
                        DeclaredMethod.UNKNOWN, InvoiceRegistrationStatus.UNKNOWN)));
        expectStatus(400, () -> service.confirmTaxProfile(2025, new ConfirmTaxProfileRequest(draft.version())));
        assertEquals(ProfileStatus.DRAFT, service.getTaxProfile(2025).status());
    }
    @Test void confirmationStoresActorAndNewVersion() {
        var p = create(2025, START);
        var confirmed = service.confirmTaxProfile(2025, new ConfirmTaxProfileRequest(p.version()));
        assertEquals(ProfileStatus.CONFIRMED, confirmed.status());
        assertEquals(1, confirmed.confirmedBy());
        assertNotNull(confirmed.confirmedAt());
        assertTrue(confirmed.version() > p.version());
        expectStatus(409, () -> service.confirmTaxProfile(2025, new ConfirmTaxProfileRequest(p.version())));
    }
    @Test void rejectsDuplicateYearIncludingRemovedRows() {
        var p = create(2025, START);
        jdbc.update("UPDATE business_tax_profiles SET is_removed=1 WHERE id=?", p.id());
        expectStatus(409, () -> create(2025, START));
    }
    @Test void rejectsConflictingStartAndFutureStart() {
        create(2025, START);
        expectStatus(409, () -> create(2026, START.plusSeconds(1)));
        expectStatus(400, () -> service.changeTrackingStart(2025,
                new ChangeTrackingStartRequest(service.getTaxProfile(2025).version(),
                        Instant.now().plusSeconds(3600), "Sai mốc")));
    }
    @Test void checksYearInVietnamRatherThanUtc() {
        expectStatus(400, () -> create(2024, Instant.parse("2024-12-31T17:00:00Z")));
        assertEquals(0, count("business_tax_profiles"));
    }
    @Test void initialStartFillsExistingNullDrafts() {
        var empty = create(2025, null);
        create(2026, START);
        var refreshed = service.getTaxProfile(2025);
        assertEquals(START, refreshed.trackingStartedAt());
        assertTrue(refreshed.version() > empty.version());
    }
    @Test void changesAllYearsAndInvalidatesAllConfirmations() {
        var a = create(2025, START);
        var b = create(2026, null);
        service.confirmTaxProfile(2025, new ConfirmTaxProfileRequest(a.version()));
        service.confirmTaxProfile(2026, new ConfirmTaxProfileRequest(b.version()));
        var beforeA = service.getTaxProfile(2025);
        var beforeB = service.getTaxProfile(2026);
        var results = service.changeTrackingStart(2025,
                new ChangeTrackingStartRequest(beforeA.version(), START.minusSeconds(3600), "Sửa ngày bắt đầu"));
        assertEquals(2, results.size());
        for (var p : results) {
            assertEquals(START.minusSeconds(3600), p.trackingStartedAt());
            assertEquals(ProfileStatus.DRAFT, p.status());
            assertNull(p.confirmedAt());
            assertNull(p.confirmedBy());
        }
        assertTrue(service.getTaxProfile(2026).version() > beforeB.version());
        expectStatus(409, () -> service.updateTaxProfile(2026, new UpdateTaxProfileRequest(beforeB.version(), INFO)));
    }
    @Test void ordinaryEditPreservesStartAndRequiresReconfirmation() {
        var p = create(2025, START);
        p = service.confirmTaxProfile(2025, new ConfirmTaxProfileRequest(p.version()));
        var updated = service.updateTaxProfile(2025, new UpdateTaxProfileRequest(p.version(),
                new TaxProfileInformation("0123456789", "Tên mới", "Địa chỉ", "Cơ quan thuế",
                        DeclaredMethod.REVENUE_BASED, InvoiceRegistrationStatus.REGISTERED)));
        assertEquals(START, updated.trackingStartedAt());
        assertEquals("Tên mới", updated.taxpayerName());
        assertEquals(ProfileStatus.DRAFT, updated.status());
        assertNull(updated.confirmedAt());
    }
    @Test void rejectsStartAfterAnyExistingProfileYear() {
        create(2024, START.minusSeconds(365L * 86400));
        var p = create(2025, null);
        expectStatus(400, () -> service.changeTrackingStart(2025,
                new ChangeTrackingStartRequest(p.version(), START, "Sai năm")));
        assertEquals(service.getTaxProfile(2024).trackingStartedAt(), p.trackingStartedAt());
    }
    void period(int profileId, String status) {
        jdbc.update("""
                INSERT INTO accounting_periods(profile_id,accounting_month,start_at,end_exclusive,status,closed_by,closed_at)
                VALUES (?,3,'2025-03-15 03:00:00','2025-03-31 17:00:00',?,?,
                CASE WHEN ?='CLOSED' THEN '2025-04-01 00:00:00' ELSE NULL END)
                """, profileId, status, status.equals("CLOSED") ? 1 : null, status);
    }
    @Test void blocksTrackingChangeWhenClosedPeriodExists() {
        var p = create(2025, START);
        period(p.id(), "CLOSED");
        expectStatus(409, () -> service.changeTrackingStart(2025,
                new ChangeTrackingStartRequest(p.version(), START.minusSeconds(1), "Sửa mốc")));
        expectStatus(409, () -> service.updateTaxProfile(2025, new UpdateTaxProfileRequest(p.version(), INFO)));
    }
    @Test void blocksTrackingChangeUntilOpenPeriodRebuildExists() {
        var p = create(2025, START);
        period(p.id(), "OPEN");
        expectStatus(409, () -> service.changeTrackingStart(2025,
                new ChangeTrackingStartRequest(p.version(), START.minusSeconds(1), "Sửa mốc")));
    }
    @Test void auditFailureRollsBackProfileAndAllYearChanges() {
        var a = create(2025, START);
        create(2026, null);
        long auditCount = count("audit_logs");
        jdbc.execute("""
                CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit_logs FOR EACH ROW
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test mandatory audit failure'
                """);
        assertThrows(RuntimeException.class, () -> service.changeTrackingStart(2025,
                new ChangeTrackingStartRequest(a.version(), START.minusSeconds(1), "Test rollback")));
        assertEquals(START, service.getTaxProfile(2025).trackingStartedAt());
        assertEquals(START, service.getTaxProfile(2026).trackingStartedAt());
        assertEquals(a.version(), service.getTaxProfile(2025).version());
        assertEquals(auditCount, count("audit_logs"));
    }
    @Test void apiEnforcesManagerAndValidation() throws Exception {
        mvc.perform(post("/api/store/tax-profiles").contentType(MediaType.APPLICATION_JSON)
                .content("{\"taxYear\":1999}")).andExpect(status().isBadRequest());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("cashier", "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))));
        mvc.perform(get("/api/store/tax-profiles")).andExpect(status().isForbidden());
        SecurityContextHolder.clearContext();
        mvc.perform(get("/api/store/tax-profiles")).andExpect(status().isUnauthorized());
    }
    @Test void apiRoundTripDraftConfirmAndStaleVersion() throws Exception {
        mvc.perform(post("/api/store/tax-profiles").contentType(MediaType.APPLICATION_JSON).content("""
                {"taxYear":2025,"trackingStartedAt":"2025-03-15T03:00:00Z",
                 "information":{"taxpayerIdentity":"0123456789","taxpayerName":"Store",
                 "taxpayerAddress":"Address","taxAuthority":"Authority",
                 "declaredMethod":"REVENUE_BASED","invoiceRegistrationStatus":"NOT_REGISTERED"}}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.result.status").value("DRAFT"));
        mvc.perform(post("/api/store/tax-profiles/2025/confirm").contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.status").value("CONFIRMED"));
        mvc.perform(post("/api/store/tax-profiles/2025/confirm").contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0}")).andExpect(status().isConflict());
    }
    @Test void apiRejectsMalformedEnumAndMissingVersion() throws Exception {
        mvc.perform(post("/api/store/tax-profiles").contentType(MediaType.APPLICATION_JSON).content("""
                {"taxYear":2025,"information":{"declaredMethod":"INVALID","invoiceRegistrationStatus":"UNKNOWN"}}
                """)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/store/tax-profiles/2025/confirm").contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/store/tax-profiles/invalid")).andExpect(status().isBadRequest());
    }
    @Test void normalizesMicrosecondsAndRejectsLegacyConflictingDrafts() {
        var p = create(2025, START.plusNanos(123456789));
        assertEquals(START.plusNanos(123456000), p.trackingStartedAt());
        var other = create(2026, null);
        jdbc.update("UPDATE business_tax_profiles SET tracking_started_at='2025-03-16 03:00:00' WHERE id=?", other.id());
        expectStatus(409, () -> service.confirmTaxProfile(2025, new ConfirmTaxProfileRequest(p.version())));
        service.changeTrackingStart(2025, new ChangeTrackingStartRequest(p.version(), START, "Thống nhất dữ liệu cũ"));
        assertEquals(START, service.getTaxProfile(2026).trackingStartedAt());
    }
    @Test void concurrentFirstProfilesCannotCommitDifferentStarts() throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            var gate = new CountDownLatch(1);
            Callable<Integer> first = () -> concurrentCreate(gate, 2025, START);
            Callable<Integer> second = () -> concurrentCreate(gate, 2026, START.plusSeconds(1));
            var a = pool.submit(first);
            var b = pool.submit(second);
            gate.countDown();
            var statuses = List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
            assertTrue(statuses.contains(200));
            assertTrue(statuses.contains(409));
            assertEquals(1, count("business_tax_profiles"));
        }
    }
    int concurrentCreate(CountDownLatch gate, int year, Instant start) throws Exception {
        manager();
        try {
            assertTrue(gate.await(5, TimeUnit.SECONDS));
            create(year, start);
            return 200;
        } catch (ResponseStatusException e) { return e.getStatusCode().value(); }
        finally { SecurityContextHolder.clearContext(); }
    }
    @Test void storeLockBlocksASecondWriterUntilFirstTransactionCommits() throws Exception {
        var held = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> {
                manager();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(s -> {
                        stores.findByIdForUpdate(1);
                        held.countDown();
                        try { assertTrue(release.await(5, TimeUnit.SECONDS)); }
                        catch (InterruptedException e) { throw new RuntimeException(e); }
                        create(2025, START);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            assertTrue(held.await(5, TimeUnit.SECONDS));
            var second = pool.submit(() -> {
                manager();
                try { return create(2026, null); }
                finally { SecurityContextHolder.clearContext(); }
            });
            try { assertThrows(TimeoutException.class, () -> second.get(300, TimeUnit.MILLISECONDS)); }
            finally { release.countDown(); }
            first.get(10, TimeUnit.SECONDS);
            assertEquals(START, second.get(10, TimeUnit.SECONDS).trackingStartedAt());
        } finally { release.countDown(); }
    }

    TaxProfileResponse confirmed(int year, Instant start) {
        var p = create(year, start);
        return service.confirmTaxProfile(year, new ConfirmTaxProfileRequest(p.version()));
    }

    @Test void createsPartialFirstMonthAndContiguousFullMonth() {
        var p = confirmed(2025, START);
        var first = accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version()));
        var next = accounting.createPeriod(2025, new CreateAccountingPeriodRequest(4, p.version()));
        assertNotNull(first.id());
        assertEquals(START, first.startAt());
        assertEquals(Instant.parse("2025-03-31T17:00:00Z"), first.endExclusive());
        assertEquals(first.endExclusive(), next.startAt());
        assertEquals(Instant.parse("2025-04-30T17:00:00Z"), next.endExclusive());
        assertEquals(PeriodStatus.OPEN, first.status());
        assertNull(first.closedAt());
        assertNull(first.closedBy());
        assertEquals(0L, first.version());
        assertEquals(List.of(3, 4), accounting.getPeriods(2025).stream().map(r -> r.accountingMonth()).toList());
        assertEquals(first, accounting.getPeriod(2025, 3));
        assertEquals(2, jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE entity_name='accounting_periods' AND entity_id IS NOT NULL", Integer.class));
    }

    @Test void rejectsMonthsBeforeTrackingAndExactMonthBoundary() {
        var p = confirmed(2025, Instant.parse("2025-03-31T17:00:00Z"));
        expectStatus(400, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version())));
        var april = accounting.createPeriod(2025, new CreateAccountingPeriodRequest(4, p.version()));
        assertEquals(p.trackingStartedAt(), april.startAt());
        assertEquals(1, count("accounting_periods"));
    }

    @Test void handlesLeapFebruaryAndDecemberAcrossYears() {
        var p = confirmed(2024, Instant.parse("2023-12-31T17:00:00Z"));
        var february = accounting.createPeriod(2024, new CreateAccountingPeriodRequest(2, p.version()));
        assertEquals(Instant.parse("2024-01-31T17:00:00Z"), february.startAt());
        assertEquals(Instant.parse("2024-02-29T17:00:00Z"), february.endExclusive());
        var december = accounting.createPeriod(2024, new CreateAccountingPeriodRequest(12, p.version()));
        var later = confirmed(2025, null);
        var january = accounting.createPeriod(2025, new CreateAccountingPeriodRequest(1, later.version()));
        assertEquals(december.endExclusive(), january.startAt());
        assertEquals(Instant.parse("2024-12-31T17:00:00Z"), january.startAt());
    }

    @Test void requiresConfirmedProfileCurrentVersionAndValidMonth() {
        var draft = create(2025, START);
        expectStatus(409, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, draft.version())));
        var p = service.confirmTaxProfile(2025, new ConfirmTaxProfileRequest(draft.version()));
        expectStatus(409, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, draft.version())));
        expectStatus(400, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(13, p.version())));
        expectStatus(404, () -> accounting.getPeriods(2026));
        expectStatus(404, () -> accounting.getPeriod(2025, 3));
        assertEquals(0, count("accounting_periods"));
    }

    @Test void rejectsDuplicateRemovedMonthAndMalformedOverlappingPeriod() {
        var p = confirmed(2025, START);
        var period = accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version()));
        expectStatus(409, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version())));
        jdbc.update("UPDATE accounting_periods SET is_removed=1 WHERE id=?", period.id());
        expectStatus(409, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version())));
        assertTrue(accounting.getPeriods(2025).isEmpty());
        expectStatus(404, () -> accounting.getPeriod(2025, 3));
        jdbc.update("UPDATE accounting_periods SET is_removed=0,end_exclusive='2025-04-15 00:00:00' WHERE id=?", period.id());
        expectStatus(409, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(4, p.version())));
    }

    @Test void rejectsInconsistentTrackingAcrossProfiles() {
        var p = confirmed(2025, START);
        var other = create(2026, null);
        jdbc.update("UPDATE business_tax_profiles SET tracking_started_at=NULL WHERE id=?", other.id());
        expectStatus(409, () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version())));
    }

    @Test void failedPeriodAuditRollsBackPeriodInsert() {
        var p = confirmed(2025, START);
        long before = count("audit_logs");
        jdbc.execute("""
                CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit_logs FOR EACH ROW
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test mandatory period audit failure'
                """);
        assertThrows(RuntimeException.class,
                () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version())));
        assertEquals(0, count("accounting_periods"));
        assertEquals(before, count("audit_logs"));
    }

    @Test void periodApiChecksValidationSecurityAndRoundTrip() throws Exception {
        var p = confirmed(2025, START);
        String route = "/api/accounting/tax-profiles/2025/periods";
        mvc.perform(post(route).contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountingMonth\":3,\"profileVersion\":" + p.version() + "}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.status").value("OPEN"));
        mvc.perform(get(route + "/3")).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.accountingMonth").value(3));
        mvc.perform(get(route)).andExpect(status().isOk()).andExpect(jsonPath("$.result.length()").value(1));
        mvc.perform(post(route).contentType(MediaType.APPLICATION_JSON).content("{\"accountingMonth\":0}"))
                .andExpect(status().isBadRequest());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("cashier", "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))));
        mvc.perform(get(route)).andExpect(status().isForbidden());
        mvc.perform(post(route).contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountingMonth\":4,\"profileVersion\":" + p.version() + "}"))
                .andExpect(status().isForbidden());
        SecurityContextHolder.clearContext();
        mvc.perform(get(route)).andExpect(status().isUnauthorized());
    }

    @Test void concurrentDuplicatePeriodCreatesExactlyOneRowAndAudit() throws Exception {
        var p = confirmed(2025, START);
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> writer = () -> concurrentOperation(gate,
                    () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version())));
            var first = pool.submit(writer);
            var second = pool.submit(writer);
            gate.countDown();
            var results = List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            assertTrue(results.contains(200));
            assertTrue(results.contains(409));
        }
        assertEquals(1, count("accounting_periods"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE entity_name='accounting_periods'", Integer.class));
    }

    @Test void periodCreationAndTrackingChangeCannotBothCommit() throws Exception {
        var p = confirmed(2025, START);
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var period = pool.submit(() -> concurrentOperation(gate,
                    () -> accounting.createPeriod(2025, new CreateAccountingPeriodRequest(3, p.version()))));
            var change = pool.submit(() -> concurrentOperation(gate,
                    () -> service.changeTrackingStart(2025,
                            new ChangeTrackingStartRequest(p.version(), START.plusSeconds(3600), "Test concurrent change"))));
            gate.countDown();
            var results = List.of(period.get(20, TimeUnit.SECONDS), change.get(20, TimeUnit.SECONDS));
            assertTrue(results.contains(200));
            assertTrue(results.contains(409));
        }
        if (count("accounting_periods") == 1) {
            assertEquals(START, service.getTaxProfile(2025).trackingStartedAt());
            assertEquals(START, accounting.getPeriod(2025, 3).startAt());
        } else {
            assertEquals(START.plusSeconds(3600), service.getTaxProfile(2025).trackingStartedAt());
            assertEquals(ProfileStatus.DRAFT, service.getTaxProfile(2025).status());
        }
    }

    int concurrentOperation(CountDownLatch gate, Runnable operation) throws Exception {
        manager();
        try {
            assertTrue(gate.await(5, TimeUnit.SECONDS));
            operation.run();
            return 200;
        } catch (ResponseStatusException e) { return e.getStatusCode().value(); }
        finally { SecurityContextHolder.clearContext(); }
    }

    void revenuePeriod(int month) {
        var p = service.getTaxProfile(2025);
        accounting.createPeriod(2025, new CreateAccountingPeriodRequest(month, p.version()));
    }

    Integer saleSource(Instant when, String total, boolean post) {
        return new TransactionTemplate(transactionManager).execute(tx -> {
            accounting.lockForSourceWrite();
            var s = new project.be_sep490_g67.entity.SalesOrder();
            s.setOrderCode("TEST-SALE");
            s.setOrderStatus("COMPLETED");
            s.setCreatedAt(when);
            s.setCreatedBy(1);
            s.setSubtotal(new java.math.BigDecimal(total).add(new java.math.BigDecimal("10.00")));
            s.setDiscountAmount(new java.math.BigDecimal("10.00"));
            s.setTotalAmount(new java.math.BigDecimal(total));
            s.setPaidAmount(java.math.BigDecimal.ZERO);
            s.setIsDebt(true);
            s = sales.saveAndFlush(s);
            if (post) accounting.recordSale(s);
            return s.getId();
        });
    }

    Integer returnSource(Integer originalId, Instant when, String amount, boolean post) {
        return new TransactionTemplate(transactionManager).execute(tx -> {
            accounting.lockForSourceWrite();
            var r = new project.be_sep490_g67.entity.ReturnOrder();
            r.setSalesOrder(sales.findById(originalId).orElseThrow());
            r.setReturnCode("TEST-RETURN");
            r.setCreatedAt(when);
            r.setCreatedBy(1);
            r.setRefundAmount(new java.math.BigDecimal(amount));
            r.setDebtOffsetAmount(new java.math.BigDecimal(amount));
            r.setCashRefundAmount(java.math.BigDecimal.ZERO);
            r = returns.saveAndFlush(r);
            if (post) accounting.recordReturn(r);
            return r.getId();
        });
    }

    @Test void debtSaleUsesNetTotalAndDebtCollectionDoesNotChangeLedger() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer id = saleSource(START.plusSeconds(1), "90.00", true);
        var before = accounting.getRevenue(2025, 3);
        assertEquals(new java.math.BigDecimal("90.00"), before.recordedRevenue());
        assertTrue(before.sourceCompletenessVerified());
        long audits = count("audit_logs");
        jdbc.update("UPDATE sales_orders SET paid_amount=90,updated_at=NOW(6) WHERE id=?", id);
        var after = accounting.synchronizeRevenue(2025, 3);
        assertEquals(before.lines(), after.lines());
        assertEquals(audits, count("audit_logs"));
    }

    @Test void multipleReturnsAndExchangeSaleHaveSeparateSignedSources() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer sale = saleSource(START.plusSeconds(1), "100.00", true);
        returnSource(sale, START.plusSeconds(2), "20.00", true);
        returnSource(sale, START.plusSeconds(3), "30.00", true);
        saleSource(START.plusSeconds(4), "40.00", true);
        jdbc.update("UPDATE sales_orders SET order_status='RETURNED' WHERE id=?", sale);
        var result = accounting.synchronizeRevenue(2025, 3);
        assertEquals(4, result.lines().size());
        assertEquals(new java.math.BigDecimal("90.00"), result.recordedRevenue());
        assertEquals(2, result.lines().stream().filter(l -> l.classification() == RevenueClassification.RETURN).count());
        assertEquals(4, count("accounting_revenue_lines"));
    }

    @Test void returnsInLaterMonthDoNotRewriteOriginalMonth() {
        confirmed(2025, START);
        revenuePeriod(3);
        revenuePeriod(4);
        Integer sale = saleSource(START, "100.00", true);
        returnSource(sale, Instant.parse("2025-03-31T17:00:00Z"), "25.00", true);
        assertEquals(new java.math.BigDecimal("100.00"), accounting.getRevenue(2025, 3).recordedRevenue());
        var april = accounting.getRevenue(2025, 4);
        assertEquals(new java.math.BigDecimal("-25.00"), april.recordedRevenue());
        assertEquals(java.time.LocalDate.of(2025, 4, 1), april.lines().getFirst().postingDate());
    }

    @Test void excludedOldSaleReturnIsVisibleButNotCounted() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer old = saleSource(START.minusSeconds(1), "100.00", true);
        assertEquals(0, count("accounting_revenue_lines"));
        returnSource(old, START.plusSeconds(1), "20.00", true);
        var result = accounting.getRevenue(2025, 3);
        assertEquals(new java.math.BigDecimal("0.00"), result.recordedRevenue());
        assertEquals(RevenueClassification.EXCLUDED, result.lines().getFirst().classification());
        assertEquals(new java.math.BigDecimal("-20.00"), result.lines().getFirst().signedAmount());
    }

    @Test void deferredSourcesSyncOnlyInsideTrackingRangeAndRemainIdempotent() {
        saleSource(START.minusSeconds(1), "100.00", true);
        saleSource(START, "90.00", true);
        saleSource(Instant.parse("2025-03-31T17:00:00Z"), "30.00", true);
        assertEquals(0, count("accounting_revenue_lines"));
        confirmed(2025, START);
        revenuePeriod(3);
        var first = accounting.synchronizeRevenue(2025, 3);
        long audits = count("audit_logs");
        var second = accounting.synchronizeRevenue(2025, 3);
        assertEquals(first.lines(), second.lines());
        assertEquals(1, second.lines().size());
        assertEquals(new java.math.BigDecimal("90.00"), second.recordedRevenue());
        assertEquals(audits, count("audit_logs"));
    }

    @Test void resyncUpdatesSameLineAndRestoresSoftDeletedLine() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer sale = saleSource(START, "100.00", true);
        Integer line = accounting.getRevenue(2025, 3).lines().getFirst().id();
        jdbc.update("UPDATE sales_orders SET total_amount=80 WHERE id=?", sale);
        jdbc.update("UPDATE accounting_revenue_lines SET is_removed=1 WHERE id=?", line);
        var result = accounting.synchronizeRevenue(2025, 3);
        assertEquals(line, result.lines().getFirst().id());
        assertEquals(new java.math.BigDecimal("80.00"), result.recordedRevenue());
        assertEquals(1, count("accounting_revenue_lines"));
        jdbc.update("UPDATE sales_orders SET order_status='CANCELLED' WHERE id=?", sale);
        assertEquals(new java.math.BigDecimal("0.00"), accounting.synchronizeRevenue(2025, 3).recordedRevenue());
    }

    @Test void configuredMissingOrClosedPeriodRollsBackSource() {
        confirmed(2025, START);
        expectStatus(409, () -> saleSource(START, "100.00", true));
        assertEquals(0, count("sales_orders"));
        revenuePeriod(3);
        jdbc.update("UPDATE accounting_periods SET status='CLOSED',closed_by=1,closed_at=NOW(6)");
        expectStatus(409, () -> saleSource(START, "100.00", true));
        expectStatus(409, () -> accounting.synchronizeRevenue(2025, 3));
        assertEquals(0, count("sales_orders"));
        assertEquals(0, count("accounting_revenue_lines"));
    }

    @Test void ledgerAuditFailureRollsBackSourceAndLineTogether() {
        confirmed(2025, START);
        revenuePeriod(3);
        long audits = count("audit_logs");
        jdbc.execute("""
                CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit_logs FOR EACH ROW
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test ledger audit failure'
                """);
        assertThrows(RuntimeException.class, () -> saleSource(START, "100.00", true));
        assertEquals(0, count("sales_orders"));
        assertEquals(0, count("accounting_revenue_lines"));
        assertEquals(audits, count("audit_logs"));
    }

    @Test void concurrentSyncCreatesOnlyOneLinePerSource() throws Exception {
        saleSource(START, "100.00", false);
        confirmed(2025, START);
        revenuePeriod(3);
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> writer = () -> concurrentOperation(gate, () -> accounting.synchronizeRevenue(2025, 3));
            var a = pool.submit(writer);
            var b = pool.submit(writer);
            gate.countDown();
            assertEquals(200, a.get(20, TimeUnit.SECONDS));
            assertEquals(200, b.get(20, TimeUnit.SECONDS));
        }
        assertEquals(1, count("accounting_revenue_lines"));
        assertEquals(1, jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE entity_name='accounting_revenue_lines'", Integer.class));
    }

    @Test void rejectsMovedSourceInsteadOfLeavingOldPeriodLine() {
        confirmed(2025, START);
        revenuePeriod(3);
        revenuePeriod(4);
        Integer sale = saleSource(START, "100.00", true);
        jdbc.update("UPDATE sales_orders SET created_at='2025-04-01 00:00:00' WHERE id=?", sale);
        expectStatus(409, () -> accounting.synchronizeRevenue(2025, 3));
        expectStatus(409, () -> accounting.synchronizeRevenue(2025, 4));
        assertEquals(1, count("accounting_revenue_lines"));
    }

    @Test void badAmountRollsBackEntireSynchronization() {
        saleSource(START, "100.00", false);
        Integer invalid = saleSource(START.plusSeconds(1), "20.00", false);
        jdbc.update("UPDATE sales_orders SET total_amount=NULL WHERE id=?", invalid);
        confirmed(2025, START);
        revenuePeriod(3);
        long audits = count("audit_logs");
        expectStatus(409, () -> accounting.synchronizeRevenue(2025, 3));
        assertEquals(0, count("accounting_revenue_lines"));
        assertEquals(audits, count("audit_logs"));
    }

    @Test void ledgerApiIsManagerOnlyButInternalPostingAllowsAuthenticatedCashier() throws Exception {
        confirmed(2025, START);
        revenuePeriod(3);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("manager", "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_STAFF"))));
        saleSource(START, "90.00", true);
        String route = "/api/accounting/tax-profiles/2025/periods/3/revenue-lines";
        mvc.perform(get(route)).andExpect(status().isForbidden());
        mvc.perform(post(route + "/synchronize")).andExpect(status().isForbidden());
        manager();
        mvc.perform(post(route + "/synchronize")).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.recordedRevenue").value(90))
                .andExpect(jsonPath("$.result.sourceCompletenessVerified").value(true));
        mvc.perform(get(route)).andExpect(status().isOk()).andExpect(jsonPath("$.result.lines.length()").value(1));
    }

    RevenueAdjustmentInformation extra(String amount) {
        return new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, null, null, null,
                START.plusSeconds(60), java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal(amount),
                RevenueClassification.OTHER_REVENUE, "Doanh thu có chứng từ ngoài POS", "Biên nhận bổ sung số 01");
    }

    project.be_sep490_g67.dto.response.RevenueAdjustmentResponse adjustment(String key, RevenueAdjustmentInformation info) {
        return accounting.createAdjustment(info.postingDate().getYear(), new CreateRevenueAdjustmentRequest(key, info));
    }

    project.be_sep490_g67.dto.response.RevenueAdjustmentResponse approve(
            project.be_sep490_g67.dto.response.RevenueAdjustmentResponse a, boolean cross) {
        return accounting.approveAdjustment(a.taxYear(), a.id(),
                new ApproveRevenueAdjustmentRequest(a.version(), "Đã kiểm tra chứng từ và kỳ ghi nhận", cross));
    }

    AccountingDecisionRequest closeRequest() {
        return new AccountingDecisionRequest(accounting.getPeriod(2025, 3).version(), "Đã đối chiếu nguồn trong hệ thống");
    }

    @Test void draftDoesNotPostAndApprovedAdjustmentPostsExactlyOnce() {
        confirmed(2025, START);
        revenuePeriod(3);
        var draft = adjustment("extra-1", extra("10.00"));
        assertEquals(AdjustmentStatus.DRAFT, draft.status());
        assertEquals(0, count("accounting_revenue_lines"));
        assertFalse(accounting.reconcilePeriod(2025, 3).sourceCompletenessVerified());
        var approved = approve(draft, false);
        assertEquals(AdjustmentStatus.APPROVED, approved.status());
        assertEquals(1, approved.approvedBy());
        assertNotNull(approved.approvedAt());
        assertTrue(approved.version() > draft.version());
        var revenue = accounting.getRevenue(2025, 3);
        assertEquals(new java.math.BigDecimal("10.00"), revenue.recordedRevenue());
        assertEquals(SourceType.REVENUE_ADJUSTMENT, revenue.lines().getFirst().sourceType());
        assertTrue(revenue.sourceCompletenessVerified());
        long auditCount = count("audit_logs");
        accounting.synchronizeRevenue(2025, 3);
        assertEquals(1, count("accounting_revenue_lines"));
        assertEquals(auditCount, count("audit_logs"));
        expectStatus(409, () -> approve(draft, false));
    }

    @Test void adjustmentIdempotencyRejectsChangedPayloadAndPreservesSameResult() {
        confirmed(2025, START);
        revenuePeriod(3);
        var first = adjustment("request-1", extra("10.00"));
        assertEquals(first.id(), adjustment("request-1", extra("10")).id());
        expectStatus(409, () -> adjustment("request-1", extra("11.00")));
        assertEquals(1, count("revenue_adjustments"));
    }

    @Test void editDraftRequiresVersionAndRejectionDoesNotPost() {
        confirmed(2025, START);
        revenuePeriod(3);
        var draft = adjustment("draft-1", extra("10.00"));
        var updated = accounting.updateAdjustment(2025, draft.id(),
                new UpdateRevenueAdjustmentRequest(draft.version(), extra("20.00")));
        expectStatus(409, () -> accounting.updateAdjustment(2025, draft.id(),
                new UpdateRevenueAdjustmentRequest(draft.version(), extra("30.00"))));
        var rejected = accounting.rejectAdjustment(2025, updated.id(),
                new AccountingDecisionRequest(updated.version(), "Không đủ căn cứ ghi nhận"));
        assertEquals(AdjustmentStatus.REJECTED, rejected.status());
        assertEquals(0, count("accounting_revenue_lines"));
        assertTrue(accounting.reconcilePeriod(2025, 3).canClose());
        expectStatus(409, () -> approve(rejected, false));
    }

    @Test void approvedAdjustmentIsImmutableAndCorrectionCreatesSeparateLine() {
        confirmed(2025, START);
        revenuePeriod(3);
        var original = approve(adjustment("original", extra("10.00")), false);
        expectStatus(409, () -> accounting.updateAdjustment(2025, original.id(),
                new UpdateRevenueAdjustmentRequest(original.version(), extra("20.00"))));
        expectStatus(409, () -> accounting.rejectAdjustment(2025, original.id(),
                new AccountingDecisionRequest(original.version(), "Không sửa trực tiếp")));
        var reverseInfo = new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, original.id(),
                accounting.getPeriod(2025, 3).id(), original.id(), START.plusSeconds(120),
                java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal("-10.00"),
                RevenueClassification.CORRECTION, "Đảo khoản ghi nhầm", "Biên bản sửa sai số 02");
        approve(adjustment("reverse", reverseInfo), false);
        assertEquals(2, count("accounting_revenue_lines"));
        assertEquals(new java.math.BigDecimal("0.00"), accounting.getRevenue(2025, 3).recordedRevenue());
    }

    @Test void invalidAdjustmentAmountEvidenceDatesAndSourceAreRejected() {
        confirmed(2025, START);
        revenuePeriod(3);
        expectStatus(400, () -> adjustment("zero", extra("0.00")));
        expectStatus(400, () -> adjustment("negative-extra", extra("-1.00")));
        var missingSource = new RevenueAdjustmentInformation(SourceType.SALES_ORDER, 99999, null, null,
                START, java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal("1.00"),
                RevenueClassification.CORRECTION, "Sửa sai", "Biên bản");
        expectStatus(400, () -> adjustment("missing-source", missingSource));
        var beforeTracking = new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, null, null, null,
                START.minusSeconds(1), java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal("1.00"),
                RevenueClassification.OTHER_REVENUE, "Trước mốc", "Biên nhận");
        expectStatus(400, () -> adjustment("before-start", beforeTracking));
        var missingEvidence = new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, null, null, null,
                START, java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal("1.00"),
                RevenueClassification.OTHER_REVENUE, "Bổ sung", " ");
        expectStatus(400, () -> adjustment("no-evidence", missingEvidence));
        assertEquals(0, count("revenue_adjustments"));
    }

    @Test void selfReferenceAndDraftReferenceAreRejected() {
        confirmed(2025, START);
        revenuePeriod(3);
        var draft = adjustment("draft-reference", extra("10.00"));
        var self = new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, draft.id(), null, draft.id(),
                START.plusSeconds(120), java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal("-10.00"),
                RevenueClassification.CORRECTION, "Đảo", "Biên bản");
        expectStatus(400, () -> accounting.updateAdjustment(2025, draft.id(),
                new UpdateRevenueAdjustmentRequest(draft.version(), self)));
        expectStatus(400, () -> adjustment("other-draft", self));
    }

    @Test void crossYearCorrectionNeedsExplicitConsentAndKeepsClosedOriginalPeriod() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer sale = saleSource(START, "100.00", true);
        var originalPeriod = accounting.closePeriod(2025, 3, closeRequest());
        var nextProfile = confirmed(2026, null);
        accounting.createPeriod(2026, new CreateAccountingPeriodRequest(1, nextProfile.version()));
        var info = new RevenueAdjustmentInformation(SourceType.SALES_ORDER, sale, originalPeriod.id(), null,
                START.plusSeconds(1), java.time.LocalDate.of(2026, 1, 2), new java.math.BigDecimal("-10.00"),
                RevenueClassification.CORRECTION, "Điều chỉnh kỳ cũ theo căn cứ đã kiểm tra", "Biên bản và căn cứ ghi kỳ mới");
        var draft = adjustment("cross-year", info);
        expectStatus(409, () -> approve(draft, false));
        approve(draft, true);
        assertEquals(PeriodStatus.CLOSED, accounting.getPeriod(2025, 3).status());
        assertEquals(new java.math.BigDecimal("100.00"), accounting.getRevenue(2025, 3).recordedRevenue());
        var newRevenue = accounting.getRevenue(2026, 1);
        assertEquals(new java.math.BigDecimal("-10.00"), newRevenue.recordedRevenue());
        assertEquals(java.time.LocalDate.of(2026, 1, 2), newRevenue.lines().getFirst().postingDate());
        assertEquals(START.plusSeconds(1), newRevenue.lines().getFirst().occurredAt());
        assertTrue(accounting.reconcilePeriod(2026, 1).sourceCompletenessVerified());
    }

    @Test void sourceWithApprovedCorrectionCannotBeResyncedToDoubleCountChange() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer sale = saleSource(START, "100.00", true);
        var info = new RevenueAdjustmentInformation(SourceType.SALES_ORDER, sale, null, null,
                START.plusSeconds(1), java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal("10.00"),
                RevenueClassification.CORRECTION, "Bổ sung chênh lệch", "Biên bản");
        approve(adjustment("source-delta", info), false);
        jdbc.update("UPDATE sales_orders SET total_amount=110 WHERE id=?", sale);
        expectStatus(409, () -> accounting.synchronizeRevenue(2025, 3));
        assertFalse(accounting.reconcilePeriod(2025, 3).sourceCompletenessVerified());
        expectStatus(409, () -> accounting.closePeriod(2025, 3, closeRequest()));
        assertEquals(new java.math.BigDecimal("110.00"), accounting.getRevenue(2025, 3).recordedRevenue());
    }

    @Test void reconciliationDetectsMissingLinesAndNeverSynchronizesImplicitly() {
        saleSource(START, "100.00", false);
        confirmed(2025, START);
        revenuePeriod(3);
        var report = accounting.reconcilePeriod(2025, 3);
        assertFalse(report.canClose());
        assertEquals("MISSING_LINE", report.issues().getFirst().code());
        assertEquals(0, count("accounting_revenue_lines"));
        expectStatus(409, () -> accounting.closePeriod(2025, 3, closeRequest()));
        accounting.synchronizeRevenue(2025, 3);
        assertTrue(accounting.reconcilePeriod(2025, 3).canClose());
    }

    @Test void equalTotalsDoNotHideMismatchedSources() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer first = saleSource(START, "100.00", true);
        Integer second = saleSource(START.plusSeconds(1), "50.00", true);
        jdbc.update("UPDATE sales_orders SET total_amount=90 WHERE id=?", first);
        jdbc.update("UPDATE sales_orders SET total_amount=60 WHERE id=?", second);
        var report = accounting.reconcilePeriod(2025, 3);
        assertEquals(report.expectedRevenue(), report.recordedRevenue());
        assertFalse(report.sourceCompletenessVerified());
        assertEquals(2, report.issues().stream().filter(i -> i.code().equals("SOURCE_MISMATCH")).count());
        expectStatus(409, () -> accounting.closePeriod(2025, 3, closeRequest()));
    }

    @Test void pendingDraftBlocksClosingUntilResolved() {
        confirmed(2025, START);
        revenuePeriod(3);
        var draft = adjustment("pending", extra("10.00"));
        expectStatus(409, () -> accounting.closePeriod(2025, 3, closeRequest()));
        approve(draft, false);
        var closed = accounting.closePeriod(2025, 3, closeRequest());
        assertEquals(PeriodStatus.CLOSED, closed.status());
        assertNotNull(closed.closedAt());
        assertEquals(1, closed.closedBy());
        assertTrue(closed.version() > 0);
        expectStatus(409, () -> accounting.synchronizeRevenue(2025, 3));
        expectStatus(409, () -> adjustment("after-close", extra("20.00")));
    }

    @Test void relatedDraftInAnotherMonthAlsoBlocksClosing() {
        confirmed(2025, START);
        revenuePeriod(3);
        revenuePeriod(4);
        var info = new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, null,
                accounting.getPeriod(2025, 3).id(), null, START.plusSeconds(60), java.time.LocalDate.of(2025, 4, 1),
                new java.math.BigDecimal("10.00"), RevenueClassification.CORRECTION, "Sai kỳ trước", "Biên bản");
        var draft = adjustment("pending-related", info);
        expectStatus(409, () -> accounting.closePeriod(2025, 3, closeRequest()));
        accounting.rejectAdjustment(2025, draft.id(), new AccountingDecisionRequest(draft.version(), "Chưa có căn cứ"));
        assertTrue(accounting.reconcilePeriod(2025, 3).canClose());
    }

    @Test void cannotCloseCurrentMonthOrWithStaleVersion() {
        var now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        var p = confirmed(now.getYear(), now.toInstant().minusSeconds(1));
        var period = accounting.createPeriod(now.getYear(), new CreateAccountingPeriodRequest(now.getMonthValue(), p.version()));
        expectStatus(409, () -> accounting.closePeriod(now.getYear(), now.getMonthValue(),
                new AccountingDecisionRequest(period.version(), "Chưa hết kỳ")));
        expectStatus(409, () -> accounting.closePeriod(now.getYear(), now.getMonthValue(),
                new AccountingDecisionRequest(period.version() + 1, "Version sai")));
    }

    @Test void approvalAuditFailureRollsBackStatusLineAndAllAudits() {
        confirmed(2025, START);
        revenuePeriod(3);
        var draft = adjustment("audit-failure", extra("10.00"));
        long before = count("audit_logs");
        jdbc.execute("""
                CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit_logs FOR EACH ROW
                BEGIN
                  IF NEW.action_type='REVENUE_ADJUSTMENT_APPROVE' THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test approval audit failure';
                  END IF;
                END
                """);
        assertThrows(RuntimeException.class, () -> approve(draft, false));
        assertEquals(AdjustmentStatus.DRAFT, accounting.getAdjustment(2025, draft.id()).status());
        assertEquals(draft.version(), accounting.getAdjustment(2025, draft.id()).version());
        assertEquals(0, count("accounting_revenue_lines"));
        assertEquals(before, count("audit_logs"));
    }

    @Test void closeAuditFailureRollsBackClosedState() {
        confirmed(2025, START);
        revenuePeriod(3);
        var before = accounting.getPeriod(2025, 3);
        jdbc.execute("""
                CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit_logs FOR EACH ROW
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test close audit failure'
                """);
        assertThrows(RuntimeException.class, () -> accounting.closePeriod(2025, 3, closeRequest()));
        assertEquals(before, accounting.getPeriod(2025, 3));
    }

    @Test void concurrentApprovalPostsOnce() throws Exception {
        confirmed(2025, START);
        revenuePeriod(3);
        var draft = adjustment("concurrent-approve", extra("10.00"));
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> operation = () -> concurrentOperation(gate, () -> approve(draft, false));
            var first = pool.submit(operation);
            var second = pool.submit(operation);
            gate.countDown();
            var results = List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            assertTrue(results.contains(200));
            assertTrue(results.contains(409));
        }
        assertEquals(1, count("accounting_revenue_lines"));
    }

    @Test void concurrentCloseAndSourceWriteCannotLeaveUnrecordedSource() throws Exception {
        confirmed(2025, START);
        revenuePeriod(3);
        var request = closeRequest();
        var gate = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var close = pool.submit(() -> concurrentOperation(gate, () -> accounting.closePeriod(2025, 3, request)));
            var write = pool.submit(() -> concurrentOperation(gate, () -> saleSource(START, "100.00", true)));
            gate.countDown();
            assertEquals(200, close.get(20, TimeUnit.SECONDS));
            int written = write.get(20, TimeUnit.SECONDS);
            assertTrue(written == 200 || written == 409);
        }
        assertEquals(PeriodStatus.CLOSED, accounting.getPeriod(2025, 3).status());
        assertEquals(count("sales_orders"), count("accounting_revenue_lines"));
        assertTrue(accounting.reconcilePeriod(2025, 3).sourceCompletenessVerified());
    }

    @Test void undatedSourceBlocksVerificationRatherThanAssumingZero() {
        confirmed(2025, START);
        revenuePeriod(3);
        Integer source = saleSource(START, "100.00", false);
        jdbc.update("UPDATE sales_orders SET created_at=NULL WHERE id=?", source);
        var report = accounting.reconcilePeriod(2025, 3);
        assertTrue(report.issues().stream().anyMatch(i -> i.code().equals("UNDATED_SOURCE")));
        assertFalse(report.canClose());
    }

    @Test void adjustmentAndClosingApisValidateAndProtectManagerActions() throws Exception {
        confirmed(2025, START);
        revenuePeriod(3);
        String root = "/api/accounting/tax-profiles/2025";
        mvc.perform(post(root + "/adjustments").contentType(MediaType.APPLICATION_JSON).content("""
                {"idempotencyKey":"api-extra","information":{"sourceType":"REVENUE_ADJUSTMENT",
                "occurredAt":"2025-03-15T03:01:00Z","postingDate":"2025-03-15","signedAmount":10,
                "classification":"OTHER_REVENUE","inclusionReason":"Extra","evidence":"Receipt"}}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.result.status").value("DRAFT"));
        var a = accounting.getAdjustments(2025).getFirst();
        mvc.perform(post(root + "/adjustments/" + a.id() + "/approve").contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":" + a.version() + ",\"reason\":\"Checked\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.status").value("APPROVED"));
        mvc.perform(get(root + "/periods/3/reconciliation")).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.canClose").value(true));
        mvc.perform(post(root + "/periods/3/close").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("manager", "unused", List.of(new SimpleGrantedAuthority("ROLE_STAFF"))));
        mvc.perform(get(root + "/adjustments")).andExpect(status().isForbidden());
        mvc.perform(get(root + "/periods/3/reconciliation")).andExpect(status().isForbidden());
        mvc.perform(post(root + "/periods/3/close").contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0,\"reason\":\"Checked\"}")).andExpect(status().isForbidden());
    }

    @Test void adjustmentCannotLinkPeriodOrOriginalAdjustmentFromAnotherStore() {
        confirmed(2025, START);
        revenuePeriod(3);
        jdbc.update("INSERT INTO store_config(id,store_name) VALUES(2,'Other store')");
        jdbc.update("""
                INSERT INTO business_tax_profiles(store_id,tax_year,tracking_started_at)
                VALUES(2,2025,'2025-03-15 03:00:00')
                """);
        int foreignProfile = jdbc.queryForObject("SELECT id FROM business_tax_profiles WHERE store_id=2", Integer.class);
        jdbc.update("""
                INSERT INTO accounting_periods(profile_id,accounting_month,start_at,end_exclusive)
                VALUES(?,3,'2025-03-15 03:00:00','2025-03-31 17:00:00')
                """, foreignProfile);
        int foreignPeriod = jdbc.queryForObject("SELECT id FROM accounting_periods WHERE profile_id=?", Integer.class, foreignProfile);
        var wrongPeriod = new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, null, foreignPeriod, null,
                START.plusSeconds(60), java.time.LocalDate.of(2025, 3, 15), new java.math.BigDecimal("10.00"),
                RevenueClassification.OTHER_REVENUE, "Bổ sung", "Biên nhận");
        expectStatus(400, () -> adjustment("foreign-period", wrongPeriod));
        jdbc.update("""
                INSERT INTO revenue_adjustments(profile_id,source_type,occurred_at,posting_date,signed_amount,
                classification,inclusion_reason,evidence,status,approved_by,approved_at,idempotency_key)
                VALUES(?,'REVENUE_ADJUSTMENT','2025-03-15 03:00:00','2025-03-15',10,
                'OTHER_REVENUE','Other','Receipt','APPROVED',1,'2025-03-16 00:00:00','foreign')
                """, foreignProfile);
        int foreignAdjustment = jdbc.queryForObject("SELECT id FROM revenue_adjustments WHERE profile_id=?", Integer.class, foreignProfile);
        var wrongOriginal = new RevenueAdjustmentInformation(SourceType.REVENUE_ADJUSTMENT, foreignAdjustment, null,
                foreignAdjustment, START.plusSeconds(60), java.time.LocalDate.of(2025, 3, 15),
                new java.math.BigDecimal("-10.00"), RevenueClassification.CORRECTION, "Đảo khoản gốc", "Biên bản");
        expectStatus(400, () -> adjustment("foreign-original", wrongOriginal));
    }

    @Configuration
    @EnableTransactionManagement
    @EnableMethodSecurity
    @EnableJpaRepositories(basePackageClasses = StoreConfigRepository.class,
            includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                    StoreConfigRepository.class, BusinessTaxProfileRepository.class,
                    AccountingPeriodRepository.class, RevenueAdjustmentRepository.class,
                    AccountingRevenueLineRepository.class, SalesOrderRepository.class, ReturnOrderRepository.class,
                    UserRepository.class, AuditLogRepository.class}))
    static class Config {
        @Bean DataSource dataSource() {
            var ds = new DriverManagerDataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
            var sql = new JdbcTemplate(ds);
            sql.execute("""
                    CREATE TABLE store_config (id INT PRIMARY KEY, is_removed BIT DEFAULT 0,
                    created_at DATETIME(6),updated_at DATETIME(6),created_by INT,updated_by INT,
                    store_name VARCHAR(200) NOT NULL,owner_full_name VARCHAR(100),address VARCHAR(255),
                    tax_code VARCHAR(20),tax_rate DECIMAL(5,2),currency VARCHAR(10),bank_id VARCHAR(20),
                    bank_account_no VARCHAR(50),bank_account_name VARCHAR(100))
                    """);
            sql.execute("""
                    CREATE TABLE users (id INT PRIMARY KEY, is_removed BIT DEFAULT 0,
                    created_at DATETIME(6),updated_at DATETIME(6),created_by INT,updated_by INT,
                    username VARCHAR(50),full_name VARCHAR(100),password_hash VARCHAR(255),
                    phone_number VARCHAR(15),status VARCHAR(20))
                    """);
            sql.execute("""
                    CREATE TABLE audit_logs (id INT AUTO_INCREMENT PRIMARY KEY,is_removed BIT DEFAULT 0,
                    created_at DATETIME(6),updated_at DATETIME(6),created_by INT,updated_by INT,
                    user_id INT,action_type VARCHAR(50),entity_name VARCHAR(60),entity_id INT,
                    old_value LONGTEXT,new_value LONGTEXT,FOREIGN KEY(user_id) REFERENCES users(id))
                    """);
            new ResourceDatabasePopulator(new ClassPathResource(
                    "db/migration/V67__create_accounting_model.sql")).execute(ds);
            sql.execute("""
                    CREATE TABLE sales_orders (id INT AUTO_INCREMENT PRIMARY KEY,is_removed BIT DEFAULT 0,
                    created_at DATETIME(6),updated_at DATETIME(6),created_by INT,updated_by INT,
                    customer_id INT,order_code VARCHAR(30),original_sales_order_id INT,payment_method VARCHAR(50),
                    order_status VARCHAR(50),subtotal DECIMAL(15,2),paid_amount DECIMAL(15,2),
                    discount_amount DECIMAL(15,2),total_amount DECIMAL(15,2),is_debt BIT,note LONGTEXT,
                    payment_reference VARCHAR(100),due_date DATETIME(6))
                    """);
            sql.execute("""
                    CREATE TABLE return_orders (id INT AUTO_INCREMENT PRIMARY KEY,is_removed BIT DEFAULT 0,
                    created_at DATETIME(6),updated_at DATETIME(6),created_by INT,updated_by INT,
                    sales_order_id INT,return_code VARCHAR(30),return_reason LONGTEXT,resolution_type LONGTEXT,
                    refund_amount DECIMAL(15,2),debt_offset_amount DECIMAL(15,2),cash_refund_amount DECIMAL(15,2),
                    note LONGTEXT,FOREIGN KEY(sales_order_id) REFERENCES sales_orders(id))
                    """);
            sql.update("INSERT INTO store_config(id,store_name) VALUES(1,'Test store')");
            sql.update("INSERT INTO users(id,username,status) VALUES(1,'manager','ACTIVE')");
            return ds;
        }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource ds) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(ds);
            factory.setPackagesToScan("project.be_sep490_g67.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "none", "hibernate.jdbc.time_zone", "UTC"));
            return factory;
        }
        @Bean PlatformTransactionManager transactionManager(EntityManagerFactory emf) {
            return new JpaTransactionManager(emf);
        }
        @Bean JdbcTemplate jdbcTemplate(DataSource ds) { return new JdbcTemplate(ds); }
        @Bean AuditLogService auditLogService(AuditLogRepository repo) { return new AuditLogService(repo); }
        @Bean StoreService storeService(StoreConfigRepository store, BusinessTaxProfileRepository profiles,
                AccountingPeriodRepository periods, RevenueAdjustmentRepository adjustments,
                UserRepository users, AuditLogService audit) {
            return new StoreService(store, profiles, periods, adjustments, users, audit);
        }
        @Bean StoreController storeController(StoreService service) { return new StoreController(service); }
        @Bean AccountingService accountingService(StoreConfigRepository store, BusinessTaxProfileRepository profiles,
                AccountingPeriodRepository periods, UserRepository users, AuditLogService audit,
                AccountingRevenueLineRepository lines, SalesOrderRepository sales, ReturnOrderRepository returns,
                RevenueAdjustmentRepository adjustments) {
            return new AccountingService(store, profiles, periods, users, audit, lines, sales, returns, adjustments);
        }
        @Bean project.be_sep490_g67.controller.AccountingController accountingController(AccountingService service) {
            return new project.be_sep490_g67.controller.AccountingController(service);
        }
        @Bean project.be_sep490_g67.controller.RevenueAdjustmentController adjustmentController(AccountingService service) {
            return new project.be_sep490_g67.controller.RevenueAdjustmentController(service);
        }
    }
}
