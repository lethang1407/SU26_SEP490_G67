# Integration Test Cases - Customer Management (`CustomerController`)

### 📋 Controller Overview & Test Objectives (Mô tả Controller & Mục tiêu Kiểm thử)

| Mục | Chi tiết |
| :--- | :--- |
| **Controller** | `CustomerController` (`project.be_sep490_g67.controller.CustomerController`) |
| **Base API Path** | `/api/customers` |
| **Mô tả nghiệp vụ** | Quản lý thông tin khách hàng, chính sách công nợ khách lẻ/khách quen, theo dõi trạng thái nợ, cảnh báo nợ xấu/nợ quá hạn và lịch sử hóa đơn ghi nợ tại quầy thu ngân tiệm tạp hóa. |
| **Phạm vi API kiểm thử** | **1. `GET /api/customers/phone-lookup`**: Tra cứu nhanh khách hàng qua số điện thoại phục vụ bán hàng POS.<br>**2. `GET /api/customers/overview`**: Thống kê tổng quan công nợ hệ thống, số tiền thu trong ngày, cảnh báo khách nợ mới do nhân viên tạo.<br>**3. `POST /api/customers`**: Thêm mới khách hàng, phân quyền tự động cờ duyệt nợ (`isCheckUnstableDebt = false` cho Admin, `true` cho Staff), validate trùng SĐT.<br>**4. `GET /api/customers/debts`**: Lấy danh sách công nợ đa bộ lọc (`keyword`, `status`, `allowDebt`, `fromDate`, `toDate`, `isOverdue`) và sắp xếp ưu tiên (`sortBy = priority`).<br>**5. `GET /api/customers/{id}`**: Lấy chi tiết thông tin khách hàng kèm tính toán trạng thái nợ và hóa đơn quá hạn.<br>**6. `GET /api/customers/{customerId}/debt-orders`**: Lấy danh sách hóa đơn bán nợ của khách hàng kèm tiền đã trả và nợ còn lại.<br>**7. `PUT /api/customers/{id}`**: Cập nhật thông tin khách hàng, quyền cho phép nợ (`allowDebt`), kiểm tra trùng SĐT.<br>**8. `PATCH /api/customers/{id}/check-unstable-debt`**: Quản lý duyệt/bỏ cờ rà soát công nợ bất thường của khách hàng.<br>**9. `GET /api/customers/today-debt-summary`**: Lấy tổng hợp bán nợ trong ngày gom nhóm theo khách hàng. |
| **Mục tiêu Integration Test** | Xác thực tra cứu khách hàng, tổng quan công nợ, phân quyền duyệt nợ nhân viên, sắp xếp ưu tiên và theo dõi đơn nợ/quá hạn. |

> **Note**: File này được tổng hợp và chuẩn hóa theo đúng cấu trúc bảng yêu cầu: `Test Case ID`, `Test Case Description`, `Test Case Procedure`, `Expected Results`, `Pre-conditions`, `Round 1`, `Test date`, `Tester`. Bạn có thể sao chép trực tiếp dữ liệu từ các bảng dưới đây vào file Excel.

---

### Bảng Thông Tin Module (Sheet Header)

| Attribute | Value |
| :--- | :--- |
| **Feature** | Customer Management (`CustomerController`) |
| **Test requirement** | Standardized integration tests for all 9 API endpoints in `CustomerController`: phone quick lookup, debt overview, customer creation with debt flag validation, customer debt listing/search/filtering/priority sorting, customer detail retrieval, customer debt order history, customer information update, debt unstable review toggle, and today debt sales summary. |
| **Number of TCs** | 35 |
| **Testing Round** | Passed: 35 \| Failed: 0 \| Pending: 0 \| N/A: 0 |

---

