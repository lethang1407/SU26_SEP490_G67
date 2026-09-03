# Integration Test Cases - Customer Debt Payment Management (`DebtPaymentController`)

### 📋 Controller Overview & Test Objectives (Mô tả Controller & Mục tiêu Kiểm thử)

| Mục | Chi tiết |
| :--- | :--- |
| **Controller** | `DebtPaymentController` (`project.be_sep490_g67.controller.DebtPaymentController`) |
| **Base API Path** | `/api/debt-payments` |
| **Mô tả nghiệp vụ** | Quản lý nghiệp vụ thu hồi công nợ khách hàng trong tiệm tạp hóa / siêu thị mini. Hỗ trợ thu nợ cho từng hóa đơn lẻ hoặc thu gộp nhiều hóa đơn của cùng một khách theo cơ chế phân bổ cuốn chiếu (FIFO), theo dõi sổ quỹ thu nợ và tổng hợp tiền thu trong ngày. |
| **Phạm vi API kiểm thử** | **1. `POST /api/debt-payments`**: Ghi nhận phiếu thu nợ cho 1 đơn hàng nợ cụ thể (tiền mặt / chuyển khoản), tự sinh mã phiếu thu `TN-ddMMyy-XXX`, cấn trừ nợ đơn hàng và giảm nợ tổng của khách hàng.<br>**2. `POST /api/debt-payments/batch`**: Thu nợ hàng loạt cho nhiều đơn nợ của cùng một khách hàng, phân bổ số tiền trả theo thứ tự thời gian tạo đơn (FIFO), kiểm tra tính hợp lệ của danh sách đơn hàng.<br>**3. `GET /api/debt-payments`**: Lấy lịch sử thu nợ phân trang, lọc đa chiều theo khoảng ngày (`startDate`, `endDate`), theo khách hàng (`customerId`), nhân viên thu ngân (`staffId`), tìm kiếm theo từ khóa (`keyword`).<br>**4. `GET /api/debt-payments/today`**: Lấy danh sách thu nợ phát sinh trong ngày hiện tại gom nhóm theo khách hàng. |
| **Mục tiêu Integration Test** | Xác thực luồng thu nợ đơn lẻ/gộp (FIFO), đảm bảo không thu vượt nợ hoặc thu trên đơn đã tất toán, và kiểm tra tính chính xác của lịch sử phiếu thu. |

> **Note**: File này được tổng hợp và chuẩn hóa theo đúng cấu trúc bảng yêu cầu: `Test Case ID`, `Test Case Description`, `Test Case Procedure`, `Expected Results`, `Pre-conditions`, `Round 1`, `Test date`, `Tester`. Bạn có thể sao chép trực tiếp dữ liệu từ các bảng dưới đây vào file Excel.

---

### Bảng Thông Tin Module (Sheet Header)

| Attribute | Value |
| :--- | :--- |
| **Feature** | Debt Payment Management (`DebtPaymentController`) |
| **Test requirement** | Standardized integration tests for all 4 API endpoints in `DebtPaymentController`: single order debt settlement with auto-generated receipt code, batch debt settlement across multiple orders with FIFO allocation and single-customer validation, multi-filter debt payment history, and today's grouped payment summaries. |
| **Number of TCs** | 28 |
| **Testing Round** | Passed: 28 \| Failed: 0 \| Pending: 0 \| N/A: 0 |

---

