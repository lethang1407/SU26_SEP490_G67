# Integration Test Cases - Supplier Management (`SupplierController`)

### 📋 Controller Overview & Test Objectives (Mô tả Controller & Mục tiêu Kiểm thử)

| Mục | Chi tiết |
| :--- | :--- |
| **Controller** | `SupplierController` (`project.be_sep490_g67.controller.SupplierController`) |
| **Base API Path** | `/api/suppliers` |
| **Mô tả nghiệp vụ** | Quản lý nhà cung cấp hàng hóa cho tiệm tạp hóa, theo dõi công nợ nhập hàng, lịch sử phiếu nhập kho, ghi nhận các đợt thanh toán nợ đơn lẻ/hàng loạt và lịch sử giao dịch trả tiền NCC. |
| **Phạm vi API kiểm thử** | **1. `GET /api/suppliers`**: Lấy danh sách NCC phân trang, tìm kiếm từ khóa, lọc theo danh mục / sản phẩm đã cung cấp.<br>**2. `GET /api/suppliers/{id}`**: Lấy chi tiết NCC kèm thông tin nợ và danh mục phụ trách.<br>**3. `POST /api/suppliers`**: Thêm mới NCC, tự sinh mã (`NCC00001`), validate định dạng SĐT.<br>**4. `PUT /api/suppliers/{id}`**: Cập nhật thông tin NCC nhưng giữ nguyên mã NCC bất biến.<br>**5. `DELETE /api/suppliers/{id}`**: Xóa mềm NCC với ràng buộc an toàn (chỉ được xóa khi nợ = 0).<br>**6. `GET /api/suppliers/{id}/import-orders`**: Lấy lịch sử phiếu nhập hàng của NCC.<br>**7. `POST /api/suppliers/{id}/payments`**: Ghi nhận phiếu thanh toán nợ cho phiếu nhập, kiểm tra số tiền hợp lệ và không vượt quá số nợ.<br>**8. `GET /api/suppliers/{id}/payments`**: Lấy lịch sử phiếu trả nợ NCC có lọc theo khoảng ngày. |
| **Mục tiêu Integration Test** | Xác thực tìm kiếm và xem chi tiết nhà cung cấp, mã NCC bất biến, xóa mềm an toàn (nợ = 0), và lịch sử giao dịch trả nợ. |

> **Note**: File này được tổng hợp và chuẩn hóa theo đúng cấu trúc bảng yêu cầu: `Test Case ID`, `Test Case Description`, `Test Case Procedure`, `Expected Results`, `Pre-conditions`, `Round 1`, `Test date`, `Tester`. Bạn có thể sao chép trực tiếp dữ liệu từ các bảng dưới đây vào file Excel.

---

### Bảng Thông Tin Module (Sheet Header)

| Attribute | Value |
| :--- | :--- |
| **Feature** | Supplier Management |
| **Test requirement** | Standardized integration tests for all 8 API endpoints in `SupplierController`: supplier listing/search/filtering, supplier detail retrieval, supplier creation/update, soft-deletion debt validation, import transaction history, debt payment recording, and payment history filtering. |
| **Number of TCs** | 25 |
| **Testing Round** | Passed: 25 \| Failed: 0 \| Pending: 0 \| N/A: 0 |

---