### Bảng Integration Test Cases (`CustomerController`)

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer Phone Lookup** | | | | | | | |
| **TC_CUS_LKP_01** | Lookup customer by phone number successfully when customer exists in DB. | 1. Dispatch `GET /api/customers/phone-lookup?phone=0912345678`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Tra cứu khách hàng thành công"`<br>3. `result` contains `id: 1`, `fullName: "Nguyễn Văn A"`, `phoneNumber: "0912345678"`, `totalDebt: 500000.00`, `isCheckDebtUnstable: false`. | User authenticated. Customer with phone `0912345678` exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LKP_02** | Lookup customer by phone number when customer does not exist in DB. | 1. Dispatch `GET /api/customers/phone-lookup?phone=0999999999`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Tra cứu khách hàng thành công"`<br>3. `result: null`. | User authenticated. Phone `0999999999` does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LKP_03** | Reject phone lookup request when required `phone` parameter is missing. | 1. Dispatch `GET /api/customers/phone-lookup` without query parameter. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `MissingServletRequestParameterException`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **Customer Debt Overview** | | | | | | | |
| **TC_CUS_OVW_01** | Get customer debt overview successfully with active debts and today's transactions. | 1. Dispatch `GET /api/customers/overview`<br>2. Inspect HTTP status code and response body metrics. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy tổng quan công nợ khách hàng thành công"`<br>3. `result` contains populated aggregated fields: `totalDebt`, `debtCustomerCount`, `todayCollectedAmount`, `todayPayingCustomerCount`, `todayFullSettlementCount`, `todayPartialPaymentCount`, `totalDebtSalesCount`, `uniqueCustomersInDebtCount`, `totalDebtAmountIncurredToday`, `newDebtCustomerAlert`, `staffDebtSalesAlert`. | User authenticated. System has active customer debts, orders, and payment records created today. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_OVW_02** | Get customer debt overview in clean state (no debt records, no transactions today). | 1. Dispatch `GET /api/customers/overview`<br>2. Inspect response values. | 1. HTTP Status Code: `200 OK`<br>2. `result.totalDebt = 0.00`, `result.debtCustomerCount = 0`, `result.todayCollectedAmount = 0.00`, `result.totalDebtSalesCount = 0`, `result.newDebtCustomerAlert.count = 0`, `result.staffDebtSalesAlert.count = 0`. | Clean database with no active debts and no transactions today. | Passed | 10/08/2026 | dungnthe180742 |
| **Add New Customer** | | | | | | | |
| **TC_CUS_ADD_01** | Add new customer successfully by Admin user (`isCheckUnstableDebt = false`). | 1. Prepare JSON body:<br>`{"fullName": "Trần Thị Lan", "phoneNumber": "0987654321", "address": "12 Cầu Giấy, Hà Nội", "note": "Khách quen", "allowDebt": true}`<br>2. Dispatch `POST /api/customers` as Admin. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Thêm mới khách nợ thành công"`<br>3. `result.fullName = "Trần Thị Lan"`, `result.phoneNumber = "0987654321"`, `result.allowDebt = true`, `result.totalDebt = 0.00`, `result.isCheckDebtUnstable = false`.<br>4. DB contains new record with `status = "NO_DEBT"`. | Authenticated as Admin. Phone `0987654321` not registered. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ADD_02** | Add new customer successfully by Staff user (`isCheckUnstableDebt = true` for review). | 1. Prepare JSON body:<br>`{"fullName": "Lê Văn Tuấn", "phoneNumber": "0978123456", "address": "45 Lê Lợi", "note": "Khách mới", "allowDebt": true}`<br>2. Dispatch `POST /api/customers` as Staff. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Thêm mới khách nợ thành công"`<br>3. `result.isCheckDebtUnstable = true` (flagged for Admin review).<br>4. In DB, customer record has `isCheckUnstableDebt = true`. | Authenticated as non-admin Staff. Phone number unique. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ADD_03** | Add new customer successfully without phone number (null or empty phone). | 1. Prepare JSON body:<br>`{"fullName": "Khách Mua Lẻ", "address": "Hà Nội", "allowDebt": true}`<br>2. Dispatch `POST /api/customers`. | 1. HTTP Status Code: `200 OK`<br>2. Response body returns created customer with `phoneNumber = null`, `totalDebt = 0.00`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ADD_04** | Reject adding new customer when `fullName` is blank or null. | 1. Prepare JSON body: `{"fullName": "", "phoneNumber": "0912345678"}`<br>2. Dispatch `POST /api/customers`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Tên khách hàng không được để trống"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ADD_05** | Reject adding new customer when `fullName` length exceeds 100 characters. | 1. Prepare JSON body with `fullName` of 101 characters.<br>2. Dispatch `POST /api/customers`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Tên khách hàng không được vượt quá 100 ký tự"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ADD_06** | Reject adding new customer with invalid phone number format (`"0123"`). | 1. Prepare JSON body: `{"fullName": "Nguyễn Văn B", "phoneNumber": "0123"}`<br>2. Dispatch `POST /api/customers`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Số điện thoại không hợp lệ"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ADD_07** | Reject adding new customer when phone number already exists for an active customer. | 1. Prepare JSON body: `{"fullName": "Nguyễn Văn C", "phoneNumber": "0912345678"}`<br>2. Dispatch `POST /api/customers`. | 1. HTTP Status Code: `409 Conflict`<br>2. Throws `AppException(ErrorCode.PHONE_NUMBER_EXISTED)` ("Số điện thoại đã được sử dụng"). | Active customer with phone `0912345678` exists in DB (`isRemoved = false`). | Passed | 10/08/2026 | dungnthe180742 |
| **Customer Debt List & Filtering** | | | | | | | |
| **TC_CUS_LST_01** | Query customer list without filters using default pagination (page 1, size 10). | 1. Dispatch `GET /api/customers/debts`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy danh sách khách hàng thành công"`<br>3. `result.content` contains up to 10 customers sorted by `createdAt` DESC, `result.page = 1`, `result.size = 10`, `result.totalElements` and `result.totalPages` correctly populated. | User authenticated. Database contains multiple active customer records. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LST_02** | Search customer list by keyword (matching customer name or phone number). | 1. Dispatch `GET /api/customers/debts?keyword=0912345678`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. `result.content` returns only customers whose name or phone number matches keyword.<br>3. `result.totalElements` matches count of matching customers. | Target customer exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LST_03** | Filter customer list by debt status (`status = IN_DEBT`). | 1. Dispatch `GET /api/customers/debts?status=IN_DEBT`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. All returned customers have `debtStatus = "IN_DEBT"`. | Customers with and without debt exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LST_04** | Filter customer list by debt permission (`allowDebt = false`). | 1. Dispatch `GET /api/customers/debts?allowDebt=false`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. All returned customers have `allowDebt = false`. | Customers with `allowDebt = false` exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LST_05** | Filter customer list by overdue status (`isOverdue = true`). | 1. Dispatch `GET /api/customers/debts?isOverdue=true`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. All returned customers have `isOverdue = true` (having unpaid orders with `dueDate < now`). | Customers with overdue unpaid debt orders exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LST_06** | Filter customer list by creation date range (`fromDate`, `toDate`). | 1. Dispatch `GET /api/customers/debts?fromDate=2026-08-01&toDate=2026-08-25`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. Content filtered strictly to customers created between 2026-08-01 00:00:00 and 2026-08-25 23:59:59 (+7). | Customers exist within and outside date range. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_LST_07** | Sort customer list by business priority (`sortBy = "priority"`). | 1. Dispatch `GET /api/customers/debts?sortBy=priority&page=1&size=10`<br>2. Inspect response order. | 1. HTTP Status Code: `200 OK`<br>2. Customers sorted by priority score descending (Score 7: `isCheckDebtUnstable = true`, Score 6: In debt, not overdue, not allowed debt, Score 5: In debt, overdue, allowed debt, Score 4: In debt, not overdue, allowed debt, etc.), then by `totalDebt` descending. | Database contains customers across diverse priority categories. | Passed | 10/08/2026 | dungnthe180742 |
| **Customer Detail** | | | | | | | |
| **TC_CUS_DET_01** | Get full customer detail for an existing active customer ID 1. | 1. Dispatch `GET /api/customers/1`<br>2. Inspect HTTP status code and response body fields. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy thông tin chi tiết khách hàng thành công"`<br>3. `result` contains `id: 1`, `fullName`, `phoneNumber`, `address`, `totalDebt`, `allowDebt`, `debtStatus`, `latestDebtDate`, `note`, `isOverdue`, `isCheckDebtUnstable`, `totalOrdersInDebt`, `totalOverdueOrders`. | Customer ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_DET_02** | Reject getting detail for non-existent customer ID 99999. | 1. Dispatch `GET /api/customers/99999`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`. | Customer ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Customer Debt Orders** | | | | | | | |
| **TC_CUS_ORD_01** | Query paginated debt orders for an existing customer (default page 1, size 10). | 1. Dispatch `GET /api/customers/1/debt-orders`<br>2. Inspect HTTP status and result pagination fields. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy danh sách hóa đơn nợ của khách hàng thành công"`<br>3. `result.content` returns list of debt orders with `orderCode`, `orderDate`, `dueDate`, `totalAmount`, `amountPaid`, `amountRemaining`, `status` (PAID/IN_DEBT/OVERDUE), and `createdBy` staff name. | Customer ID 1 exists with associated debt sales orders. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ORD_02** | Filter customer debt orders by search keyword (`keyword = "HD00001"`). | 1. Dispatch `GET /api/customers/1/debt-orders?keyword=HD00001`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. Returned content filtered exclusively to debt orders matching code "HD00001". | Customer 1 has debt order "HD00001". | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_ORD_03** | Reject querying debt orders for non-existent customer ID 99999. | 1. Dispatch `GET /api/customers/99999/debt-orders`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`. | Customer ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Update Customer** | | | | | | | |
| **TC_CUS_UPD_01** | Update existing customer details successfully with valid payload. | 1. Prepare JSON body:<br>`{"fullName": "Trần Thị Lan Cập Nhật", "phoneNumber": "0987654321", "address": "50 Nguyễn Trãi, Thanh Xuân", "note": "Khách VIP", "allowDebt": true}`<br>2. Dispatch `PUT /api/customers/1`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Cập nhật thông tin khách hàng thành công"`<br>3. `result.fullName = "Trần Thị Lan Cập Nhật"`, `result.address = "50 Nguyễn Trãi, Thanh Xuân"`, `result.note = "Khách VIP"`, `result.allowDebt = true`. DB record updated. | Customer ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_UPD_02** | Reject update when `allowDebt` field is missing or null. | 1. Prepare JSON body: `{"fullName": "Trần Thị Lan", "phoneNumber": "0987654321", "allowDebt": null}`<br>2. Dispatch `PUT /api/customers/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.ALLOW_DEBT_REQUIRED)` ("Trạng thái cho phép nợ là bắt buộc"). | Customer ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_UPD_03** | Reject update when `fullName` is blank or exceeds 100 characters. | 1. Prepare JSON body: `{"fullName": "", "phoneNumber": "0987654321", "allowDebt": true}`<br>2. Dispatch `PUT /api/customers/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Tên khách hàng không được để trống"`. | Customer ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_UPD_04** | Reject update when phone number format is invalid (`"abc"`). | 1. Prepare JSON body: `{"fullName": "Trần Thị Lan", "phoneNumber": "abc", "allowDebt": true}`<br>2. Dispatch `PUT /api/customers/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Số điện thoại không hợp lệ"`. | Customer ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_UPD_05** | Reject update when updated phone number is already used by another active customer. | 1. Prepare JSON body with phone number of Customer ID 2: `{"fullName": "Trần Thị Lan", "phoneNumber": "0912345678", "allowDebt": true}`<br>2. Dispatch `PUT /api/customers/1`. | 1. HTTP Status Code: `409 Conflict`<br>2. Throws `AppException(ErrorCode.PHONE_NUMBER_EXISTED)`. | Customer ID 1 and Customer ID 2 exist; Customer ID 2 has phone `0912345678`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_UPD_06** | Reject update for non-existent customer ID 99999. | 1. Dispatch `PUT /api/customers/99999` with valid JSON body. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`. | Customer ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Check Unstable Debt Review** | | | | | | | |
| **TC_CUS_UNS_01** | Update unstable debt check flag successfully (Admin reviews/approves customer debt). | 1. Prepare JSON body: `{"isCheckUnstableDebt": false}`<br>2. Dispatch `PATCH /api/customers/1/check-unstable-debt`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Cập nhật trạng thái kiểm tra công nợ thành công"`<br>3. `result.isCheckDebtUnstable = false`. In DB, customer record has `isCheckUnstableDebt = false`. | Customer ID 1 exists with `isCheckUnstableDebt = true`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_UNS_02** | Reject updating unstable debt check when `isCheckUnstableDebt` is null. | 1. Prepare JSON body: `{}`<br>2. Dispatch `PATCH /api/customers/1/check-unstable-debt`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Trạng thái kiểm tra công nợ không được để trống"`. | Customer ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_UNS_03** | Reject updating unstable debt check for non-existent customer ID 99999. | 1. Prepare JSON body: `{"isCheckUnstableDebt": false}`<br>2. Dispatch `PATCH /api/customers/99999/check-unstable-debt`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`. | Customer ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Today Debt Sales Summary** | | | | | | | |
| **TC_CUS_TDS_01** | Get today's debt sales summary successfully grouped by customer when debt orders exist today. | 1. Dispatch `GET /api/customers/today-debt-summary`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy tổng hợp bán nợ trong ngày thành công"`<br>3. `result` is a list of `TodaysDebtSalesSummaryResponse` sorted by `isCheckDebtUnstable` descending (unstable customers first), with nested `debtSalesDetails` containing order details (`orderCode`, `totalAmount`, `amountPaid`, `amountRemaining`, `status`, `createdBy`). | Multiple debt sales orders created today across different customers. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CUS_TDS_02** | Get today's debt sales summary when no debt sales occurred today. | 1. Dispatch `GET /api/customers/today-debt-summary`<br>2. Inspect response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy tổng hợp bán nợ trong ngày thành công"`<br>3. `result: []` (empty array). | No debt sales orders created today in DB. | Passed | 10/08/2026 | dungnthe180742 |