### Bảng Integration Test Cases (`DebtPaymentController`)

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Single Debt Payment** | | | | | | | |
| **TC_PAY_SNG_01** | Record single debt payment successfully via Cash (`amountPaid <= remainingDebt`). | 1. Prepare JSON body:<br>`{"salesOrderId": 100, "amountPaid": 200000, "paymentMethod": "CASH", "note": "Khách trả một phần nợ"}`<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Tạo thanh toán công nợ thành công"`<br>3. `result` contains auto-generated `paymentCode` (ví dụ: `TN-300826-001`), `amountPaid: 200000.00`, `paymentMethod: "CASH"`, `staffName`.<br>4. In DB, customer `totalDebt` reduced by 200,000 VND; `DebtPayment` record created. | User authenticated. SalesOrder 100 exists with `isDebt = true`, remaining debt = 500,000 VND. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_02** | Record single debt payment successfully via Bank Transfer (`paymentMethod = BANK`). | 1. Prepare JSON body:<br>`{"salesOrderId": 100, "amountPaid": 150000, "paymentMethod": "BANK", "note": "Chuyển khoản Vietcombank"}`<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `200 OK`<br>2. `result.paymentMethod = "BANK"`, `result.amountPaid = 150000.00`.<br>3. DB records new payment entry. | User authenticated. SalesOrder 100 has remaining debt >= 150,000 VND. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_03** | Record single debt payment with exact full settlement (`amountPaid == remainingDebt`). | 1. Prepare JSON body with `amountPaid = 500000` for order with remaining debt = 500,000 VND.<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `200 OK`<br>2. Order remaining debt becomes `0.00`.<br>3. Customer total debt reduced accordingly. | SalesOrder 100 remaining debt = 500,000 VND. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_04** | Reject debt payment when `salesOrderId` does not exist in DB (ID 99999). | 1. Prepare JSON body: `{"salesOrderId": 99999, "amountPaid": 100000, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.ORDER_NOT_FOUND)` ("Không tìm thấy đơn hàng"). | SalesOrder ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_05** | Reject debt payment when sales order is not a debt order (`isDebt = false`). | 1. Prepare JSON body: `{"salesOrderId": 101, "amountPaid": 100000, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.ORDER_IS_NOT_A_DEBT_ORDER)` ("Đơn hàng không phải là đơn hàng nợ"). | SalesOrder ID 101 exists with `isDebt = false`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_06** | Reject debt payment when `amountPaid` is zero or negative (`amountPaid = 0`). | 1. Prepare JSON body: `{"salesOrderId": 100, "amountPaid": 0, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error / `AppException(ErrorCode.INVALID_PAYMENT_AMOUNT)` ("Số tiền thanh toán không hợp lệ"). | SalesOrder 100 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_07** | Reject debt payment when `amountPaid` exceeds order's remaining debt (`amountPaid > remainingDebt`). | 1. Prepare JSON body: `{"salesOrderId": 100, "amountPaid": 1000000, "paymentMethod": "CASH"}` for order with remaining debt = 500,000 VND.<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_REMAINING_DEBT)` ("Số tiền thanh toán vượt quá số nợ còn lại"). | SalesOrder 100 remaining debt = 500,000 VND (< 1,000,000 VND). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_08** | Reject debt payment when order debt has already been fully settled (`remainingDebt == 0`). | 1. Prepare JSON body for already paid order: `{"salesOrderId": 102, "amountPaid": 50000, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.DEBT_ORDER_ALREADY_SETTLED)` ("Đơn hàng này đã trả hết nợ"). | SalesOrder 102 has remaining debt = 0.00. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_SNG_09** | Reject debt payment when required fields are null (`salesOrderId = null` or `paymentMethod = null`). | 1. Prepare JSON body: `{"salesOrderId": null, "amountPaid": 100000, "paymentMethod": null}`<br>2. Dispatch `POST /api/debt-payments`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error thrown on `@NotNull`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **Batch Debt Payment** | | | | | | | |
| **TC_PAY_BAT_01** | Record batch debt payment across multiple orders of same customer successfully (FIFO allocation). | 1. Prepare JSON body:<br>`{"salesOrderIds": [100, 103], "amountPaid": 800000, "paymentMethod": "CASH", "note": "Thu nợ 2 đơn"}`<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Thanh toán công nợ thành công"`<br>3. `result.customerId = 1`, `result.totalPaidAmount = 800000.00`<br>4. `result.paymentDetails` contains 2 payment items allocated by FIFO: Order 100 settled 500k, Order 103 settled 300k.<br>5. DB creates 2 `DebtPayment` records with sequenced codes `TN-300826-001`, `TN-300826-002`. | Customer 1 has Order 100 (debt 500k) and Order 103 (debt 500k). Total debt = 1,000,000 VND. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_02** | Record batch debt payment with exact full settlement of all selected orders. | 1. Prepare JSON body with `amountPaid = 1000000` for orders with total remaining debt = 1,000,000 VND.<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `200 OK`<br>2. All selected orders are fully settled (`remainingDebt = 0.00`).<br>3. Customer debt reduced by 1,000,000 VND. | Customer 1 has 2 orders totaling exactly 1,000,000 VND remaining debt. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_03** | Record batch debt payment with partial payment covering first order fully and second order partially. | 1. Prepare JSON body: `{"salesOrderIds": [100, 103], "amountPaid": 600000, "paymentMethod": "BANK"}`<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `200 OK`<br>2. `paymentDetails` shows: Order 100 paid 500,000 (fully paid), Order 103 paid 100,000 (remaining 400,000). | Order 100 debt 500k, Order 103 debt 500k. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_04** | Reject batch payment when `salesOrderIds` is empty or null. | 1. Prepare JSON body: `{"salesOrderIds": [], "amountPaid": 500000, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Danh sách đơn nợ không được để trống"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_05** | Reject batch payment when `amountPaid` is zero or negative. | 1. Prepare JSON body: `{"salesOrderIds": [100], "amountPaid": 0, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Số tiền trả phải lớn hơn 0"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_06** | Reject batch payment when one or more order IDs do not exist in DB. | 1. Prepare JSON body: `{"salesOrderIds": [100, 99999], "amountPaid": 500000, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.ORDER_NOT_FOUND)`. | Order ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_07** | Reject batch payment when selected orders belong to different customers. | 1. Prepare JSON body with Order 100 (Customer 1) and Order 200 (Customer 2): `{"salesOrderIds": [100, 200], "amountPaid": 500000, "paymentMethod": "CASH"}`<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.DEBT_PAYMENT_ORDERS_DIFFERENT_CUSTOMERS)` ("Chỉ được thanh toán nhiều đơn nợ của cùng một khách hàng"). | Order 100 belongs to Customer 1, Order 200 belongs to Customer 2. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_08** | Reject batch payment when `amountPaid` exceeds total remaining debt of selected orders. | 1. Prepare JSON body: `{"salesOrderIds": [100, 103], "amountPaid": 1500000, "paymentMethod": "CASH"}` where total remaining debt = 1,000,000 VND.<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_REMAINING_DEBT)`. | Total debt of selected orders is 1,000,000 VND (< 1,500,000 VND). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_BAT_09** | Reject batch payment when all selected orders are already fully settled. | 1. Prepare JSON body: `{"salesOrderIds": [102], "amountPaid": 100000, "paymentMethod": "CASH"}` where Order 102 has remaining debt = 0.<br>2. Dispatch `POST /api/debt-payments/batch`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.DEBT_ORDER_ALREADY_SETTLED)`. | Order 102 remaining debt = 0.00. | Passed | 10/08/2026 | dungnthe180742 |
| **Debt Payment History** | | | | | | | |
| **TC_PAY_HIS_01** | Query debt payment history with default pagination (page 1, size 10). | 1. Dispatch `GET /api/debt-payments`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy lịch sử thu nợ thành công"`<br>3. `result.content` returns up to 10 payment records sorted by `createdAt` DESC.<br>4. `result.page = 1`, `result.size = 10`, `result.totalElements` and `result.totalPages` correctly populated. | User authenticated. Database contains active debt payment records. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_HIS_02** | Filter debt payment history by date range (`startDate`, `endDate`). | 1. Dispatch `GET /api/debt-payments?startDate=2026-08-01&endDate=2026-08-25`<br>2. Inspect response items. | 1. HTTP Status Code: `200 OK`<br>2. `result.content` contains only payments recorded between 2026-08-01 00:00:00 and 2026-08-25 23:59:59 (+7). | Payments exist within and outside the date range. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_HIS_03** | Filter debt payment history by specific customer ID (`customerId = 1`). | 1. Dispatch `GET /api/debt-payments?customerId=1`<br>2. Inspect response items. | 1. HTTP Status Code: `200 OK`<br>2. All returned payment records have `customerId = 1`. | Customer ID 1 has recorded payments in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_HIS_04** | Filter debt payment history by collecting staff ID (`staffId = 2`). | 1. Dispatch `GET /api/debt-payments?staffId=2`<br>2. Inspect response items. | 1. HTTP Status Code: `200 OK`<br>2. All returned payment records were collected by Staff ID 2. | Staff ID 2 has collected payments in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_HIS_05** | Search debt payment history by payment code keyword (`keyword = "TN-300826"`). | 1. Dispatch `GET /api/debt-payments?keyword=TN-300826`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. `result.content` returns payment records matching code "TN-300826". | Payments with prefix "TN-300826" exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_HIS_06** | Query debt payment history combining date range, customerId, and keyword. | 1. Dispatch `GET /api/debt-payments?startDate=2026-08-01&endDate=2026-08-30&customerId=1&keyword=TN-300826`. | 1. HTTP Status Code: `200 OK`<br>2. Result strictly matches all applied filter criteria simultaneously. | Database contains matching composite data. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_HIS_07** | Search debt payment history with non-matching keyword (`keyword = "KHONG_TON_TAI"`). | 1. Dispatch `GET /api/debt-payments?keyword=KHONG_TON_TAI`. | 1. HTTP Status Code: `200 OK`<br>2. `result.content: []`, `result.totalElements = 0`, `result.totalPages = 0`. | No payment records match keyword. | Passed | 10/08/2026 | dungnthe180742 |
| **Today's Debt Payments Summary** | | | | | | | |
| **TC_PAY_TDY_01** | Query today's debt payments grouped by customer when payments occurred today. | 1. Dispatch `GET /api/debt-payments/today`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy danh sách thu nợ trong ngày thành công"`<br>3. `result.content` returns list of `TodaysDebtPaymentSummaryResponse` grouped by `customerId`, each containing customer name and nested `debtPaymentDetails`. | Payments recorded today in DB across one or more customers. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_TDY_02** | Query today's debt payments when no payments were recorded today. | 1. Dispatch `GET /api/debt-payments/today`<br>2. Inspect response payload. | 1. HTTP Status Code: `200 OK`<br>2. `result.content: []`, `result.totalElements = 0`, `result.totalPages = 0`. | No debt payments recorded today in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_PAY_TDY_03** | Query today's debt payments with pagination parameters (page 1, size 5). | 1. Dispatch `GET /api/debt-payments/today?page=1&size=5`<br>2. Inspect pagination fields. | 1. HTTP Status Code: `200 OK`<br>2. `result.page = 1`, `result.size = 5`, `result.content` contains up to 5 customer payment groups. | More than 5 customer groups paid today in DB. | Passed | 10/08/2026 | dungnthe180742 |