### Bảng Integration Test Cases (`SupplierController`)

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Supplier List** | | | | | | | |
| **TC_SUP_LST_01** | Query supplier list without filters using default pagination (page 0, size 10). | 1. Dispatch `GET /api/suppliers`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy danh sách nhà cung cấp thành công"`<br>3. `result.content` contains 10 items, `result.totalElements = 15`, `result.totalPages = 2`, `result.page = 0`<br>4. `result.totalDebt` and `result.debtSupplierCount` reflect system-wide supplier debt totals. | User authenticated with authority `SUPPLIER:VIEW`. Database contains 15 active suppliers, some with outstanding debt. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_LST_02** | Search supplier list by supplier name keyword (`search = "Dược"`). | 1. Dispatch `GET /api/suppliers?search=Dược`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. `result.content` contains only suppliers whose name includes "Dược" (case-insensitive).<br>3. `result.totalElements` matches count of matching suppliers. | User has `SUPPLIER:VIEW`. Database contains 3 suppliers matching keyword "Dược". | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_LST_03** | Filter supplier list by category ID (`categoryId = 1`). | 1. Dispatch `GET /api/suppliers?categoryId=1`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. All returned suppliers belong to Category ID 1. | User has `SUPPLIER:VIEW`. Category ID 1 exists and is assigned to multiple active suppliers. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_LST_04** | Filter supplier list by product ID (`productId = 5`). | 1. Dispatch `GET /api/suppliers?productId=5`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. Returned suppliers are those who have supplied Product ID 5 in past import orders, sorted by most recent import date descending. | User has `SUPPLIER:VIEW`. Product ID 5 exists with import order history across 2 suppliers. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_LST_05** | Reject request when user lacks `SUPPLIER:VIEW` permission. | 1. Authenticate as staff user without `SUPPLIER:VIEW` authority.<br>2. Dispatch `GET /api/suppliers`. | 1. HTTP Status Code: `403 Forbidden`<br>2. Access denied exception thrown, no supplier data disclosed. | User account active but lacks `SUPPLIER:VIEW` role/authority. | Passed | 10/08/2026 | dungnthe180742 |
| **Supplier Detail** | | | | | | | |
| **TC_SUP_DET_01** | Get full supplier detail for an existing active supplier ID 1. | 1. Dispatch `GET /api/suppliers/1`<br>2. Inspect HTTP status code and response body fields. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy thông tin nhà cung cấp thành công"`<br>3. `result` contains `id: 1`, `supplierCode: "NCC00001"`, `name`, `contactPerson`, `phoneNumber`, `address`, `notes`, `categories` array, and `currentDebt`. | User has `SUPPLIER:VIEW`. Supplier ID 1 exists, `isRemoved = false`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_DET_02** | Reject getting detail for non-existent supplier ID 99999. | 1. Dispatch `GET /api/suppliers/99999`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`. | Supplier ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_DET_03** | Reject getting detail for soft-deleted supplier (`isRemoved = true`). | 1. Dispatch `GET /api/suppliers/10`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`. | Supplier ID 10 exists in DB with `isRemoved = true`. | Passed | 10/08/2026 | dungnthe180742 |
| **Add New Supplier** | | | | | | | |
| **TC_SUP_ADD_01** | Add new supplier successfully with valid data and auto-generated supplier code. | 1. Prepare JSON body:<br>`{"name": "Công ty Dược Thắng", "contactPerson": "Nguyễn Văn A", "phoneNumber": "0912345678", "address": "123 Giải Phóng", "notes": "NCC uy tín"}`<br>2. Dispatch `POST /api/suppliers`. | 1. HTTP Status Code: `200 OK`<br>2. System auto-generates code `NCC00001` (or next sequence).<br>3. Response body returns created supplier detail with `createdBy` set to logged-in user.<br>4. DB contains new record with `isRemoved = false`. | User authenticated with `SUPPLIER:CREATE` authority. Phone number valid format. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_ADD_02** | Reject adding new supplier when name field is blank or null. | 1. Prepare JSON body: `{"name": "", "phoneNumber": "0912345678"}`<br>2. Dispatch `POST /api/suppliers`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Tên nhà cung cấp không được để trống"`. | User has `SUPPLIER:CREATE`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_ADD_03** | Reject adding new supplier when name length exceeds 150 characters. | 1. Prepare JSON body with `name` of 151 characters.<br>2. Dispatch `POST /api/suppliers`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Tên nhà cung cấp không được vượt quá 150 ký tự"`. | User has `SUPPLIER:CREATE`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_ADD_04** | Reject adding new supplier with invalid phone number format (`"123"`). | 1. Prepare JSON body: `{"name": "NCC Mới", "phoneNumber": "123"}`<br>2. Dispatch `POST /api/suppliers`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.INVALID_PHONE_NUMBER)`. | User has `SUPPLIER:CREATE`. `PhoneNumberUtil.isValid("123")` returns `false`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_ADD_05** | Reject adding supplier without `SUPPLIER:CREATE` authority. | 1. Authenticate as user lacking `SUPPLIER:CREATE`.<br>2. Dispatch `POST /api/suppliers` with valid body. | 1. HTTP Status Code: `403 Forbidden`<br>2. Access denied. | User account lacks `SUPPLIER:CREATE`. | Passed | 10/08/2026 | dungnthe180742 |
| **Update Supplier** | | | | | | | |
| **TC_SUP_UPD_01** | Update existing supplier details successfully while maintaining immutable supplier code. | 1. Prepare JSON body:<br>`{"name": "Công ty Dược Thắng Cập Nhật", "contactPerson": "Trần Văn B", "phoneNumber": "0987654321", "address": "456 Lê Duẩn"}`<br>2. Dispatch `PUT /api/suppliers/1`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Cập nhật nhà cung cấp thành công"`<br>3. `supplierCode` remains unchanged (`NCC00001`). `name`, `contactPerson`, `phoneNumber`, `address` updated in DB. | User has `SUPPLIER:UPDATE`. Supplier ID 1 exists (`isRemoved = false`). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_UPD_02** | Reject update for non-existent supplier ID 99999. | 1. Dispatch `PUT /api/suppliers/99999` with valid JSON body. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`. | Supplier ID 99999 does not exist. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_UPD_03** | Reject update when phone number format is invalid (`"abc"`). | 1. Prepare JSON body: `{"name": "NCC Test", "phoneNumber": "abc"}`<br>2. Dispatch `PUT /api/suppliers/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.INVALID_PHONE_NUMBER)`. | Supplier ID 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_UPD_04** | Reject update without `SUPPLIER:UPDATE` authority. | 1. Authenticate as user lacking `SUPPLIER:UPDATE`.<br>2. Dispatch `PUT /api/suppliers/1`. | 1. HTTP Status Code: `403 Forbidden`. | User lacks authority. | Passed | 10/08/2026 | dungnthe180742 |
| **Delete Supplier** | | | | | | | |
| **TC_SUP_DEL_01** | Soft-delete supplier with zero outstanding debt (`currentDebt = 0`). | 1. Dispatch `DELETE /api/suppliers/2`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Xóa nhà cung cấp thành công"`<br>3. In DB, supplier record ID 2 has `isRemoved = true`. | User has `SUPPLIER:DELETE`. Supplier ID 2 exists, `currentDebt = 0`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_DEL_02** | Reject soft-deleting supplier with remaining debt (`currentDebt > 0`). | 1. Dispatch `DELETE /api/suppliers/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.SUPPLIER_HAS_DEBT)`. Supplier remains active in DB. | Supplier ID 1 has active import orders with remaining debt > 0. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_DEL_03** | Reject deleting non-existent supplier ID 99999. | 1. Dispatch `DELETE /api/suppliers/99999`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`. | Supplier ID 99999 does not exist. | Passed | 10/08/2026 | dungnthe180742 |
| **Supplier Import History** | | | | | | | |
| **TC_SUP_IMP_01** | Query paginated import history for an existing supplier (default page 0, size 5). | 1. Dispatch `GET /api/suppliers/1/import-orders`<br>2. Inspect HTTP status and result pagination fields. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy lịch sử nhập hàng thành công"`<br>3. `result.content` returns list of import order items for supplier 1. | User has `SUPPLIER:VIEW`. Supplier ID 1 has multiple purchase orders. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_IMP_02** | Filter import history by status (`status = "COMPLETED"`) and search keyword. | 1. Dispatch `GET /api/suppliers/1/import-orders?status=COMPLETED&search=HDN0001`. | 1. HTTP Status Code: `200 OK`<br>2. Returned content filtered exclusively to completed import orders matching code "HDN0001". | Supplier ID 1 has completed import order "HDN0001". | Passed | 10/08/2026 | dungnthe180742 |
| **Create Supplier Debt Payment** | | | | | | | |
| **TC_SUP_PAY_01** | Record debt payment successfully for a valid import order with valid payment amount (`amount <= remainingDebt`). | 1. Prepare JSON body:<br>`{"orderId": 100, "amount": 5000000, "paymentMethod": "TRANSFER", "note": "Thanh toán đợt 1"}`<br>2. Dispatch `POST /api/suppliers/1/payments`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Ghi nhận thanh toán nợ thành công"`<br>3. Auto-generated `paymentCode` (e.g., `TTN000001`).<br>4. `remainingDebtAfter` correctly equals `previousRemainingDebt - 5,000,000`.<br>5. DB records new `SupplierPayment` entry. | User has `SUPPLIER:PAYMENT`. Supplier 1 has active import order 100 with remaining debt = 10,000,000 VND. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_PAY_02** | Reject debt payment when amount is zero or negative (`amount = 0`). | 1. Prepare JSON body: `{"orderId": 100, "amount": 0}`<br>2. Dispatch `POST /api/suppliers/1/payments`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.INVALID_PAYMENT_AMOUNT)`. | User has `SUPPLIER:PAYMENT`. Import order 100 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_PAY_03** | Reject debt payment when amount exceeds remaining order debt (`amount > remainingDebt`). | 1. Prepare JSON body: `{"orderId": 100, "amount": 20000000}`<br>2. Dispatch `POST /api/suppliers/1/payments`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.PAYMENT_EXCEEDS_DEBT)`. Payment not recorded. | Import order 100 remaining debt is 10,000,000 VND (< 20,000,000). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_PAY_04** | Reject debt payment for non-existent import order or order belonging to another supplier. | 1. Prepare JSON body: `{"orderId": 99999, "amount": 1000000}`<br>2. Dispatch `POST /api/suppliers/1/payments`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`. | Import order ID 99999 does not exist or does not belong to supplier 1. | Passed | 10/08/2026 | dungnthe180742 |
| **Supplier Payment History** | | | | | | | |
| **TC_SUP_HIS_01** | Query supplier payment history with default pagination. | 1. Dispatch `GET /api/suppliers/1/payments`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy lịch sử thanh toán nợ thành công"`<br>3. `result.content` returns payment transactions sorted by `paymentDate` descending, with `remainingDebtAfter` dynamically derived. | User has `SUPPLIER:VIEW`. Supplier 1 has recorded payments. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_HIS_02** | Filter payment history by date range (`fromDate`, `toDate`) and payment code search. | 1. Dispatch `GET /api/suppliers/1/payments?fromDate=2026-08-01&toDate=2026-08-15&search=TTN000001`. | 1. HTTP Status Code: `200 OK`<br>2. Content filtered strictly within date window and matching search keyword "TTN000001". | Payments exist within date range 2026-08-01 to 2026-08-15. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_SUP_HIS_03** | Reject querying payment history for non-existent supplier ID 99999. | 1. Dispatch `GET /api/suppliers/99999/payments`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`. | Supplier ID 99999 does not exist. | Passed | 10/08/2026 | dungnthe180742 |