---

### Direct TSV / Copy-Paste Text Block (for Excel)

```tsv
Test Case ID	Test Case Description	Test Case Procedure	Expected Results	Pre-conditions	Round 1	Test date	Tester
Customer Phone Lookup							
TC_CUS_LKP_01	Lookup customer by phone number successfully when customer exists in DB.	"1. Dispatch `GET /api/customers/phone-lookup?phone=0912345678`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Tra cứu khách hàng thành công""`
3. `result` contains `id: 1`, `fullName: ""Nguyễn Văn A""`, `phoneNumber: ""0912345678""`, `totalDebt: 500000.00`, `isCheckDebtUnstable: false`."	User authenticated. Customer with phone `0912345678` exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_LKP_02	Lookup customer by phone number when customer does not exist in DB.	"1. Dispatch `GET /api/customers/phone-lookup?phone=0999999999`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Tra cứu khách hàng thành công""`
3. `result: null`."	User authenticated. Phone `0999999999` does not exist in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_LKP_03	Reject phone lookup request when required `phone` parameter is missing.	1. Dispatch `GET /api/customers/phone-lookup` without query parameter.	"1. HTTP Status Code: `400 Bad Request`
2. Throws `MissingServletRequestParameterException`."	User authenticated.	Passed	10/08/2026	dungnthe180742
Customer Debt Overview							
TC_CUS_OVW_01	Get customer debt overview successfully with active debts and today's transactions.	"1. Dispatch `GET /api/customers/overview`
2. Inspect HTTP status code and response body metrics."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy tổng quan công nợ khách hàng thành công""`
3. `result` contains populated aggregated fields: `totalDebt`, `debtCustomerCount`, `todayCollectedAmount`, `todayPayingCustomerCount`, `todayFullSettlementCount`, `todayPartialPaymentCount`, `totalDebtSalesCount`, `uniqueCustomersInDebtCount`, `totalDebtAmountIncurredToday`, `newDebtCustomerAlert`, `staffDebtSalesAlert`."	User authenticated. System has active customer debts, orders, and payment records created today.	Passed	10/08/2026	dungnthe180742
TC_CUS_OVW_02	Get customer debt overview in clean state (no debt records, no transactions today).	"1. Dispatch `GET /api/customers/overview`
2. Inspect response values."	"1. HTTP Status Code: `200 OK`
2. `result.totalDebt = 0.00`, `result.debtCustomerCount = 0`, `result.todayCollectedAmount = 0.00`, `result.totalDebtSalesCount = 0`, `result.newDebtCustomerAlert.count = 0`, `result.staffDebtSalesAlert.count = 0`."	Clean database with no active debts and no transactions today.	Passed	10/08/2026	dungnthe180742
Add New Customer							
TC_CUS_ADD_01	Add new customer successfully by Admin user (`isCheckUnstableDebt = false`).	"1. Prepare JSON body:
{""fullName"": ""Trần Thị Lan"", ""phoneNumber"": ""0987654321"", ""address"": ""12 Cầu Giấy, Hà Nội"", ""note"": ""Khách quen"", ""allowDebt"": true}
2. Dispatch `POST /api/customers` as Admin."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Thêm mới khách nợ thành công""`
3. `result.fullName = ""Trần Thị Lan""`, `result.phoneNumber = ""0987654321""`, `result.allowDebt = true`, `result.totalDebt = 0.00`, `result.isCheckDebtUnstable = false`.
4. DB contains new record with `status = ""NO_DEBT""`."	Authenticated as Admin. Phone `0987654321` not registered.	Passed	10/08/2026	dungnthe180742
TC_CUS_ADD_02	Add new customer successfully by Staff user (`isCheckUnstableDebt = true` for review).	"1. Prepare JSON body:
{""fullName"": ""Lê Văn Tuấn"", ""phoneNumber"": ""0978123456"", ""address"": ""45 Lê Lợi"", ""note"": ""Khách mới"", ""allowDebt"": true}
2. Dispatch `POST /api/customers` as Staff."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Thêm mới khách nợ thành công""`
3. `result.isCheckDebtUnstable = true` (flagged for Admin review).
4. In DB, customer record has `isCheckUnstableDebt = true`."	Authenticated as non-admin Staff. Phone number unique.	Passed	10/08/2026	dungnthe180742
TC_CUS_ADD_03	Add new customer successfully without phone number (null or empty phone).	"1. Prepare JSON body:
{""fullName"": ""Khách Mua Lẻ"", ""address"": ""Hà Nội"", ""allowDebt"": true}
2. Dispatch `POST /api/customers`."	"1. HTTP Status Code: `200 OK`
2. Response body returns created customer with `phoneNumber = null`, `totalDebt = 0.00`."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CUS_ADD_04	Reject adding new customer when `fullName` is blank or null.	"1. Prepare JSON body: {""fullName"": """", ""phoneNumber"": ""0912345678""}
2. Dispatch `POST /api/customers`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Tên khách hàng không được để trống""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CUS_ADD_05	Reject adding new customer when `fullName` length exceeds 100 characters.	"1. Prepare JSON body with `fullName` of 101 characters.
2. Dispatch `POST /api/customers`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Tên khách hàng không được vượt quá 100 ký tự""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CUS_ADD_06	Reject adding new customer with invalid phone number format (`""0123""`).	"1. Prepare JSON body: {""fullName"": ""Nguyễn Văn B"", ""phoneNumber"": ""0123""}
2. Dispatch `POST /api/customers`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Số điện thoại không hợp lệ""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CUS_ADD_07	Reject adding new customer when phone number already exists for an active customer.	"1. Prepare JSON body: {""fullName"": ""Nguyễn Văn C"", ""phoneNumber"": ""0912345678""}
2. Dispatch `POST /api/customers`."	"1. HTTP Status Code: `409 Conflict`
2. Throws `AppException(ErrorCode.PHONE_NUMBER_EXISTED)` (""Số điện thoại đã được sử dụng"")."	Active customer with phone `0912345678` exists in DB (`isRemoved = false`).	Passed	10/08/2026	dungnthe180742
Customer Debt List & Filtering							
TC_CUS_LST_01	Query customer list without filters using default pagination (page 1, size 10).	"1. Dispatch `GET /api/customers/debts`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy danh sách khách hàng thành công""`
3. `result.content` contains up to 10 customers sorted by `createdAt` DESC, `result.page = 1`, `result.size = 10`, `result.totalElements` and `result.totalPages` correctly populated."	User authenticated. Database contains multiple active customer records.	Passed	10/08/2026	dungnthe180742
TC_CUS_LST_02	Search customer list by keyword (matching customer name or phone number).	"1. Dispatch `GET /api/customers/debts?keyword=0912345678`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. `result.content` returns only customers whose name or phone number matches keyword.
3. `result.totalElements` matches count of matching customers."	Target customer exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_LST_03	Filter customer list by debt status (`status = IN_DEBT`).	"1. Dispatch `GET /api/customers/debts?status=IN_DEBT`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. All returned customers have `debtStatus = ""IN_DEBT""`."	Customers with and without debt exist in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_LST_04	Filter customer list by debt permission (`allowDebt = false`).	"1. Dispatch `GET /api/customers/debts?allowDebt=false`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. All returned customers have `allowDebt = false`."	Customers with `allowDebt = false` exist in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_LST_05	Filter customer list by overdue status (`isOverdue = true`).	"1. Dispatch `GET /api/customers/debts?isOverdue=true`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. All returned customers have `isOverdue = true` (having unpaid orders with `dueDate < now`)."	Customers with overdue unpaid debt orders exist in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_LST_06	Filter customer list by creation date range (`fromDate`, `toDate`).	"1. Dispatch `GET /api/customers/debts?fromDate=2026-08-01&toDate=2026-08-25`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. Content filtered strictly to customers created between 2026-08-01 00:00:00 and 2026-08-25 23:59:59 (+7)."	Customers exist within and outside date range.	Passed	10/08/2026	dungnthe180742
TC_CUS_LST_07	Sort customer list by business priority (`sortBy = ""priority""`).	"1. Dispatch `GET /api/customers/debts?sortBy=priority&page=1&size=10`
2. Inspect response order."	"1. HTTP Status Code: `200 OK`
2. Customers sorted by priority score descending (Score 7: `isCheckDebtUnstable = true`, Score 6: In debt, not overdue, not allowed debt, Score 5: In debt, overdue, allowed debt, Score 4: In debt, not overdue, allowed debt, etc.), then by `totalDebt` descending."	Database contains customers across diverse priority categories.	Passed	10/08/2026	dungnthe180742
Customer Detail							
TC_CUS_DET_01	Get full customer detail for an existing active customer ID 1.	"1. Dispatch `GET /api/customers/1`
2. Inspect HTTP status code and response body fields."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy thông tin chi tiết khách hàng thành công""`
3. `result` contains `id: 1`, `fullName`, `phoneNumber`, `address`, `totalDebt`, `allowDebt`, `debtStatus`, `latestDebtDate`, `note`, `isOverdue`, `isCheckDebtUnstable`, `totalOrdersInDebt`, `totalOverdueOrders`."	Customer ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_DET_02	Reject getting detail for non-existent customer ID 99999.	1. Dispatch `GET /api/customers/99999`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`."	Customer ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
Customer Debt Orders							
TC_CUS_ORD_01	Query paginated debt orders for an existing customer (default page 1, size 10).	"1. Dispatch `GET /api/customers/1/debt-orders`
2. Inspect HTTP status and result pagination fields."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy danh sách hóa đơn nợ của khách hàng thành công""`
3. `result.content` returns list of debt orders with `orderCode`, `orderDate`, `dueDate`, `totalAmount`, `amountPaid`, `amountRemaining`, `status` (PAID/IN_DEBT/OVERDUE), and `createdBy` staff name."	Customer ID 1 exists with associated debt sales orders.	Passed	10/08/2026	dungnthe180742
TC_CUS_ORD_02	Filter customer debt orders by search keyword (`keyword = ""HD00001""`).	1. Dispatch `GET /api/customers/1/debt-orders?keyword=HD00001`.	"1. HTTP Status Code: `200 OK`
2. Returned content filtered exclusively to debt orders matching code ""HD00001""."	Customer 1 has debt order "HD00001".	Passed	10/08/2026	dungnthe180742
TC_CUS_ORD_03	Reject querying debt orders for non-existent customer ID 99999.	1. Dispatch `GET /api/customers/99999/debt-orders`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`."	Customer ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
Update Customer							
TC_CUS_UPD_01	Update existing customer details successfully with valid payload.	"1. Prepare JSON body:
{""fullName"": ""Trần Thị Lan Cập Nhật"", ""phoneNumber"": ""0987654321"", ""address"": ""50 Nguyễn Trãi, Thanh Xuân"", ""note"": ""Khách VIP"", ""allowDebt"": true}
2. Dispatch `PUT /api/customers/1`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Cập nhật thông tin khách hàng thành công""`
3. `result.fullName = ""Trần Thị Lan Cập Nhật""`, `result.address = ""50 Nguyễn Trãi, Thanh Xuân""`, `result.note = ""Khách VIP""`, `result.allowDebt = true`. DB record updated."	Customer ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_UPD_02	Reject update when `allowDebt` field is missing or null.	"1. Prepare JSON body: {""fullName"": ""Trần Thị Lan"", ""phoneNumber"": ""0987654321"", ""allowDebt"": null}
2. Dispatch `PUT /api/customers/1`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.ALLOW_DEBT_REQUIRED)` (""Trạng thái cho phép nợ là bắt buộc"")."	Customer ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_UPD_03	Reject update when `fullName` is blank or exceeds 100 characters.	"1. Prepare JSON body: {""fullName"": """", ""phoneNumber"": ""0987654321"", ""allowDebt"": true}
2. Dispatch `PUT /api/customers/1`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Tên khách hàng không được để trống""."	Customer ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_UPD_04	Reject update when phone number format is invalid (`""abc""`).	"1. Prepare JSON body: {""fullName"": ""Trần Thị Lan"", ""phoneNumber"": ""abc"", ""allowDebt"": true}
2. Dispatch `PUT /api/customers/1`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Số điện thoại không hợp lệ""."	Customer ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_UPD_05	Reject update when updated phone number is already used by another active customer.	"1. Prepare JSON body with phone number of Customer ID 2: {""fullName"": ""Trần Thị Lan"", ""phoneNumber"": ""0912345678"", ""allowDebt"": true}
2. Dispatch `PUT /api/customers/1`."	"1. HTTP Status Code: `409 Conflict`
2. Throws `AppException(ErrorCode.PHONE_NUMBER_EXISTED)`."	Customer ID 1 and Customer ID 2 exist; Customer ID 2 has phone `0912345678`.	Passed	10/08/2026	dungnthe180742
TC_CUS_UPD_06	Reject update for non-existent customer ID 99999.	1. Dispatch `PUT /api/customers/99999` with valid JSON body.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`."	Customer ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
Check Unstable Debt Review							
TC_CUS_UNS_01	Update unstable debt check flag successfully (Admin reviews/approves customer debt).	"1. Prepare JSON body: {""isCheckUnstableDebt"": false}
2. Dispatch `PATCH /api/customers/1/check-unstable-debt`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Cập nhật trạng thái kiểm tra công nợ thành công""`
3. `result.isCheckDebtUnstable = false`. In DB, customer record has `isCheckUnstableDebt = false`."	Customer ID 1 exists with `isCheckUnstableDebt = true`.	Passed	10/08/2026	dungnthe180742
TC_CUS_UNS_02	Reject updating unstable debt check when `isCheckUnstableDebt` is null.	"1. Prepare JSON body: {}
2. Dispatch `PATCH /api/customers/1/check-unstable-debt`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Trạng thái kiểm tra công nợ không được để trống""."	Customer ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CUS_UNS_03	Reject updating unstable debt check for non-existent customer ID 99999.	"1. Prepare JSON body: {""isCheckUnstableDebt"": false}
2. Dispatch `PATCH /api/customers/99999/check-unstable-debt`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.CUSTOMER_NOT_FOUND)`."	Customer ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
Today Debt Sales Summary							
TC_CUS_TDS_01	Get today's debt sales summary successfully grouped by customer when debt orders exist today.	"1. Dispatch `GET /api/customers/today-debt-summary`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy tổng hợp bán nợ trong ngày thành công""`
3. `result` is a list of `TodaysDebtSalesSummaryResponse` sorted by `isCheckDebtUnstable` descending (unstable customers first), with nested `debtSalesDetails` containing order details (`orderCode`, `totalAmount`, `amountPaid`, `amountRemaining`, `status`, `createdBy`)."	Multiple debt sales orders created today across different customers.	Passed	10/08/2026	dungnthe180742
TC_CUS_TDS_02	Get today's debt sales summary when no debt sales occurred today.	"1. Dispatch `GET /api/customers/today-debt-summary`
2. Inspect response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy tổng hợp bán nợ trong ngày thành công""`
3. `result: []` (empty array)."	No debt sales orders created today in DB.	Passed	10/08/2026	dungnthe180742
```
