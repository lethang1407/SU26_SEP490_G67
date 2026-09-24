# Integration Test Cases - Tax & Accounting Management (`AccountingController`, `RevenueAdjustmentController`, `StoreController`)

### 📋 Controller Overview & Test Objectives (Mô tả Controller & Mục tiêu Kiểm thử)

| Mục | Chi tiết |
| :--- | :--- |
| **Controller** | `AccountingController`, `RevenueAdjustmentController`, `StoreController` (`project.be_sep490_g67.controller`) |
| **Base API Path** | `/api/v1/accounting/tax-profiles/{year}/periods`, `/api/v1/accounting/tax-profiles/{year}/adjustments`, `/api/store/tax-profiles` |
| **Mô tả nghiệp vụ** | Hệ thống quản lý hồ sơ thuế hộ kinh doanh cá thể, kỳ kế toán theo tháng, đồng bộ và ghi nhận doanh thu từ đơn bán hàng, đơn trả hàng và các khoản điều chỉnh doanh thu đã duyệt; quản lý mốc bắt đầu theo dõi (`trackingStartedAt`) dùng chung; đối chiếu số liệu và khóa kỳ kế toán; lập báo cáo doanh thu theo tháng/quý/năm; xuất Sổ doanh thu S1a-HKD (JSON & Excel `.xlsx`); và xuất Tờ khai thuế mẫu 01/TKN-CNKD (Word `.docx`) cho hộ kinh doanh theo đúng quy định pháp luật. |
| **Phạm vi API kiểm thử** | **1. `GET /api/store/tax-profiles`**: Lấy danh sách hồ sơ thuế các năm của cửa hàng.<br>**2. `GET /api/store/tax-profiles/{year}`**: Lấy chi tiết hồ sơ thuế theo năm.<br>**3. `POST /api/store/tax-profiles`**: Tạo mới hồ sơ thuế năm (khởi tạo hoặc kế thừa mốc `trackingStartedAt`).<br>**4. `PUT /api/store/tax-profiles/{year}`**: Cập nhật thông tin định danh người nộp thuế, địa chỉ, cơ quan thuế, phương pháp khai.<br>**5. `POST /api/store/tax-profiles/{year}/confirm`**: Xác nhận hồ sơ thuế (`CONFIRMED`) kiểm tra đầy đủ thông tin bắt buộc và khóa version.<br>**6. `PUT /api/store/tax-profiles/{year}/tracking-start`**: Đổi mốc bắt đầu theo dõi dùng chung (reset các hồ sơ về DRAFT, yêu cầu lý do, kiểm tra không có kỳ mở/đóng).<br>**7. `GET /api/v1/accounting/tax-profiles/{year}/periods`**: Lấy danh sách các kỳ kế toán tháng trong năm.<br>**8. `GET /api/v1/accounting/tax-profiles/{year}/periods/{month}`**: Lấy thông tin chi tiết một kỳ kế toán tháng.<br>**9. `POST /api/v1/accounting/tax-profiles/{year}/periods`**: Tạo kỳ kế toán tháng (yêu cầu hồ sơ đã xác nhận, tháng >= mốc theo dõi).<br>**10. `GET /api/v1/accounting/tax-profiles/{year}/periods/{month}/revenue-lines`**: Lấy danh sách các dòng doanh thu đã ghi nhận trong kỳ.<br>**11. `POST /api/v1/accounting/tax-profiles/{year}/periods/{month}/revenue-lines/synchronize`**: Đồng bộ doanh thu từ đơn bán, đơn trả và điều chỉnh đã duyệt.<br>**12. `GET /api/v1/accounting/tax-profiles/{year}/periods/{month}/reconciliation`**: Đối chiếu kiểm tra tính toàn vẹn và khớp số liệu nguồn của kỳ.<br>**13. `POST /api/v1/accounting/tax-profiles/{year}/periods/{month}/close`**: Khóa kỳ kế toán (yêu cầu đối chiếu đạt `canClose = true`).<br>**14. `GET /api/v1/accounting/tax-profiles/{year}/adjustments`**: Lấy danh sách các khoản điều chỉnh doanh thu.<br>**15. `GET /api/v1/accounting/tax-profiles/{year}/adjustments/{id}`**: Lấy chi tiết một khoản điều chỉnh.<br>**16. `POST /api/v1/accounting/tax-profiles/{year}/adjustments`**: Tạo mới khoản điều chỉnh doanh thu nháp (`DRAFT`).<br>**17. `PUT /api/v1/accounting/tax-profiles/{year}/adjustments/{id}`**: Sửa khoản điều chỉnh nháp.<br>**18. `POST /api/v1/accounting/tax-profiles/{year}/adjustments/{id}/approve`**: Phê duyệt khoản điều chỉnh doanh thu.<br>**19. `POST /api/v1/accounting/tax-profiles/{year}/adjustments/{id}/reject`**: Từ chối khoản điều chỉnh doanh thu.<br>**20. `GET /api/v1/accounting/tax-profiles/{year}/periods/summary/months/{month}`**: Lấy báo cáo tổng hợp doanh thu theo tháng.<br>**21. `GET /api/v1/accounting/tax-profiles/{year}/periods/summary/quarters/{quarter}`**: Lấy báo cáo tổng hợp doanh thu theo quý.<br>**22. `GET /api/v1/accounting/tax-profiles/{year}/periods/summary`**: Lấy báo cáo tổng hợp doanh thu cả năm.<br>**23. `GET /api/v1/accounting/tax-profiles/{year}/periods/{month}/tax-support/s1a`**: Lấy dữ liệu sổ doanh thu S1a-HKD dạng JSON.<br>**24. `GET /api/v1/accounting/tax-profiles/{year}/periods/{month}/tax-support/s1a.xlsx`**: Xuất file Excel sổ doanh thu S1a-HKD.<br>**25. `GET /api/v1/accounting/tax-profiles/{year}/periods/tax-support/01-tkn-cnkd.docx`**: Xuất tờ khai thuế mẫu 01/TKN-CNKD dạng Word `.docx`. |
| **Mục tiêu Integration Test** | Xác thực tính toàn vẹn dữ liệu thuế & kế toán, mốc theo dõi bất biến, khóa kỳ an toàn, đồng bộ doanh thu chính xác không trùng lặp, quy trình phê duyệt điều chỉnh nghiêm ngặt và xuất biểu mẫu thuế chuẩn quy định. |