---

### Direct TSV / Copy-Paste Text Block (for Excel)

```tsv
Test Case ID	Test Case Description	Test Case Procedure	Expected Results	Pre-conditions	Round 1	Test date	Tester
Supplier List							
TC_SUP_LST_01	Query supplier list without filters using default pagination (page 0, size 10).	"1. Dispatch `GET /api/suppliers`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy danh sách nhà cung cấp thành công""`
3. `result.content` contains 10 items, `result.totalElements = 15`, `result.totalPages = 2`, `result.page = 0`
4. `result.totalDebt` and `result.debtSupplierCount` reflect system-wide supplier debt totals."	User authenticated with authority `SUPPLIER:VIEW`. Database contains 15 active suppliers, some with outstanding debt.	Passed	10/08/2026	dungnthe180742
TC_SUP_LST_02	Search supplier list by supplier name keyword (`search = ""Dược""`).	"1. Dispatch `GET /api/suppliers?search=Dược`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. `result.content` contains only suppliers whose name includes ""Dược"" (case-insensitive).
3. `result.totalElements` matches count of matching suppliers."	User has `SUPPLIER:VIEW`. Database contains 3 suppliers matching keyword "Dược".	Passed	10/08/2026	dungnthe180742
TC_SUP_LST_03	Filter supplier list by category ID (`categoryId = 1`).	"1. Dispatch `GET /api/suppliers?categoryId=1`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. All returned suppliers belong to Category ID 1."	User has `SUPPLIER:VIEW`. Category ID 1 exists and is assigned to multiple active suppliers.	Passed	10/08/2026	dungnthe180742
TC_SUP_LST_04	Filter supplier list by product ID (`productId = 5`).	"1. Dispatch `GET /api/suppliers?productId=5`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. Returned suppliers are those who have supplied Product ID 5 in past import orders, sorted by most recent import date descending."	User has `SUPPLIER:VIEW`. Product ID 5 exists with import order history across 2 suppliers.	Passed	10/08/2026	dungnthe180742
TC_SUP_LST_05	Reject request when user lacks `SUPPLIER:VIEW` permission.	"1. Authenticate as staff user without `SUPPLIER:VIEW` authority.
2. Dispatch `GET /api/suppliers`."	"1. HTTP Status Code: `403 Forbidden`
2. Access denied exception thrown, no supplier data disclosed."	User account active but lacks `SUPPLIER:VIEW` role/authority.	Passed	10/08/2026	dungnthe180742
Supplier Detail							
TC_SUP_DET_01	Get full supplier detail for an existing active supplier ID 1.	"1. Dispatch `GET /api/suppliers/1`
2. Inspect HTTP status code and response body fields."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy thông tin nhà cung cấp thành công""`
3. `result` contains `id: 1`, `supplierCode: ""NCC00001""`, `name`, `contactPerson`, `phoneNumber`, `address`, `notes`, `categories` array, and `currentDebt`."	User has `SUPPLIER:VIEW`. Supplier ID 1 exists, `isRemoved = false`.	Passed	10/08/2026	dungnthe180742
TC_SUP_DET_02	Reject getting detail for non-existent supplier ID 99999.	1. Dispatch `GET /api/suppliers/99999`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`."	Supplier ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
TC_SUP_DET_03	Reject getting detail for soft-deleted supplier (`isRemoved = true`).	1. Dispatch `GET /api/suppliers/10`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`."	Supplier ID 10 exists in DB with `isRemoved = true`.	Passed	10/08/2026	dungnthe180742
Add New Supplier							
TC_SUP_ADD_01	Add new supplier successfully with valid data and auto-generated supplier code.	"1. Prepare JSON body:
{""name"": ""Công ty Dược Thắng"", ""contactPerson"": ""Nguyễn Văn A"", ""phoneNumber"": ""0912345678"", ""address"": ""123 Giải Phóng"", ""notes"": ""NCC uy tín""}
2. Dispatch `POST /api/suppliers`."	"1. HTTP Status Code: `200 OK`
2. System auto-generates code `NCC00001` (or next sequence).
3. Response body returns created supplier detail with `createdBy` set to logged-in user.
4. DB contains new record with `isRemoved = false`."	User authenticated with `SUPPLIER:CREATE` authority. Phone number valid format.	Passed	10/08/2026	dungnthe180742
TC_SUP_ADD_02	Reject adding new supplier when name field is blank or null.	"1. Prepare JSON body: {""name"": """", ""phoneNumber"": ""0912345678""}
2. Dispatch `POST /api/suppliers`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Tên nhà cung cấp không được để trống""."	User has `SUPPLIER:CREATE`.	Passed	10/08/2026	dungnthe180742
TC_SUP_ADD_03	Reject adding new supplier when name length exceeds 150 characters.	"1. Prepare JSON body with `name` of 151 characters.
2. Dispatch `POST /api/suppliers`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Tên nhà cung cấp không được vượt quá 150 ký tự""."	User has `SUPPLIER:CREATE`.	Passed	10/08/2026	dungnthe180742
TC_SUP_ADD_04	Reject adding new supplier with invalid phone number format (`""123""`).	"1. Prepare JSON body: {""name"": ""NCC Mới"", ""phoneNumber"": ""123""}
2. Dispatch `POST /api/suppliers`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.INVALID_PHONE_NUMBER)`."	User has `SUPPLIER:CREATE`. `PhoneNumberUtil.isValid(""123"")` returns `false`.	Passed	10/08/2026	dungnthe180742
TC_SUP_ADD_05	Reject adding supplier without `SUPPLIER:CREATE` authority.	"1. Authenticate as user lacking `SUPPLIER:CREATE`.
2. Dispatch `POST /api/suppliers` with valid body."	"1. HTTP Status Code: `403 Forbidden`
2. Access denied."	User account lacks `SUPPLIER:CREATE`.	Passed	10/08/2026	dungnthe180742
Update Supplier							
TC_SUP_UPD_01	Update existing supplier details successfully while maintaining immutable supplier code.	"1. Prepare JSON body:
{""name"": ""Công ty Dược Thắng Cập Nhật"", ""contactPerson"": ""Trần Văn B"", ""phoneNumber"": ""0987654321"", ""address"": ""456 Lê Duẩn""}
2. Dispatch `PUT /api/suppliers/1`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Cập nhật nhà cung cấp thành công""`
3. `supplierCode` remains unchanged (`NCC00001`). `name`, `contactPerson`, `phoneNumber`, `address` updated in DB."	User has `SUPPLIER:UPDATE`. Supplier ID 1 exists (`isRemoved = false`).	Passed	10/08/2026	dungnthe180742
TC_SUP_UPD_02	Reject update for non-existent supplier ID 99999.	1. Dispatch `PUT /api/suppliers/99999` with valid JSON body.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`."	Supplier ID 99999 does not exist.	Passed	10/08/2026	dungnthe180742
TC_SUP_UPD_03	Reject update when phone number format is invalid (`""abc""`).	"1. Prepare JSON body: {""name"": ""NCC Test"", ""phoneNumber"": ""abc""}
2. Dispatch `PUT /api/suppliers/1`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.INVALID_PHONE_NUMBER)`."	Supplier ID 1 exists.	Passed	10/08/2026	dungnthe180742
TC_SUP_UPD_04	Reject update without `SUPPLIER:UPDATE` authority.	"1. Authenticate as user lacking `SUPPLIER:UPDATE`.
2. Dispatch `PUT /api/suppliers/1`."	1. HTTP Status Code: `403 Forbidden`.	User lacks authority.	Passed	10/08/2026	dungnthe180742
Delete Supplier							
TC_SUP_DEL_01	Soft-delete supplier with zero outstanding debt (`currentDebt = 0`).	1. Dispatch `DELETE /api/suppliers/2`.	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Xóa nhà cung cấp thành công""`
3. In DB, supplier record ID 2 has `isRemoved = true`."	User has `SUPPLIER:DELETE`. Supplier ID 2 exists, `currentDebt = 0`.	Passed	10/08/2026	dungnthe180742
TC_SUP_DEL_02	Reject soft-deleting supplier with remaining debt (`currentDebt > 0`).	1. Dispatch `DELETE /api/suppliers/1`.	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.SUPPLIER_HAS_DEBT)`. Supplier remains active in DB."	Supplier ID 1 has active import orders with remaining debt > 0.	Passed	10/08/2026	dungnthe180742
TC_SUP_DEL_03	Reject deleting non-existent supplier ID 99999.	1. Dispatch `DELETE /api/suppliers/99999`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`."	Supplier ID 99999 does not exist.	Passed	10/08/2026	dungnthe180742
Supplier Import History							
TC_SUP_IMP_01	Query paginated import history for an existing supplier (default page 0, size 5).	"1. Dispatch `GET /api/suppliers/1/import-orders`
2. Inspect HTTP status and result pagination fields."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy lịch sử nhập hàng thành công""`
3. `result.content` returns list of import order items for supplier 1."	User has `SUPPLIER:VIEW`. Supplier ID 1 has multiple purchase orders.	Passed	10/08/2026	dungnthe180742
TC_SUP_IMP_02	Filter import history by status (`status = ""COMPLETED""`) and search keyword.	1. Dispatch `GET /api/suppliers/1/import-orders?status=COMPLETED&search=HDN0001`.	"1. HTTP Status Code: `200 OK`
2. Returned content filtered exclusively to completed import orders matching code ""HDN0001""."	Supplier ID 1 has completed import order "HDN0001".	Passed	10/08/2026	dungnthe180742
Create Supplier Debt Payment							
TC_SUP_PAY_01	Record debt payment successfully for a valid import order with valid payment amount (`amount <= remainingDebt`).	"1. Prepare JSON body:
{""orderId"": 100, ""amount"": 5000000, ""paymentMethod"": ""TRANSFER"", ""note"": ""Thanh toán đợt 1""}
2. Dispatch `POST /api/suppliers/1/payments`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Ghi nhận thanh toán nợ thành công""`
3. Auto-generated `paymentCode` (e.g., `TTN000001`).
4. `remainingDebtAfter` correctly equals `previousRemainingDebt - 5,000,000`.
5. DB records new `SupplierPayment` entry."	User has `SUPPLIER:PAYMENT`. Supplier 1 has active import order 100 with remaining debt = 10,000,000 VND.	Passed	10/08/2026	dungnthe180742
TC_SUP_PAY_02	Reject debt payment when amount is zero or negative (`amount = 0`).	"1. Prepare JSON body: {""orderId"": 100, ""amount"": 0}
2. Dispatch `POST /api/suppliers/1/payments`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.INVALID_PAYMENT_AMOUNT)`."	User has `SUPPLIER:PAYMENT`. Import order 100 exists.	Passed	10/08/2026	dungnthe180742
TC_SUP_PAY_03	Reject debt payment when amount exceeds remaining order debt (`amount > remainingDebt`).	"1. Prepare JSON body: {""orderId"": 100, ""amount"": 20000000}
2. Dispatch `POST /api/suppliers/1/payments`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.PAYMENT_EXCEEDS_DEBT)`. Payment not recorded."	Import order 100 remaining debt is 10,000,000 VND (< 20,000,000).	Passed	10/08/2026	dungnthe180742
TC_SUP_PAY_04	Reject debt payment for non-existent import order or order belonging to another supplier.	"1. Prepare JSON body: {""orderId"": 99999, ""amount"": 1000000}
2. Dispatch `POST /api/suppliers/1/payments`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`."	Import order ID 99999 does not exist or does not belong to supplier 1.	Passed	10/08/2026	dungnthe180742
Supplier Payment History							
TC_SUP_HIS_01	Query supplier payment history with default pagination.	"1. Dispatch `GET /api/suppliers/1/payments`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy lịch sử thanh toán nợ thành công""`
3. `result.content` returns payment transactions sorted by `paymentDate` descending, with `remainingDebtAfter` dynamically derived."	User has `SUPPLIER:VIEW`. Supplier 1 has recorded payments.	Passed	10/08/2026	dungnthe180742
TC_SUP_HIS_02	Filter payment history by date range (`fromDate`, `toDate`) and payment code search.	1. Dispatch `GET /api/suppliers/1/payments?fromDate=2026-08-01&toDate=2026-08-15&search=TTN000001`.	"1. HTTP Status Code: `200 OK`
2. Content filtered strictly within date window and matching search keyword ""TTN000001""."	Payments exist within date range 2026-08-01 to 2026-08-15.	Passed	10/08/2026	dungnthe180742
TC_SUP_HIS_03	Reject querying payment history for non-existent supplier ID 99999.	1. Dispatch `GET /api/suppliers/99999/payments`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`."	Supplier ID 99999 does not exist.	Passed	10/08/2026	dungnthe180742
```