---

### Direct TSV / Copy-Paste Text Block (for Excel)

```tsv
Test Case ID	Test Case Description	Test Case Procedure	Expected Results	Pre-conditions	Round 1	Test date	Tester
Single Debt Payment							
TC_PAY_SNG_01	Record single debt payment successfully via Cash (`amountPaid <= remainingDebt`).	"1. Prepare JSON body:
{""salesOrderId"": 100, ""amountPaid"": 200000, ""paymentMethod"": ""CASH"", ""note"": ""Khách trả một phần nợ""}
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Tạo thanh toán công nợ thành công""`
3. `result` contains auto-generated `paymentCode` (ví dụ: `TN-300826-001`), `amountPaid: 200000.00`, `paymentMethod: ""CASH""`, `staffName`.
4. In DB, customer `totalDebt` reduced by 200,000 VND; `DebtPayment` record created."	User authenticated. SalesOrder 100 exists with `isDebt = true`, remaining debt = 500,000 VND.	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_02	Record single debt payment successfully via Bank Transfer (`paymentMethod = BANK`).	"1. Prepare JSON body:
{""salesOrderId"": 100, ""amountPaid"": 150000, ""paymentMethod"": ""BANK"", ""note"": ""Chuyển khoản Vietcombank""}
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `200 OK`
2. `result.paymentMethod = ""BANK""`, `result.amountPaid = 150000.00`.
3. DB records new payment entry."	User authenticated. SalesOrder 100 has remaining debt >= 150,000 VND.	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_03	Record single debt payment with exact full settlement (`amountPaid == remainingDebt`).	"1. Prepare JSON body with `amountPaid = 500000` for order with remaining debt = 500,000 VND.
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `200 OK`
2. Order remaining debt becomes `0.00`.
3. Customer total debt reduced accordingly."	SalesOrder 100 remaining debt = 500,000 VND.	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_04	Reject debt payment when `salesOrderId` does not exist in DB (ID 99999).	"1. Prepare JSON body: {""salesOrderId"": 99999, ""amountPaid"": 100000, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.ORDER_NOT_FOUND)` (""Không tìm thấy đơn hàng"")."	SalesOrder ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_05	Reject debt payment when sales order is not a debt order (`isDebt = false`).	"1. Prepare JSON body: {""salesOrderId"": 101, ""amountPaid"": 100000, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.ORDER_IS_NOT_A_DEBT_ORDER)` (""Đơn hàng không phải là đơn hàng nợ"")."	SalesOrder ID 101 exists with `isDebt = false`.	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_06	Reject debt payment when `amountPaid` is zero or negative (`amountPaid = 0`).	"1. Prepare JSON body: {""salesOrderId"": 100, ""amountPaid"": 0, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error / `AppException(ErrorCode.INVALID_PAYMENT_AMOUNT)` (""Số tiền thanh toán không hợp lệ"")."	SalesOrder 100 exists.	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_07	Reject debt payment when `amountPaid` exceeds order's remaining debt (`amountPaid > remainingDebt`).	"1. Prepare JSON body: {""salesOrderId"": 100, ""amountPaid"": 1000000, ""paymentMethod"": ""CASH""} for order with remaining debt = 500,000 VND.
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_REMAINING_DEBT)` (""Số tiền thanh toán vượt quá số nợ còn lại"")."	SalesOrder 100 remaining debt = 500,000 VND (< 1,000,000 VND).	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_08	Reject debt payment when order debt has already been fully settled (`remainingDebt == 0`).	"1. Prepare JSON body for already paid order: {""salesOrderId"": 102, ""amountPaid"": 50000, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.DEBT_ORDER_ALREADY_SETTLED)` (""Đơn hàng này đã trả hết nợ"")."	SalesOrder 102 has remaining debt = 0.00.	Passed	10/08/2026	dungnthe180742
TC_PAY_SNG_09	Reject debt payment when required fields are null (`salesOrderId = null` or `paymentMethod = null`).	"1. Prepare JSON body: {""salesOrderId"": null, ""amountPaid"": 100000, ""paymentMethod"": null}
2. Dispatch `POST /api/debt-payments`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error thrown on `@NotNull`."	User authenticated.	Passed	10/08/2026	dungnthe180742
Batch Debt Payment							
TC_PAY_BAT_01	Record batch debt payment across multiple orders of same customer successfully (FIFO allocation).	"1. Prepare JSON body:
{""salesOrderIds"": [100, 103], ""amountPaid"": 800000, ""paymentMethod"": ""CASH"", ""note"": ""Thu nợ 2 đơn""}
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Thanh toán công nợ thành công""`
3. `result.customerId = 1`, `result.totalPaidAmount = 800000.00`
4. `result.paymentDetails` contains 2 payment items allocated by FIFO: Order 100 settled 500k, Order 103 settled 300k.
5. DB creates 2 `DebtPayment` records with sequenced codes `TN-300826-001`, `TN-300826-002`."	Customer 1 has Order 100 (debt 500k) and Order 103 (debt 500k). Total debt = 1,000,000 VND.	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_02	Record batch debt payment with exact full settlement of all selected orders.	"1. Prepare JSON body with `amountPaid = 1000000` for orders with total remaining debt = 1,000,000 VND.
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `200 OK`
2. All selected orders are fully settled (`remainingDebt = 0.00`).
3. Customer debt reduced by 1,000,000 VND."	Customer 1 has 2 orders totaling exactly 1,000,000 VND remaining debt.	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_03	Record batch debt payment with partial payment covering first order fully and second order partially.	"1. Prepare JSON body: {""salesOrderIds"": [100, 103], ""amountPaid"": 600000, ""paymentMethod"": ""BANK""}
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `200 OK`
2. `paymentDetails` shows: Order 100 paid 500,000 (fully paid), Order 103 paid 100,000 (remaining 400,000)."	Order 100 debt 500k, Order 103 debt 500k.	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_04	Reject batch payment when `salesOrderIds` is empty or null.	"1. Prepare JSON body: {""salesOrderIds"": [], ""amountPaid"": 500000, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Danh sách đơn nợ không được để trống""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_05	Reject batch payment when `amountPaid` is zero or negative.	"1. Prepare JSON body: {""salesOrderIds"": [100], ""amountPaid"": 0, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Số tiền trả phải lớn hơn 0""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_06	Reject batch payment when one or more order IDs do not exist in DB.	"1. Prepare JSON body: {""salesOrderIds"": [100, 99999], ""amountPaid"": 500000, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.ORDER_NOT_FOUND)`."	Order ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_07	Reject batch payment when selected orders belong to different customers.	"1. Prepare JSON body with Order 100 (Customer 1) and Order 200 (Customer 2): {""salesOrderIds"": [100, 200], ""amountPaid"": 500000, ""paymentMethod"": ""CASH""}
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.DEBT_PAYMENT_ORDERS_DIFFERENT_CUSTOMERS)` (""Chỉ được thanh toán nhiều đơn nợ của cùng một khách hàng"")."	Order 100 belongs to Customer 1, Order 200 belongs to Customer 2.	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_08	Reject batch payment when `amountPaid` exceeds total remaining debt of selected orders.	"1. Prepare JSON body: {""salesOrderIds"": [100, 103], ""amountPaid"": 1500000, ""paymentMethod"": ""CASH""} where total remaining debt = 1,000,000 VND.
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.PAYMENT_AMOUNT_EXCEEDS_REMAINING_DEBT)`."	Total debt of selected orders is 1,000,000 VND (< 1,500,000 VND).	Passed	10/08/2026	dungnthe180742
TC_PAY_BAT_09	Reject batch payment when all selected orders are already fully settled.	"1. Prepare JSON body: {""salesOrderIds"": [102], ""amountPaid"": 100000, ""paymentMethod"": ""CASH""} where Order 102 has remaining debt = 0.
2. Dispatch `POST /api/debt-payments/batch`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.DEBT_ORDER_ALREADY_SETTLED)`."	Order 102 remaining debt = 0.00.	Passed	10/08/2026	dungnthe180742
Debt Payment History							
TC_PAY_HIS_01	Query debt payment history with default pagination (page 1, size 10).	"1. Dispatch `GET /api/debt-payments`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy lịch sử thu nợ thành công""`
3. `result.content` returns up to 10 payment records sorted by `createdAt` DESC.
4. `result.page = 1`, `result.size = 10`, `result.totalElements` and `result.totalPages` correctly populated."	User authenticated. Database contains active debt payment records.	Passed	10/08/2026	dungnthe180742
TC_PAY_HIS_02	Filter debt payment history by date range (`startDate`, `endDate`).	"1. Dispatch `GET /api/debt-payments?startDate=2026-08-01&endDate=2026-08-25`
2. Inspect response items."	"1. HTTP Status Code: `200 OK`
2. `result.content` contains only payments recorded between 2026-08-01 00:00:00 and 2026-08-25 23:59:59 (+7)."	Payments exist within and outside the date range.	Passed	10/08/2026	dungnthe180742
TC_PAY_HIS_03	Filter debt payment history by specific customer ID (`customerId = 1`).	"1. Dispatch `GET /api/debt-payments?customerId=1`
2. Inspect response items."	"1. HTTP Status Code: `200 OK`
2. All returned payment records have `customerId = 1`."	Customer ID 1 has recorded payments in DB.	Passed	10/08/2026	dungnthe180742
TC_PAY_HIS_04	Filter debt payment history by collecting staff ID (`staffId = 2`).	"1. Dispatch `GET /api/debt-payments?staffId=2`
2. Inspect response items."	"1. HTTP Status Code: `200 OK`
2. All returned payment records were collected by Staff ID 2."	Staff ID 2 has collected payments in DB.	Passed	10/08/2026	dungnthe180742
TC_PAY_HIS_05	Search debt payment history by payment code keyword (`keyword = ""TN-300826""`).	"1. Dispatch `GET /api/debt-payments?keyword=TN-300826`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. `result.content` returns payment records matching code ""TN-300826""."	Payments with prefix "TN-300826" exist in DB.	Passed	10/08/2026	dungnthe180742
TC_PAY_HIS_06	Query debt payment history combining date range, customerId, and keyword.	1. Dispatch `GET /api/debt-payments?startDate=2026-08-01&endDate=2026-08-30&customerId=1&keyword=TN-300826`.	"1. HTTP Status Code: `200 OK`
2. Result strictly matches all applied filter criteria simultaneously."	Database contains matching composite data.	Passed	10/08/2026	dungnthe180742
TC_PAY_HIS_07	Search debt payment history with non-matching keyword (`keyword = ""KHONG_TON_TAI""`).	1. Dispatch `GET /api/debt-payments?keyword=KHONG_TON_TAI`.	"1. HTTP Status Code: `200 OK`
2. `result.content: []`, `result.totalElements = 0`, `result.totalPages = 0`."	No payment records match keyword.	Passed	10/08/2026	dungnthe180742
Today's Debt Payments Summary							
TC_PAY_TDY_01	Query today's debt payments grouped by customer when payments occurred today.	"1. Dispatch `GET /api/debt-payments/today`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy danh sách thu nợ trong ngày thành công""`
3. `result.content` returns list of `TodaysDebtPaymentSummaryResponse` grouped by `customerId`, each containing customer name and nested `debtPaymentDetails`."	Payments recorded today in DB across one or more customers.	Passed	10/08/2026	dungnthe180742
TC_PAY_TDY_02	Query today's debt payments when no payments were recorded today.	"1. Dispatch `GET /api/debt-payments/today`
2. Inspect response payload."	"1. HTTP Status Code: `200 OK`
2. `result.content: []`, `result.totalElements = 0`, `result.totalPages = 0`."	No debt payments recorded today in DB.	Passed	10/08/2026	dungnthe180742
TC_PAY_TDY_03	Query today's debt payments with pagination parameters (page 1, size 5).	"1. Dispatch `GET /api/debt-payments/today?page=1&size=5`
2. Inspect pagination fields."	"1. HTTP Status Code: `200 OK`
2. `result.page = 1`, `result.size = 5`, `result.content` contains up to 5 customer payment groups."	More than 5 customer groups paid today in DB.	Passed	10/08/2026	dungnthe180742
```