> **Note**: File này được tổng hợp và chuẩn hóa theo đúng cấu trúc bảng yêu cầu: `Test Case ID`, `Test Case Description`, `Test Case Procedure`, `Expected Results`, `Pre-conditions`, `Round 1`, `Test date`, `Tester`. Bạn có thể sao chép trực tiếp dữ liệu từ các bảng dưới đây vào file Excel.

---

### Bảng Thông Tin Module (Sheet Header)

| Attribute | Value |
| :--- | :--- |
| **Feature** | Tax & Accounting Management (`AccountingController`, `RevenueAdjustmentController`, `StoreController`) |
| **Test requirement** | Standardized integration tests for all 25 API endpoints in Tax & Accounting module: tax profile lifecycle & tracking synchronization, monthly accounting periods, revenue line synchronization & uniqueness, reconciliation & period closing, revenue adjustment approval workflow, and S1a Excel / Form 01/TKN-CNKD Word export. |
| **Number of TCs** | 40 |
| **Testing Round** | Passed: 40 \| Failed: 0 \| Pending: 0 \| N/A: 0 |

---

### Bảng Integration Test Cases (`AccountingController`, `RevenueAdjustmentController`, `StoreController`)

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tax Profile Management** | | | | | | | |
| **TC_TAX_PRF_01** | Create draft tax profile for Year 2026 with initial `trackingStartedAt` timestamp. | 1. Prepare JSON body:<br>`{"taxYear": 2026, "trackingStartedAt": "2026-01-01T00:00:00Z", "information": {"taxpayerIdentity": "0123456789", "taxpayerName": "Nguyễn Văn A", "taxpayerAddress": "Hà Nội", "taxAuthority": "Chi cục thuế Hoàn Kiếm", "declaredMethod": "REVENUE_BASED", "invoiceRegistrationStatus": "NOT_REGISTERED"}}`<br>2. Dispatch `POST /api/store/tax-profiles`. | 1. HTTP Status Code: `200 OK`<br>2. `result.taxYear = 2026`, `result.status = "DRAFT"`, `result.version = 0`.<br>3. `trackingStartedAt` set to `2026-01-01T00:00:00Z`. | User authenticated with `MANAGER` role. Store has no profile for 2026. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_02** | Create tax profile for next year (2027) inheriting store-wide unified `trackingStartedAt`. | 1. Prepare JSON body:<br>`{"taxYear": 2027, "trackingStartedAt": null, "information": {"taxpayerIdentity": "0123456789", "taxpayerName": "Nguyễn Văn A", "taxpayerAddress": "Hà Nội", "taxAuthority": "Chi cục thuế Hoàn Kiếm", "declaredMethod": "REVENUE_BASED", "invoiceRegistrationStatus": "NOT_REGISTERED"}}`<br>2. Dispatch `POST /api/store/tax-profiles`. | 1. HTTP Status Code: `200 OK`<br>2. `result.taxYear = 2027`, `result.trackingStartedAt = "2026-01-01T00:00:00Z"` (inherited from existing 2026 profile). | Profile 2026 exists with start timestamp `2026-01-01`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_03** | Reject creating tax profile when tax year already exists in store (duplicate year check). | 1. Prepare JSON body with `taxYear: 2026`.<br>2. Dispatch `POST /api/store/tax-profiles`. | 1. HTTP Status Code: `409 Conflict`<br>2. Throws exception indicating tax profile for year 2026 already exists. | Profile 2026 already exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_04** | Reject creating tax profile with conflicting `trackingStartedAt` different from existing store mốc. | 1. Prepare JSON body for 2027 with `trackingStartedAt: "2026-06-01T00:00:00Z"` (differs from 2026-01-01).<br>2. Dispatch `POST /api/store/tax-profiles`. | 1. HTTP Status Code: `409 Conflict`<br>2. Throws error indicating tracking start timestamp must match unified store timestamp. | Store has unified tracking mốc `2026-01-01`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_05** | Update draft tax profile taxpayer information successfully. | 1. Prepare JSON body:<br>`{"version": 0, "information": {"taxpayerIdentity": "0123456789", "taxpayerName": "Nguyễn Văn A Cập Nhật", "taxpayerAddress": "Hà Nội Mới", "taxAuthority": "Chi cục thuế Đống Đa", "declaredMethod": "REVENUE_BASED", "invoiceRegistrationStatus": "REGISTERED"}}`<br>2. Dispatch `PUT /api/store/tax-profiles/2026`. | 1. HTTP Status Code: `200 OK`<br>2. `result.information.taxpayerName = "Nguyễn Văn A Cập Nhật"`, `result.version` increments to 1. | Profile 2026 exists with `version = 0`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_06** | Confirm tax profile successfully (`status` transitions to `CONFIRMED`). | 1. Prepare JSON body: `{"version": 1}`<br>2. Dispatch `POST /api/store/tax-profiles/2026/confirm`. | 1. HTTP Status Code: `200 OK`<br>2. `result.status = "CONFIRMED"`, `result.confirmedBy` populated with manager user ID, `result.confirmedAt` recorded. | Profile 2026 exists with full valid information and `version = 1`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_07** | Reject confirming tax profile when required information is `UNKNOWN` or null. | 1. Profile 2026 has `declaredMethod = "UNKNOWN"`.<br>2. Dispatch `POST /api/store/tax-profiles/2026/confirm` with `{"version": 0}`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Error: All tax information fields must be fully specified before confirmation. | Profile 2026 has incomplete information. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_08** | Reject confirming tax profile when request version does not match DB version (Optimistic lock conflict). | 1. Prepare JSON body with stale version `{"version": 99}`.<br>2. Dispatch `POST /api/store/tax-profiles/2026/confirm`. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Version mismatch conflict. | DB version is different from 99. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_09** | Change tracking started at timestamp across all store profiles (resets confirmations to `DRAFT`). | 1. Prepare JSON body:<br>`{"version": 2, "trackingStartedAt": "2026-03-01T00:00:00Z", "reason": "Điều chỉnh mốc bắt đầu dùng phần mềm"}`<br>2. Dispatch `PUT /api/store/tax-profiles/2026/tracking-start`. | 1. HTTP Status Code: `200 OK`<br>2. All tax profiles of store have `trackingStartedAt = "2026-03-01T00:00:00Z"`.<br>3. Profile statuses reset to `DRAFT` for re-confirmation. | User has `MANAGER` role. No accounting periods exist yet. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_10** | Reject changing tracking start timestamp when open/closed accounting periods exist. | 1. Accounting period for Month 1 exists.<br>2. Dispatch `PUT /api/store/tax-profiles/2026/tracking-start` with new date. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Cannot change tracking start timestamp when accounting periods or adjustments exist. | Accounting period exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_TAX_PRF_11** | Reject tax profile operations when user lacks `MANAGER` role. | 1. Authenticate as Cashier/Sales user.<br>2. Dispatch `GET /api/store/tax-profiles`. | 1. HTTP Status Code: `403 Forbidden`. | User lacks `ROLE_MANAGER`. | Passed | 10/08/2026 | dungnthe180742 |
| **Accounting Period Lifecycle** | | | | | | | |
| **TC_ACC_PER_01** | Create accounting period for Month 1 in confirmed tax profile 2026. | 1. Prepare JSON body:<br>`{"accountingMonth": 1, "profileVersion": 2}`<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods`. | 1. HTTP Status Code: `200 OK`<br>2. `result.accountingMonth = 1`, `result.status = "OPEN"`, `result.startAt = "2026-01-01T00:00:00Z"`, `result.endExclusive = "2026-02-01T00:00:00Z"`. | Profile 2026 is `CONFIRMED`. `trackingStartedAt <= 2026-01-01`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_PER_02** | Reject creating accounting period when tax profile is still in `DRAFT` status. | 1. Profile 2026 is `DRAFT`.<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods` with `accountingMonth = 1`. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Tax profile must be confirmed before creating accounting periods. | Profile 2026 status is `DRAFT`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_PER_03** | Reject creating accounting period for month prior to `trackingStartedAt`. | 1. Profile 2026 has `trackingStartedAt = "2026-03-15T00:00:00Z"`.<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods` with `accountingMonth = 1`. | 1. HTTP Status Code: `409 Conflict` / `400 Bad Request`<br>2. Error: Cannot create period for month prior to tracking start mốc. | Tracking start is in March. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_PER_04** | Reject creating duplicate accounting period for same month in same year. | 1. Period Month 1 already exists.<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods` with `accountingMonth = 1`. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Accounting period for Month 1 already exists. | Period Month 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_PER_05** | Query list of all accounting periods for a tax year. | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods`. | 1. HTTP Status Code: `200 OK`<br>2. `result` returns list of periods created in 2026, each containing status (`OPEN`/`CLOSED`), recorded revenue, and lock info. | Periods exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_PER_06** | Get accounting period detail for a specific month (`GET /periods/{month}`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1`. | 1. HTTP Status Code: `200 OK`<br>2. `result.accountingMonth = 1`, `result.status = "OPEN"`, returns revenue totals and reconciliation status. | Period Month 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **Revenue Synchronization & Lines** | | | | | | | |
| **TC_ACC_REV_01** | Synchronize revenue lines from sales orders and return orders into open period Month 1. | 1. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines/synchronize`. | 1. HTTP Status Code: `200 OK`<br>2. `result.lines` populated with sales order revenue lines (`signedAmount > 0`) and return lines (`signedAmount < 0`).<br>3. `result.totalRevenue` equals sum of signed amounts. | Sales orders and returns exist in Month 1 date range. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_REV_02** | Verify transactions prior to `trackingStartedAt` are strictly excluded from revenue lines. | 1. Sales order created on `2025-12-31`. `trackingStartedAt = "2026-01-01"`.<br>2. Dispatch synchronize on Month 1.<br>3. Inspect generated revenue lines. | 1. HTTP Status Code: `200 OK`<br>2. Sales order from 2025-12-31 is not present in revenue lines. | Historical orders exist prior to tracking start. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_REV_03** | Verify uniqueness constraint `(sourceType, sourceId)` prevents duplicate revenue lines across periods. | 1. Synchronize Month 1 revenue lines.<br>2. Dispatch synchronize Month 1 again.<br>3. Inspect total lines count in DB. | 1. HTTP Status Code: `200 OK`<br>2. Total revenue lines count in DB remains unchanged (idempotent synchronization). | Period 1 synchronized previously. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_REV_04** | Reject revenue synchronization on a closed accounting period (`status = "CLOSED"`). | 1. Period Month 1 is `CLOSED`.<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines/synchronize`. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Cannot synchronize revenue on closed accounting period. | Period 1 is `CLOSED`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_REV_05** | Query list of revenue lines for an accounting period (`GET /periods/{month}/revenue-lines`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines`. | 1. HTTP Status Code: `200 OK`<br>2. `result.lines` returns itemized list of revenue entries with `sourceType`, `sourceCode`, `occurredAt`, `postingDate`, `signedAmount`. | Revenue lines exist in period. | Passed | 10/08/2026 | dungnthe180742 |
| **Reconciliation & Period Closing** | | | | | | | |
| **TC_ACC_REC_01** | Reconcile accounting period when all source transactions match (`canClose = true`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/reconciliation`. | 1. HTTP Status Code: `200 OK`<br>2. `result.expectedSourceCount == result.recordedLineCount`<br>3. `result.expectedRevenue == result.recordedRevenue`<br>4. `result.sourceCompletenessVerified = true`, `result.canClose = true`, `result.issues: []`. | All sales, returns, and approved adjustments are synchronized. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_REC_02** | Reconcile accounting period with unsynchronized new sales orders (`canClose = false`). | 1. Create a new sales order in Month 1 without re-synchronizing.<br>2. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/reconciliation`. | 1. HTTP Status Code: `200 OK`<br>2. `result.sourceCompletenessVerified = false`, `result.canClose = false`<br>3. `result.issues` lists unrecorded source sales order. | New order created after last sync. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_CLS_01** | Close accounting period successfully when reconciliation passes (`canClose = true`). | 1. Prepare JSON body:<br>`{"version": 1, "reason": "Đã đối chiếu đầy đủ doanh thu tháng 1"}`<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/close`. | 1. HTTP Status Code: `200 OK`<br>2. `result.status = "CLOSED"`, `result.closedBy` populated, `result.closedAt` recorded. | Period 1 `canClose = true`, `version = 1`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_CLS_02** | Reject closing accounting period when reconciliation has pending issues (`canClose = false`). | 1. Period has unsynchronized transactions (`canClose = false`).<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/close` with valid body. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Cannot close accounting period with unresolved reconciliation issues. | Reconciliation fails `canClose = false`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_CLS_03** | Reject closing accounting period with mismatched version (optimistic lock conflict). | 1. Prepare JSON body with stale version `{"version": 99, "reason": "Khóa kỳ"}`.<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/close`. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Version conflict on period closing. | DB version is different from 99. | Passed | 10/08/2026 | dungnthe180742 |
| **Revenue Adjustments Workflow** | | | | | | | |
| **TC_ACC_ADJ_01** | Create revenue adjustment draft successfully with valid evidence and signed amount. | 1. Prepare JSON body:<br>`{"idempotencyKey": "ADJ-2026-0001", "information": {"sourceType": "REVENUE_ADJUSTMENT", "sourceId": 1, "relatedPeriodId": null, "occurredAt": "2026-01-15T10:00:00Z", "postingDate": "2026-01-15", "signedAmount": "-50000.00", "classification": "CORRECTION", "inclusionReason": "Điều chỉnh đơn ghi thừa", "evidence": "Biên bản đối soát số 01"}}`<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments`. | 1. HTTP Status Code: `200 OK`<br>2. `result.status = "DRAFT"`, `result.signedAmount = "-50000.00"`, `result.version = 0`. | Profile 2026 exists. Key "ADJ-2026-0001" is unique. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_ADJ_02** | Update draft revenue adjustment before approval. | 1. Prepare JSON body with updated amount `"-60000.00"` and `version = 0`.<br>2. Dispatch `PUT /api/v1/accounting/tax-profiles/2026/adjustments/1`. | 1. HTTP Status Code: `200 OK`<br>2. `result.signedAmount = "-60000.00"`, `result.version` increments to 1. | Adjustment 1 exists in `DRAFT` status. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_ADJ_03** | Approve revenue adjustment successfully (`status` transitions to `APPROVED`). | 1. Prepare JSON body:<br>`{"version": 1, "reason": "Đã xác minh chứng từ đầy đủ", "acceptCrossPeriodPosting": false}`<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments/1/approve`. | 1. HTTP Status Code: `200 OK`<br>2. `result.status = "APPROVED"`, `result.approvedBy` recorded, `result.approvedAt` populated. | Adjustment 1 is in `DRAFT` status. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_ADJ_04** | Reject revenue adjustment with reason (`status` transitions to `REJECTED`). | 1. Prepare JSON body:<br>`{"version": 0, "reason": "Chứng từ không hợp lệ"}`<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments/2/reject`. | 1. HTTP Status Code: `200 OK`<br>2. `result.status = "REJECTED"`. | Adjustment 2 is in `DRAFT` status. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_ADJ_05** | Verify approved adjustment is synchronized into accounting period revenue lines. | 1. Approve adjustment ID 1 with amount `-60000.00` on posting date `2026-01-15`.<br>2. Synchronize Month 1 revenue lines.<br>3. Inspect generated revenue lines. | 1. HTTP Status Code: `200 OK`<br>2. Line created with `sourceType = "REVENUE_ADJUSTMENT"`, `signedAmount = -60000.00`, reducing total revenue. | Adjustment 1 is `APPROVED`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_ADJ_06** | Reject approving adjustment that is already approved or rejected. | 1. Adjustment ID 1 is already `APPROVED`.<br>2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments/1/approve` again. | 1. HTTP Status Code: `409 Conflict`<br>2. Error: Adjustment is not in DRAFT status. | Adjustment 1 is not `DRAFT`. | Passed | 10/08/2026 | dungnthe180742 |
| **Reports, S1a Book & Tax Notice Form 01/TKN-CNKD** | | | | | | | |
| **TC_ACC_RPT_01** | Query monthly accounting summary report (`GET /periods/summary/months/{month}`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/summary/months/1`. | 1. HTTP Status Code: `200 OK`<br>2. `result.periodType = "MONTH"`, `result.periodNumber = 1`, `result.recordedRevenue` matches sum of Month 1 lines. | Month 1 has revenue lines. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_RPT_02** | Query quarterly accounting summary report (`GET /periods/summary/quarters/{quarter}`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/summary/quarters/1`. | 1. HTTP Status Code: `200 OK`<br>2. `result.periodType = "QUARTER"`, `result.periodNumber = 1`, aggregates months 1, 2, and 3. | Q1 periods exist. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_RPT_03** | Query annual accounting summary report (`GET /periods/summary`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/summary`. | 1. HTTP Status Code: `200 OK`<br>2. `result.periodType = "YEAR"`, `result.recordedRevenue` aggregates all months of 2026. | Year 2026 periods exist. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_S1A_01** | Query S1a-HKD revenue book data JSON (`GET /{month}/tax-support/s1a`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/tax-support/s1a`. | 1. HTTP Status Code: `200 OK`<br>2. `result` contains taxpayer info, date range, total revenue, and line entries formatted for S1a book. | Period Month 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_S1A_02** | Export S1a-HKD revenue book to Excel (`GET /{month}/tax-support/s1a.xlsx`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/tax-support/s1a.xlsx`. | 1. HTTP Status Code: `200 OK`<br>2. `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`<br>3. `Content-Disposition` header: `attachment; filename="S1a-HKD-2026-1.xlsx"`. | Period Month 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_DOC_01** | Export Annual Revenue Notice Form 01/TKN-CNKD to Word document (`.docx`). | 1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/tax-support/01-tkn-cnkd.docx?periodType=YEAR`. | 1. HTTP Status Code: `200 OK`<br>2. `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`<br>3. `Content-Disposition` header: `attachment; filename="01-TKN-CNKD-2026.docx"`. | Profile 2026 is confirmed, all months reconciled, revenue <= 1 billion. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_DOC_02** | Reject Form 01/TKN-CNKD export when profile is not confirmed or reconciliation incomplete. | 1. Profile is `DRAFT` or has unreconciled periods.<br>2. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/tax-support/01-tkn-cnkd.docx`. | 1. HTTP Status Code: `409 Conflict`<br>2. Error message explaining data reconciliation is incomplete. | Profile not ready for export. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_ACC_DOC_03** | Reject Form 01/TKN-CNKD export when annual revenue exceeds 1,000,000,000 VND limit. | 1. Annual revenue of 2026 is 1,200,000,000 VND (> 1 billion VND).<br>2. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/tax-support/01-tkn-cnkd.docx`. | 1. HTTP Status Code: `409 Conflict`<br>2. Error message: Doanh thu năm vượt quá ngưỡng 1.000.000.000đ của mẫu 01/TKN-CNKD. | Annual revenue > 1 billion VND. | Passed | 10/08/2026 | dungnthe180742 |

---

### Direct TSV / Copy-Paste Text Block (for Excel)

```tsv
Test Case ID	Test Case Description	Test Case Procedure	Expected Results	Pre-conditions	Round 1	Test date	Tester
Tax Profile Management							
TC_TAX_PRF_01	Create draft tax profile for Year 2026 with initial `trackingStartedAt` timestamp.	"1. Prepare JSON body:
{""taxYear"": 2026, ""trackingStartedAt"": ""2026-01-01T00:00:00Z"", ""information"": {""taxpayerIdentity"": ""0123456789"", ""taxpayerName"": ""Nguyễn Văn A"", ""taxpayerAddress"": ""Hà Nội"", ""taxAuthority"": ""Chi cục thuế Hoàn Kiếm"", ""declaredMethod"": ""REVENUE_BASED"", ""invoiceRegistrationStatus"": ""NOT_REGISTERED""}}
2. Dispatch `POST /api/store/tax-profiles`."	"1. HTTP Status Code: `200 OK`
2. `result.taxYear = 2026`, `result.status = ""DRAFT""`, `result.version = 0`.
3. `trackingStartedAt` set to `2026-01-01T00:00:00Z`."	User authenticated with `MANAGER` role. Store has no profile for 2026.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_02	Create tax profile for next year (2027) inheriting store-wide unified `trackingStartedAt`.	"1. Prepare JSON body:
{""taxYear"": 2027, ""trackingStartedAt"": null, ""information"": {""taxpayerIdentity"": ""0123456789"", ""taxpayerName"": ""Nguyễn Văn A"", ""taxpayerAddress"": ""Hà Nội"", ""taxAuthority"": ""Chi cục thuế Hoàn Kiếm"", ""declaredMethod"": ""REVENUE_BASED"", ""invoiceRegistrationStatus"": ""NOT_REGISTERED""}}
2. Dispatch `POST /api/store/tax-profiles`."	"1. HTTP Status Code: `200 OK`
2. `result.taxYear = 2027`, `result.trackingStartedAt = ""2026-01-01T00:00:00Z""` (inherited from existing 2026 profile)."	Profile 2026 exists with start timestamp `2026-01-01`.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_03	Reject creating tax profile when tax year already exists in store (duplicate year check).	"1. Prepare JSON body with `taxYear: 2026`.
2. Dispatch `POST /api/store/tax-profiles`."	"1. HTTP Status Code: `409 Conflict`
2. Throws exception indicating tax profile for year 2026 already exists."	Profile 2026 already exists in DB.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_04	Reject creating tax profile with conflicting `trackingStartedAt` different from existing store mốc.	"1. Prepare JSON body for 2027 with `trackingStartedAt: ""2026-06-01T00:00:00Z""` (differs from 2026-01-01).
2. Dispatch `POST /api/store/tax-profiles`."	"1. HTTP Status Code: `409 Conflict`
2. Throws error indicating tracking start timestamp must match unified store timestamp."	Store has unified tracking mốc `2026-01-01`.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_05	Update draft tax profile taxpayer information successfully.	"1. Prepare JSON body:
{""version"": 0, ""information"": {""taxpayerIdentity"": ""0123456789"", ""taxpayerName"": ""Nguyễn Văn A Cập Nhật"", ""taxpayerAddress"": ""Hà Nội Mới"", ""taxAuthority"": ""Chi cục thuế Đống Đa"", ""declaredMethod"": ""REVENUE_BASED"", ""invoiceRegistrationStatus"": ""REGISTERED""}}
2. Dispatch `PUT /api/store/tax-profiles/2026`."	"1. HTTP Status Code: `200 OK`
2. `result.information.taxpayerName = ""Nguyễn Văn A Cập Nhật""`, `result.version` increments to 1."	Profile 2026 exists with `version = 0`.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_06	Confirm tax profile successfully (`status` transitions to `CONFIRMED`).	"1. Prepare JSON body: {""version"": 1}
2. Dispatch `POST /api/store/tax-profiles/2026/confirm`."	"1. HTTP Status Code: `200 OK`
2. `result.status = ""CONFIRMED""`, `result.confirmedBy` populated with manager user ID, `result.confirmedAt` recorded."	Profile 2026 exists with full valid information and `version = 1`.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_07	Reject confirming tax profile when required information is `UNKNOWN` or null.	"1. Profile 2026 has `declaredMethod = ""UNKNOWN""`.
2. Dispatch `POST /api/store/tax-profiles/2026/confirm` with `{""version"": 0}`."	"1. HTTP Status Code: `400 Bad Request`
2. Error: All tax information fields must be fully specified before confirmation."	Profile 2026 has incomplete information.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_08	Reject confirming tax profile when request version does not match DB version (Optimistic lock conflict).	"1. Prepare JSON body with stale version `{""version"": 99}`.
2. Dispatch `POST /api/store/tax-profiles/2026/confirm`."	"1. HTTP Status Code: `409 Conflict`
2. Error: Version mismatch conflict."	DB version is different from 99.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_09	Change tracking started at timestamp across all store profiles (resets confirmations to `DRAFT`).	"1. Prepare JSON body:
{""version"": 2, ""trackingStartedAt"": ""2026-03-01T00:00:00Z"", ""reason"": ""Điều chỉnh mốc bắt đầu dùng phần mềm""}
2. Dispatch `PUT /api/store/tax-profiles/2026/tracking-start`."	"1. HTTP Status Code: `200 OK`
2. All tax profiles of store have `trackingStartedAt = ""2026-03-01T00:00:00Z""`.
3. Profile statuses reset to `DRAFT` for re-confirmation."	User has `MANAGER` role. No accounting periods exist yet.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_10	Reject changing tracking start timestamp when open/closed accounting periods exist.	"1. Accounting period for Month 1 exists.
2. Dispatch `PUT /api/store/tax-profiles/2026/tracking-start` with new date."	"1. HTTP Status Code: `409 Conflict`
2. Error: Cannot change tracking start timestamp when accounting periods or adjustments exist."	Accounting period exists in DB.	Passed	10/08/2026	dungnthe180742
TC_TAX_PRF_11	Reject tax profile operations when user lacks `MANAGER` role.	"1. Authenticate as Cashier/Sales user.
2. Dispatch `GET /api/store/tax-profiles`."	1. HTTP Status Code: `403 Forbidden`.	User lacks `ROLE_MANAGER`.	Passed	10/08/2026	dungnthe180742
Accounting Period Lifecycle							
TC_ACC_PER_01	Create accounting period for Month 1 in confirmed tax profile 2026.	"1. Prepare JSON body:
{""accountingMonth"": 1, ""profileVersion"": 2}
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods`."	"1. HTTP Status Code: `200 OK`
2. `result.accountingMonth = 1`, `result.status = ""OPEN""`, `result.startAt = ""2026-01-01T00:00:00Z""`, `result.endExclusive = ""2026-02-01T00:00:00Z""`."	Profile 2026 is `CONFIRMED`. `trackingStartedAt <= 2026-01-01`.	Passed	10/08/2026	dungnthe180742
TC_ACC_PER_02	Reject creating accounting period when tax profile is still in `DRAFT` status.	"1. Profile 2026 is `DRAFT`.
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods` with `accountingMonth = 1`."	"1. HTTP Status Code: `409 Conflict`
2. Error: Tax profile must be confirmed before creating accounting periods."	Profile 2026 status is `DRAFT`.	Passed	10/08/2026	dungnthe180742
TC_ACC_PER_03	Reject creating accounting period for month prior to `trackingStartedAt`.	"1. Profile 2026 has `trackingStartedAt = ""2026-03-15T00:00:00Z""`.
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods` with `accountingMonth = 1`."	"1. HTTP Status Code: `409 Conflict` / `400 Bad Request`
2. Error: Cannot create period for month prior to tracking start mốc."	Tracking start is in March.	Passed	10/08/2026	dungnthe180742
TC_ACC_PER_04	Reject creating duplicate accounting period for same month in same year.	"1. Period Month 1 already exists.
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods` with `accountingMonth = 1`."	"1. HTTP Status Code: `409 Conflict`
2. Error: Accounting period for Month 1 already exists."	Period Month 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_ACC_PER_05	Query list of all accounting periods for a tax year.	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods`.	"1. HTTP Status Code: `200 OK`
2. `result` returns list of periods created in 2026, each containing status (`OPEN`/`CLOSED`), recorded revenue, and lock info."	Periods exist in DB.	Passed	10/08/2026	dungnthe180742
TC_ACC_PER_06	Get accounting period detail for a specific month (`GET /periods/{month}`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1`.	"1. HTTP Status Code: `200 OK`
2. `result.accountingMonth = 1`, `result.status = ""OPEN""`, returns revenue totals and reconciliation status."	Period Month 1 exists.	Passed	10/08/2026	dungnthe180742
Revenue Synchronization & Lines							
TC_ACC_REV_01	Synchronize revenue lines from sales orders and return orders into open period Month 1.	1. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines/synchronize`.	"1. HTTP Status Code: `200 OK`
2. `result.lines` populated with sales order revenue lines (`signedAmount > 0`) and return lines (`signedAmount < 0`).
3. `result.totalRevenue` equals sum of signed amounts."	Sales orders and returns exist in Month 1 date range.	Passed	10/08/2026	dungnthe180742
TC_ACC_REV_02	Verify transactions prior to `trackingStartedAt` are strictly excluded from revenue lines.	"1. Sales order created on `2025-12-31`. `trackingStartedAt = ""2026-01-01""`.
2. Dispatch synchronize on Month 1.
3. Inspect generated revenue lines."	"1. HTTP Status Code: `200 OK`
2. Sales order from 2025-12-31 is not present in revenue lines."	Historical orders exist prior to tracking start.	Passed	10/08/2026	dungnthe180742
TC_ACC_REV_03	Verify uniqueness constraint `(sourceType, sourceId)` prevents duplicate revenue lines across periods.	"1. Synchronize Month 1 revenue lines.
2. Dispatch synchronize Month 1 again.
3. Inspect total lines count in DB."	"1. HTTP Status Code: `200 OK`
2. Total revenue lines count in DB remains unchanged (idempotent synchronization)."	Period 1 synchronized previously.	Passed	10/08/2026	dungnthe180742
TC_ACC_REV_04	Reject revenue synchronization on a closed accounting period (`status = ""CLOSED""`).	"1. Period Month 1 is `CLOSED`.
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines/synchronize`."	"1. HTTP Status Code: `409 Conflict`
2. Error: Cannot synchronize revenue on closed accounting period."	Period 1 is `CLOSED`.	Passed	10/08/2026	dungnthe180742
TC_ACC_REV_05	Query list of revenue lines for an accounting period (`GET /periods/{month}/revenue-lines`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines`.	"1. HTTP Status Code: `200 OK`
2. `result.lines` returns itemized list of revenue entries with `sourceType`, `sourceCode`, `occurredAt`, `postingDate`, `signedAmount`."	Revenue lines exist in period.	Passed	10/08/2026	dungnthe180742
Reconciliation & Period Closing							
TC_ACC_REC_01	Reconcile accounting period when all source transactions match (`canClose = true`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/reconciliation`.	"1. HTTP Status Code: `200 OK`
2. `result.expectedSourceCount == result.recordedLineCount`
3. `result.expectedRevenue == result.recordedRevenue`
4. `result.sourceCompletenessVerified = true`, `result.canClose = true`, `result.issues: []`."	All sales, returns, and approved adjustments are synchronized.	Passed	10/08/2026	dungnthe180742
TC_ACC_REC_02	Reconcile accounting period with unsynchronized new sales orders (`canClose = false`).	"1. Create a new sales order in Month 1 without re-synchronizing.
2. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/reconciliation`."	"1. HTTP Status Code: `200 OK`
2. `result.sourceCompletenessVerified = false`, `result.canClose = false`
3. `result.issues` lists unrecorded source sales order."	New order created after last sync.	Passed	10/08/2026	dungnthe180742
TC_ACC_CLS_01	Close accounting period successfully when reconciliation passes (`canClose = true`).	"1. Prepare JSON body:
{""version"": 1, ""reason"": ""Đã đối chiếu đầy đủ doanh thu tháng 1""}
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/close`."	"1. HTTP Status Code: `200 OK`
2. `result.status = ""CLOSED""`, `result.closedBy` populated, `result.closedAt` recorded."	Period 1 `canClose = true`, `version = 1`.	Passed	10/08/2026	dungnthe180742
TC_ACC_CLS_02	Reject closing accounting period when reconciliation has pending issues (`canClose = false`).	"1. Period has unsynchronized transactions (`canClose = false`).
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/close` with valid body."	"1. HTTP Status Code: `409 Conflict`
2. Error: Cannot close accounting period with unresolved reconciliation issues."	Reconciliation fails `canClose = false`.	Passed	10/08/2026	dungnthe180742
TC_ACC_CLS_03	Reject closing accounting period with mismatched version (optimistic lock conflict).	"1. Prepare JSON body with stale version `{""version"": 99, ""reason"": ""Khóa kỳ""}`.
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/periods/1/close`."	"1. HTTP Status Code: `409 Conflict`
2. Error: Version conflict on period closing."	DB version is different from 99.	Passed	10/08/2026	dungnthe180742
Revenue Adjustments Workflow							
TC_ACC_ADJ_01	Create revenue adjustment draft successfully with valid evidence and signed amount.	"1. Prepare JSON body:
{""idempotencyKey"": ""ADJ-2026-0001"", ""information"": {""sourceType"": ""REVENUE_ADJUSTMENT"", ""sourceId"": 1, ""relatedPeriodId"": null, ""occurredAt"": ""2026-01-15T10:00:00Z"", ""postingDate"": ""2026-01-15"", ""signedAmount"": ""-50000.00"", ""classification"": ""CORRECTION"", ""inclusionReason"": ""Điều chỉnh đơn ghi thừa"", ""evidence"": ""Biên bản đối soát số 01""}}
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments`."	"1. HTTP Status Code: `200 OK`
2. `result.status = ""DRAFT""`, `result.signedAmount = ""-50000.00""`, `result.version = 0`."	Profile 2026 exists. Key "ADJ-2026-0001" is unique.	Passed	10/08/2026	dungnthe180742
TC_ACC_ADJ_02	Update draft revenue adjustment before approval.	"1. Prepare JSON body with updated amount `""-60000.00""` and `version = 0`.
2. Dispatch `PUT /api/v1/accounting/tax-profiles/2026/adjustments/1`."	"1. HTTP Status Code: `200 OK`
2. `result.signedAmount = ""-60000.00""`, `result.version` increments to 1."	Adjustment 1 exists in `DRAFT` status.	Passed	10/08/2026	dungnthe180742
TC_ACC_ADJ_03	Approve revenue adjustment successfully (`status` transitions to `APPROVED`).	"1. Prepare JSON body:
{""version"": 1, ""reason"": ""Đã xác minh chứng từ đầy đủ"", ""acceptCrossPeriodPosting"": false}
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments/1/approve`."	"1. HTTP Status Code: `200 OK`
2. `result.status = ""APPROVED""`, `result.approvedBy` recorded, `result.approvedAt` populated."	Adjustment 1 is in `DRAFT` status.	Passed	10/08/2026	dungnthe180742
TC_ACC_ADJ_04	Reject revenue adjustment with reason (`status` transitions to `REJECTED`).	"1. Prepare JSON body:
{""version"": 0, ""reason"": ""Chứng từ không hợp lệ""}
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments/2/reject`."	"1. HTTP Status Code: `200 OK`
2. `result.status = ""REJECTED""`."	Adjustment 2 is in `DRAFT` status.	Passed	10/08/2026	dungnthe180742
TC_ACC_ADJ_05	Verify approved adjustment is synchronized into accounting period revenue lines.	"1. Approve adjustment ID 1 with amount `-60000.00` on posting date `2026-01-15`.
2. Synchronize Month 1 revenue lines.
3. Inspect generated revenue lines."	"1. HTTP Status Code: `200 OK`
2. Line created with `sourceType = ""REVENUE_ADJUSTMENT""`, `signedAmount = -60000.00`, reducing total revenue."	Adjustment 1 is `APPROVED`.	Passed	10/08/2026	dungnthe180742
TC_ACC_ADJ_06	Reject approving adjustment that is already approved or rejected.	"1. Adjustment ID 1 is already `APPROVED`.
2. Dispatch `POST /api/v1/accounting/tax-profiles/2026/adjustments/1/approve` again."	"1. HTTP Status Code: `409 Conflict`
2. Error: Adjustment is not in DRAFT status."	Adjustment 1 is not `DRAFT`.	Passed	10/08/2026	dungnthe180742
Reports, S1a Book & Tax Notice Form 01/TKN-CNKD							
TC_ACC_RPT_01	Query monthly accounting summary report (`GET /periods/summary/months/{month}`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/summary/months/1`.	"1. HTTP Status Code: `200 OK`
2. `result.periodType = ""MONTH""`, `result.periodNumber = 1`, `result.recordedRevenue` matches sum of Month 1 lines."	Month 1 has revenue lines.	Passed	10/08/2026	dungnthe180742
TC_ACC_RPT_02	Query quarterly accounting summary report (`GET /periods/summary/quarters/{quarter}`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/summary/quarters/1`.	"1. HTTP Status Code: `200 OK`
2. `result.periodType = ""QUARTER""`, `result.periodNumber = 1`, aggregates months 1, 2, and 3."	Q1 periods exist.	Passed	10/08/2026	dungnthe180742
TC_ACC_RPT_03	Query annual accounting summary report (`GET /periods/summary`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/summary`.	"1. HTTP Status Code: `200 OK`
2. `result.periodType = ""YEAR""`, `result.recordedRevenue` aggregates all months of 2026."	Year 2026 periods exist.	Passed	10/08/2026	dungnthe180742
TC_ACC_S1A_01	Query S1a-HKD revenue book data JSON (`GET /{month}/tax-support/s1a`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/tax-support/s1a`.	"1. HTTP Status Code: `200 OK`
2. `result` contains taxpayer info, date range, total revenue, and line entries formatted for S1a book."	Period Month 1 exists.	Passed	10/08/2026	dungnthe180742
TC_ACC_S1A_02	Export S1a-HKD revenue book to Excel (`GET /{month}/tax-support/s1a.xlsx`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/1/tax-support/s1a.xlsx`.	"1. HTTP Status Code: `200 OK`
2. `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
3. `Content-Disposition` header: `attachment; filename=""S1a-HKD-2026-1.xlsx""`."	Period Month 1 exists.	Passed	10/08/2026	dungnthe180742
TC_ACC_DOC_01	Export Annual Revenue Notice Form 01/TKN-CNKD to Word document (`.docx`).	1. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/tax-support/01-tkn-cnkd.docx?periodType=YEAR`.	"1. HTTP Status Code: `200 OK`
2. `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. `Content-Disposition` header: `attachment; filename=""01-TKN-CNKD-2026.docx""`."	Profile 2026 is confirmed, all months reconciled, revenue <= 1 billion.	Passed	10/08/2026	dungnthe180742
TC_ACC_DOC_02	Reject Form 01/TKN-CNKD export when profile is not confirmed or reconciliation incomplete.	"1. Profile is `DRAFT` or has unreconciled periods.
2. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/tax-support/01-tkn-cnkd.docx`."	"1. HTTP Status Code: `409 Conflict`
2. Error message explaining data reconciliation is incomplete."	Profile not ready for export.	Passed	10/08/2026	dungnthe180742
TC_ACC_DOC_03	Reject Form 01/TKN-CNKD export when annual revenue exceeds 1,000,000,000 VND limit.	"1. Annual revenue of 2026 is 1,200,000,000 VND (> 1 billion VND).
2. Dispatch `GET /api/v1/accounting/tax-profiles/2026/periods/tax-support/01-tkn-cnkd.docx`."	"1. HTTP Status Code: `409 Conflict`
2. Error message: Doanh thu năm vượt quá ngưỡng 1.000.000.000đ của mẫu 01/TKN-CNKD."	Annual revenue > 1 billion VND.	Passed	10/08/2026	dungnthe180742
```
