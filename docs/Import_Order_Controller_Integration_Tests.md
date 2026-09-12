# Integration Test Cases - Purchase & Import Order Management (`ImportOrderController`)

### 📋 Controller Overview & Test Objectives (Mô tả Controller & Mục tiêu Kiểm thử)

| Mục | Chi tiết |
| :--- | :--- |
| **Controller** | `ImportOrderController` (`project.be_sep490_g67.controller.ImportOrderController`) |
| **Base API Path** | `/api/import-orders` |
| **Mô tả nghiệp vụ** | Quản lý quy trình nhập hàng hóa từ nhà cung cấp cho tiệm tạp hóa / siêu thị mini. Hỗ trợ tạo phiếu tạm (DRAFT), hoàn thành nhập hàng tạo lô tồn kho (IMPORTED), cấn trừ công nợ từ các dòng hàng đổi/trả nhà cung cấp, gợi ý số lượng nhập thông minh và quản lý thanh toán tiền hàng. |
| **Phạm vi API kiểm thử** | **1. `POST /api/import-orders`**: Tạo 1 phiếu nhập (DRAFT hoặc IMPORTED tạo lô tăng tồn, cấn trừ hàng trả, ghi nhận thanh toán ban đầu).<br>**2. `POST /api/import-orders/from-suggest`**: Tạo nhiều phiếu tạm DRAFT gom theo từng nhà cung cấp từ màn hình gợi ý nhập hàng.<br>**3. `GET /api/import-orders`**: Lấy danh sách phiếu nhập phân trang, lọc theo trạng thái (`DRAFT`, `IMPORTED`), tìm kiếm và lọc khoảng ngày.<br>**4. `GET /api/import-orders/pending-returns`**: Lấy danh sách sản phẩm đổi/trả đang chờ NCC giải quyết để cấn trừ vào đơn nhập.<br>**5. `POST /api/import-orders/suggest`**: Tạo gợi ý nhập hàng dựa trên tốc độ bán và số ngày tồn kho an toàn.<br>**6. `GET /api/import-orders/{id}`**: Lấy chi tiết phiếu nhập kèm danh sách sản phẩm, đơn vị quy đổi, ảnh hóa đơn và hàng trả cấn trừ.<br>**7. `GET /api/import-orders/{id}/payments`**: Lấy lịch sử các đợt thanh toán nợ của phiếu nhập.<br>**8. `PUT /api/import-orders/{id}`**: Cập nhật phiếu tạm (sửa chi tiết hoặc hoàn thành phiếu nhập).<br>**9. `DELETE /api/import-orders/{id}`**: Hủy phiếu tạm DRAFT (giải phóng dòng hàng trả liên kết). |
| **Mục tiêu Integration Test** | Xác thực vòng đời phiếu nhập hàng (nháp và đã nhập), ràng buộc tạo lô tăng tồn kho, bắt buộc ảnh hóa đơn, cấn trừ hàng đổi trả và ngăn chặn chỉnh sửa/hủy phiếu đã nhập. |

> **Note**: File này được tổng hợp và chuẩn hóa theo đúng cấu trúc bảng yêu cầu: `Test Case ID`, `Test Case Description`, `Test Case Procedure`, `Expected Results`, `Pre-conditions`, `Round 1`, `Test date`, `Tester`. Bạn có thể sao chép trực tiếp dữ liệu từ các bảng dưới đây vào file Excel.

---

### Bảng Thông Tin Module (Sheet Header)

| Attribute | Value |
| :--- | :--- |
| **Feature** | Purchase & Import Order Management (`ImportOrderController`) |
| **Test requirement** | Standardized integration tests for all 9 API endpoints in `ImportOrderController`: single import order creation (DRAFT/IMPORTED) with batch and movement tracking, draft creation from suggestions grouped by supplier, multi-filter import listing, pending returns offset, AI suggestions, order detail retrieval, payment logs, draft update, and draft cancellation. |
| **Number of TCs** | 36 |
| **Testing Round** | Passed: 36 \| Failed: 0 \| Pending: 0 \| N/A: 0 |

---

### Bảng Integration Test Cases (`ImportOrderController`)

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Single Import Order** | | | | | | | |
| **TC_IMP_ORD_01** | Create DRAFT import order successfully without supplier and invoice image. | 1. Prepare JSON body:<br>`{"orderStatus": "DRAFT", "lines": [{"productId": 1, "quantity": 10, "costPerUnit": 25000}]}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `201 Created`<br>2. Response Body contains `message: "Tạo phiếu nhập hàng thành công"`<br>3. `result.orderStatus = "DRAFT"`, `result.orderCode` generated (`NHddMMyy-XX`).<br>4. In DB, record created with `isRemoved = false`, no `StockBatch` created. | Product ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_02** | Create IMPORTED import order successfully with supplier, invoice image, and lines. | 1. Prepare JSON body:<br>`{"supplierId": 1, "orderStatus": "IMPORTED", "invoiceImage": "https://res.cloudinary.com/demo/inv1.jpg", "lines": [{"productId": 1, "quantity": 20, "costPerUnit": 25000, "expiryDate": "2027-12-31"}]}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `201 Created`<br>2. `result.orderStatus = "IMPORTED"`, `result.receivedDate` set to today.<br>3. In DB, creates `StockBatch` with code `LddMMyy-XX` and `quantityIn = 20`.<br>4. Creates `StockMovement` of type `IMPORT`. | Supplier ID 1 and Product ID 1 exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_03** | Create IMPORTED import order with upfront payment (`paidAmount > 0`). | 1. Prepare JSON body:<br>`{"supplierId": 1, "orderStatus": "IMPORTED", "invoiceImage": "https://...", "paidAmount": 300000, "paymentMethod": "CASH", "lines": [{"productId": 1, "quantity": 20, "costPerUnit": 25000}]}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `201 Created`<br>2. `result.paidAmount = 300000.00`, `result.remainingDebt = 200000.00`.<br>3. DB records `SupplierPayment` entry with code `TTN000001`. | Supplier ID 1 exists, order total is 500,000 VND. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_04** | Create IMPORTED order with promotional item (`isPromotion = true`, `lineTotal = 0`). | 1. Prepare JSON body with promotional item:<br>`{"supplierId": 1, "orderStatus": "IMPORTED", "invoiceImage": "https://...", "lines": [{"productId": 1, "quantity": 5, "costPerUnit": 25000, "isPromotion": true}]}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `201 Created`<br>2. `result.totalCost = 0.00`.<br>3. In DB, `StockBatch` created with `quantityIn = 5` and `costPerUnit = 25000.00` (free of charge). | Product ID 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_05** | Create IMPORTED order with return deduction from pending return lines (`returnLineIds`). | 1. Prepare JSON body with `returnLineIds: [10]` where return line value is 100,000 VND.<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `201 Created`<br>2. `result.totalCost` reduced by 100,000 VND return deduction.<br>3. Return line status updated to settled. | Pending return line 10 exists for Supplier 1. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_06** | Reject creating IMPORTED order when `supplierId` is missing. | 1. Prepare JSON body: `{"orderStatus": "IMPORTED", "invoiceImage": "https://...", "lines": [{"productId": 1, "quantity": 10, "costPerUnit": 20000}]}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.SUPPLIER_REQUIRED_FOR_IMPORT)` ("Vui lòng chọn nhà cung cấp trước khi hoàn thành phiếu nhập hàng."). | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_07** | Reject creating IMPORTED order when `invoiceImage` is null or blank. | 1. Prepare JSON body: `{"supplierId": 1, "orderStatus": "IMPORTED", "invoiceImage": "", "lines": [{"productId": 1, "quantity": 10, "costPerUnit": 20000}]}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.IMPORT_INVOICE_REQUIRED)` ("Vui lòng tải ảnh hóa đơn trước khi hoàn thành phiếu nhập hàng."). | Supplier ID 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_08** | Reject creating order when both `lines` and `returnLineIds` are empty. | 1. Prepare JSON body: `{"orderStatus": "DRAFT", "lines": []}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.IMPORT_ITEMS_EMPTY)`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_09** | Reject creating order with invalid discount (`discountAmount > goodsTotal` or `< 0`). | 1. Prepare JSON body: `{"orderStatus": "DRAFT", "discountAmount": 1000000, "lines": [{"productId": 1, "quantity": 10, "costPerUnit": 20000}]}` (goodsTotal = 200k).<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.INVALID_IMPORT_DISCOUNT)`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_10** | Reject creating order with invalid paid amount (`paidAmount > amountDue`). | 1. Prepare JSON body: `{"supplierId": 1, "orderStatus": "IMPORTED", "invoiceImage": "https://...", "paidAmount": 500000, "lines": [{"productId": 1, "quantity": 10, "costPerUnit": 20000}]}` (amountDue = 200k).<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.INVALID_IMPORT_PAID_AMOUNT)`. | Supplier ID 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_11** | Reject creating order for non-existent product ID 99999. | 1. Prepare JSON body: `{"orderStatus": "DRAFT", "lines": [{"productId": 99999, "quantity": 10, "costPerUnit": 20000}]}`<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.PRODUCT_NOT_FOUND)`. | Product ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_ORD_12** | Reject creating order for parent product variant group. | 1. Prepare JSON body with `productId` of parent product group.<br>2. Dispatch `POST /api/import-orders`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.PARENT_PRODUCT_NOT_SELLABLE)`. | Parent product with sub-variants exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Create Drafts from Suggestion** | | | | | | | |
| **TC_IMP_SUG_01** | Create multiple DRAFT import orders from suggestion grouped by supplier successfully. | 1. Prepare JSON body with lines for Supplier 1 and Supplier 2:<br>`{"lines": [{"productId": 1, "supplierId": 1, "quantity": 10}, {"productId": 2, "supplierId": 2, "quantity": 15}]}`<br>2. Dispatch `POST /api/import-orders/from-suggest`. | 1. HTTP Status Code: `201 Created`<br>2. Response Body contains `message: "Tạo đơn nhập hàng thành công"`<br>3. `result` contains 2 `ImportOrderResponse` objects grouped by Supplier 1 and Supplier 2.<br>4. In DB, 2 DRAFT import orders created without stock increase. | Suppliers 1 & 2, Products 1 & 2 exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_SUG_02** | Reject creating drafts from suggest when `lines` list is empty. | 1. Prepare JSON body: `{"lines": []}`<br>2. Dispatch `POST /api/import-orders/from-suggest`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Đơn nhập phải có ít nhất một dòng sản phẩm"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_SUG_03** | Reject creating drafts when any line item has quantity <= 0. | 1. Prepare JSON body: `{"lines": [{"productId": 1, "supplierId": 1, "quantity": 0}]}`<br>2. Dispatch `POST /api/import-orders/from-suggest`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Số lượng phải lớn hơn 0"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_SUG_04** | Reject creating drafts when supplier in suggest line does not exist (ID 99999). | 1. Prepare JSON body: `{"lines": [{"productId": 1, "supplierId": 99999, "quantity": 10}]}`<br>2. Dispatch `POST /api/import-orders/from-suggest`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`. | Supplier ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Import Orders Listing & Multi-Filtering** | | | | | | | |
| **TC_IMP_LST_01** | Query import orders list with default pagination (page 0, size 10). | 1. Dispatch `GET /api/import-orders`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy danh sách đơn nhập hàng thành công"`<br>3. `result.content` returns up to 10 orders, `result.page = 0`, `result.size = 10`, `result.totalElements` correctly populated. | User authenticated. Database contains import orders. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_LST_02** | Filter import orders by order status (`orderStatus = "IMPORTED"`). | 1. Dispatch `GET /api/import-orders?orderStatus=IMPORTED`<br>2. Inspect response items. | 1. HTTP Status Code: `200 OK`<br>2. All returned items have `orderStatus = "IMPORTED"`. | DRAFT and IMPORTED orders exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_LST_03** | Search import orders by keyword (matching order code or supplier name). | 1. Dispatch `GET /api/import-orders?search=NH300826`<br>2. Inspect response content. | 1. HTTP Status Code: `200 OK`<br>2. Returns only orders matching code "NH300826". | Target order exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_LST_04** | Filter import orders by date range (`fromDate`, `toDate`). | 1. Dispatch `GET /api/import-orders?fromDate=2026-08-01&toDate=2026-08-25`<br>2. Inspect response items. | 1. HTTP Status Code: `200 OK`<br>2. Content filtered strictly within date window. | Orders exist within date range. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_LST_05** | Filter import orders with combined search, status, and date range. | 1. Dispatch `GET /api/import-orders?search=Kinh Đô&orderStatus=IMPORTED&fromDate=2026-08-01&toDate=2026-08-30`. | 1. HTTP Status Code: `200 OK`<br>2. Result strictly matches all composite criteria. | Matching orders exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Pending Supplier Returns** | | | | | | | |
| **TC_IMP_RET_01** | Query pending supplier return lines for an existing supplier. | 1. Dispatch `GET /api/import-orders/pending-returns?supplierId=1`<br>2. Inspect response list. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy sản phẩm đổi/trả đang chờ của nhà cung cấp thành công"`<br>3. `result` contains list of `ImportOrderReturnLineResponse` in `WAITING_SUPPLIER` status. | Supplier 1 has pending return lines in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_RET_02** | Query pending supplier return lines when supplier has no pending returns. | 1. Dispatch `GET /api/import-orders/pending-returns?supplierId=2`. | 1. HTTP Status Code: `200 OK`<br>2. `result: []` (empty array). | Supplier 2 has zero pending return lines. | Passed | 10/08/2026 | dungnthe180742 |
| **Import Suggestion** | | | | | | | |
| **TC_IMP_SGN_01** | Generate smart import suggestions for given product list. | 1. Prepare JSON body: `{"productIds": [1, 2]}`<br>2. Dispatch `POST /api/import-orders/suggest`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Gửi gợi ý thành công"`<br>3. `result` contains suggestion items with recommended order quantities and supplier info based on sales velocity. | Products 1 & 2 exist with sales history. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_SGN_02** | Generate smart import suggestions with custom cover days override (`coverOverrides`). | 1. Prepare JSON body: `{"productIds": [1], "coverOverrides": {"1": 14}}`<br>2. Dispatch `POST /api/import-orders/suggest`. | 1. HTTP Status Code: `200 OK`<br>2. Suggestion calculated using 14 cover days. | Product 1 exists. | Passed | 10/08/2026 | dungnthe180742 |
| **Import Order Detail** | | | | | | | |
| **TC_IMP_DET_01** | Get full import order detail for existing active import order ID 1. | 1. Dispatch `GET /api/import-orders/1`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy chi tiết đơn nhập hàng thành công"`<br>3. `result` contains `id: 1`, `orderCode`, `supplierId`, `supplierName`, `goodsTotal`, `discountAmount`, `returnDeductionAmount`, `totalCost`, `paidAmount`, `remainingDebt`, `invoiceImage`, `items`, and `returnLines`. | Import order ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_DET_02** | Reject getting detail for non-existent import order ID 99999. | 1. Dispatch `GET /api/import-orders/99999`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`. | Import order ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Import Order Payment History** | | | | | | | |
| **TC_IMP_PAY_01** | Query paginated payment history for a specific import order ID 1. | 1. Dispatch `GET /api/import-orders/1/payments`<br>2. Inspect HTTP status and response items. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Lấy lịch sử thanh toán đơn nhập hàng thành công"`<br>3. `result.content` returns list of `SupplierPaymentResponse` associated with order ID 1. | Import order ID 1 has recorded supplier payments. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_PAY_02** | Query payment history for an order with zero payments made. | 1. Dispatch `GET /api/import-orders/2/payments`. | 1. HTTP Status Code: `200 OK`<br>2. `result.content: []`, `result.totalElements = 0`. | Order ID 2 has no recorded payments. | Passed | 10/08/2026 | dungnthe180742 |
| **Update Import Order** | | | | | | | |
| **TC_IMP_UPD_01** | Update existing DRAFT import order details and keep status as DRAFT. | 1. Prepare JSON body: `{"orderStatus": "DRAFT", "lines": [{"productId": 1, "quantity": 15, "costPerUnit": 26000}]}`<br>2. Dispatch `PUT /api/import-orders/1`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Cập nhật phiếu nhập hàng thành công"`<br>3. `result.orderStatus = "DRAFT"`, lines updated in DB without stock batch creation. | Import order ID 1 exists with `orderStatus = "DRAFT"`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_UPD_02** | Complete DRAFT import order to IMPORTED status (increases stock, creates batches). | 1. Prepare JSON body:<br>`{"supplierId": 1, "orderStatus": "IMPORTED", "invoiceImage": "https://...", "lines": [{"productId": 1, "quantity": 15, "costPerUnit": 26000}]}`<br>2. Dispatch `PUT /api/import-orders/1`. | 1. HTTP Status Code: `200 OK`<br>2. `result.orderStatus = "IMPORTED"`, `result.receivedDate` set to today.<br>3. In DB, creates `StockBatch` and increments stock. | Import order ID 1 exists with `orderStatus = "DRAFT"`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_UPD_03** | Reject updating completed import order (`orderStatus = "IMPORTED"`). | 1. Prepare valid JSON body, dispatch `PUT /api/import-orders/2` where Order 2 is `IMPORTED`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.IMPORT_ORDER_NOT_EDITABLE)` ("Chỉ được sửa phiếu tạm. Phiếu đã nhập hàng không thể chỉnh sửa."). | Import order ID 2 has `orderStatus = "IMPORTED"`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_UPD_04** | Reject updating non-existent import order ID 99999. | 1. Dispatch `PUT /api/import-orders/99999` with valid body. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`. | Import order ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **Cancel Draft Import Order** | | | | | | | |
| **TC_IMP_DEL_01** | Cancel DRAFT import order successfully (soft-delete). | 1. Dispatch `DELETE /api/import-orders/1`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `message: "Đã hủy phiếu tạm thành công"`<br>3. In DB, order record ID 1 has `isRemoved = true`; attached return lines released back to WAITING_SUPPLIER. | Import order ID 1 exists with `orderStatus = "DRAFT"`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_DEL_02** | Reject cancelling completed import order (`orderStatus = "IMPORTED"`). | 1. Dispatch `DELETE /api/import-orders/2`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Throws `AppException(ErrorCode.IMPORT_ORDER_NOT_DELETABLE)` ("Chỉ được hủy phiếu tạm. Phiếu đã nhập hàng không thể xóa."). | Import order ID 2 has `orderStatus = "IMPORTED"`. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_IMP_DEL_03** | Reject cancelling non-existent import order ID 99999. | 1. Dispatch `DELETE /api/import-orders/99999`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`. | Import order ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |

---

### Direct TSV / Copy-Paste Text Block (for Excel)

```tsv
Test Case ID	Test Case Description	Test Case Procedure	Expected Results	Pre-conditions	Round 1	Test date	Tester
Create Single Import Order							
TC_IMP_ORD_01	Create DRAFT import order successfully without supplier and invoice image.	"1. Prepare JSON body:
{""orderStatus"": ""DRAFT"", ""lines"": [{""productId"": 1, ""quantity"": 10, ""costPerUnit"": 25000}]}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `201 Created`
2. Response Body contains `message: ""Tạo phiếu nhập hàng thành công""`
3. `result.orderStatus = ""DRAFT""`, `result.orderCode` generated (`NHddMMyy-XX`).
4. In DB, record created with `isRemoved = false`, no `StockBatch` created."	Product ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_02	Create IMPORTED import order successfully with supplier, invoice image, and lines.	"1. Prepare JSON body:
{""supplierId"": 1, ""orderStatus"": ""IMPORTED"", ""invoiceImage"": ""https://res.cloudinary.com/demo/inv1.jpg"", ""lines"": [{""productId"": 1, ""quantity"": 20, ""costPerUnit"": 25000, ""expiryDate"": ""2027-12-31""}]}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `201 Created`
2. `result.orderStatus = ""IMPORTED""`, `result.receivedDate` set to today.
3. In DB, creates `StockBatch` with code `LddMMyy-XX` and `quantityIn = 20`.
4. Creates `StockMovement` of type `IMPORT`."	Supplier ID 1 and Product ID 1 exist in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_03	Create IMPORTED import order with upfront payment (`paidAmount > 0`).	"1. Prepare JSON body:
{""supplierId"": 1, ""orderStatus"": ""IMPORTED"", ""invoiceImage"": ""https://..."", ""paidAmount"": 300000, ""paymentMethod"": ""CASH"", ""lines"": [{""productId"": 1, ""quantity"": 20, ""costPerUnit"": 25000}]}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `201 Created`
2. `result.paidAmount = 300000.00`, `result.remainingDebt = 200000.00`.
3. DB records `SupplierPayment` entry with code `TTN000001`."	Supplier ID 1 exists, order total is 500,000 VND.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_04	Create IMPORTED order with promotional item (`isPromotion = true`, `lineTotal = 0`).	"1. Prepare JSON body with promotional item:
{""supplierId"": 1, ""orderStatus"": ""IMPORTED"", ""invoiceImage"": ""https://..."", ""lines"": [{""productId"": 1, ""quantity"": 5, ""costPerUnit"": 25000, ""isPromotion"": true}]}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `201 Created`
2. `result.totalCost = 0.00`.
3. In DB, `StockBatch` created with `quantityIn = 5` and `costPerUnit = 25000.00` (free of charge)."	Product ID 1 exists.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_05	Create IMPORTED order with return deduction from pending return lines (`returnLineIds`).	"1. Prepare JSON body with `returnLineIds: [10]` where return line value is 100,000 VND.
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `201 Created`
2. `result.totalCost` reduced by 100,000 VND return deduction.
3. Return line status updated to settled."	Pending return line 10 exists for Supplier 1.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_06	Reject creating IMPORTED order when `supplierId` is missing.	"1. Prepare JSON body: {""orderStatus"": ""IMPORTED"", ""invoiceImage"": ""https://..."", ""lines"": [{""productId"": 1, ""quantity"": 10, ""costPerUnit"": 20000}]}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.SUPPLIER_REQUIRED_FOR_IMPORT)` (""Vui lòng chọn nhà cung cấp trước khi hoàn thành phiếu nhập hàng."")."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_07	Reject creating IMPORTED order when `invoiceImage` is null or blank.	"1. Prepare JSON body: {""supplierId"": 1, ""orderStatus"": ""IMPORTED"", ""invoiceImage"": """", ""lines"": [{""productId"": 1, ""quantity"": 10, ""costPerUnit"": 20000}]}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.IMPORT_INVOICE_REQUIRED)` (""Vui lòng tải ảnh hóa đơn trước khi hoàn thành phiếu nhập hàng."")."	Supplier ID 1 exists.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_08	Reject creating order when both `lines` and `returnLineIds` are empty.	"1. Prepare JSON body: {""orderStatus"": ""DRAFT"", ""lines"": []}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.IMPORT_ITEMS_EMPTY)`."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_09	Reject creating order with invalid discount (`discountAmount > goodsTotal` or `< 0`).	"1. Prepare JSON body: {""orderStatus"": ""DRAFT"", ""discountAmount"": 1000000, ""lines"": [{""productId"": 1, ""quantity"": 10, ""costPerUnit"": 20000}]} (goodsTotal = 200k).
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.INVALID_IMPORT_DISCOUNT)`."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_10	Reject creating order with invalid paid amount (`paidAmount > amountDue`).	"1. Prepare JSON body: {""supplierId"": 1, ""orderStatus"": ""IMPORTED"", ""invoiceImage"": ""https://..."", ""paidAmount"": 500000, ""lines"": [{""productId"": 1, ""quantity"": 10, ""costPerUnit"": 20000}]} (amountDue = 200k).
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.INVALID_IMPORT_PAID_AMOUNT)`."	Supplier ID 1 exists.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_11	Reject creating order for non-existent product ID 99999.	"1. Prepare JSON body: {""orderStatus"": ""DRAFT"", ""lines"": [{""productId"": 99999, ""quantity"": 10, ""costPerUnit"": 20000}]}
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.PRODUCT_NOT_FOUND)`."	Product ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_ORD_12	Reject creating order for parent product variant group.	"1. Prepare JSON body with `productId` of parent product group.
2. Dispatch `POST /api/import-orders`."	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.PARENT_PRODUCT_NOT_SELLABLE)`."	Parent product with sub-variants exists in DB.	Passed	10/08/2026	dungnthe180742
Create Drafts from Suggestion							
TC_IMP_SUG_01	Create multiple DRAFT import orders from suggestion grouped by supplier successfully.	"1. Prepare JSON body with lines for Supplier 1 and Supplier 2:
{""lines"": [{""productId"": 1, ""supplierId"": 1, ""quantity"": 10}, {""productId"": 2, ""supplierId"": 2, ""quantity"": 15}]}
2. Dispatch `POST /api/import-orders/from-suggest`."	"1. HTTP Status Code: `201 Created`
2. Response Body contains `message: ""Tạo đơn nhập hàng thành công""`
3. `result` contains 2 `ImportOrderResponse` objects grouped by Supplier 1 and Supplier 2.
4. In DB, 2 DRAFT import orders created without stock increase."	Suppliers 1 & 2, Products 1 & 2 exist in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_SUG_02	Reject creating drafts from suggest when `lines` list is empty.	"1. Prepare JSON body: {""lines"": []}
2. Dispatch `POST /api/import-orders/from-suggest`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Đơn nhập phải có ít nhất một dòng sản phẩm""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_IMP_SUG_03	Reject creating drafts when any line item has quantity <= 0.	"1. Prepare JSON body: {""lines"": [{""productId"": 1, ""supplierId"": 1, ""quantity"": 0}]}
2. Dispatch `POST /api/import-orders/from-suggest`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Số lượng phải lớn hơn 0""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_IMP_SUG_04	Reject creating drafts when supplier in suggest line does not exist (ID 99999).	"1. Prepare JSON body: {""lines"": [{""productId"": 1, ""supplierId"": 99999, ""quantity"": 10}]}
2. Dispatch `POST /api/import-orders/from-suggest`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_SUPPLIER)`."	Supplier ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
Import Orders Listing & Multi-Filtering							
TC_IMP_LST_01	Query import orders list with default pagination (page 0, size 10).	"1. Dispatch `GET /api/import-orders`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy danh sách đơn nhập hàng thành công""`
3. `result.content` returns up to 10 orders, `result.page = 0`, `result.size = 10`, `result.totalElements` correctly populated."	User authenticated. Database contains import orders.	Passed	10/08/2026	dungnthe180742
TC_IMP_LST_02	Filter import orders by order status (`orderStatus = ""IMPORTED""`).	"1. Dispatch `GET /api/import-orders?orderStatus=IMPORTED`
2. Inspect response items."	"1. HTTP Status Code: `200 OK`
2. All returned items have `orderStatus = ""IMPORTED""`."	DRAFT and IMPORTED orders exist in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_LST_03	Search import orders by keyword (matching order code or supplier name).	"1. Dispatch `GET /api/import-orders?search=NH300826`
2. Inspect response content."	"1. HTTP Status Code: `200 OK`
2. Returns only orders matching code ""NH300826""."	Target order exists in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_LST_04	Filter import orders by date range (`fromDate`, `toDate`).	"1. Dispatch `GET /api/import-orders?fromDate=2026-08-01&toDate=2026-08-25`
2. Inspect response items."	"1. HTTP Status Code: `200 OK`
2. Content filtered strictly within date window."	Orders exist within date range.	Passed	10/08/2026	dungnthe180742
TC_IMP_LST_05	Filter import orders with combined search, status, and date range.	1. Dispatch `GET /api/import-orders?search=Kinh Đô&orderStatus=IMPORTED&fromDate=2026-08-01&toDate=2026-08-30`.	"1. HTTP Status Code: `200 OK`
2. Result strictly matches all composite criteria."	Matching orders exist in DB.	Passed	10/08/2026	dungnthe180742
Pending Supplier Returns							
TC_IMP_RET_01	Query pending supplier return lines for an existing supplier.	"1. Dispatch `GET /api/import-orders/pending-returns?supplierId=1`
2. Inspect response list."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy sản phẩm đổi/trả đang chờ của nhà cung cấp thành công""`
3. `result` contains list of `ImportOrderReturnLineResponse` in `WAITING_SUPPLIER` status."	Supplier 1 has pending return lines in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_RET_02	Query pending supplier return lines when supplier has no pending returns.	1. Dispatch `GET /api/import-orders/pending-returns?supplierId=2`.	"1. HTTP Status Code: `200 OK`
2. `result: []` (empty array)."	Supplier 2 has zero pending return lines.	Passed	10/08/2026	dungnthe180742
Import Suggestion							
TC_IMP_SGN_01	Generate smart import suggestions for given product list.	"1. Prepare JSON body: {""productIds"": [1, 2]}
2. Dispatch `POST /api/import-orders/suggest`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Gửi gợi ý thành công""`
3. `result` contains suggestion items with recommended order quantities and supplier info based on sales velocity."	Products 1 & 2 exist with sales history.	Passed	10/08/2026	dungnthe180742
TC_IMP_SGN_02	Generate smart import suggestions with custom cover days override (`coverOverrides`).	"1. Prepare JSON body: {""productIds"": [1], ""coverOverrides"": {""1"": 14}}
2. Dispatch `POST /api/import-orders/suggest`."	"1. HTTP Status Code: `200 OK`
2. Suggestion calculated using 14 cover days."	Product 1 exists.	Passed	10/08/2026	dungnthe180742
Import Order Detail							
TC_IMP_DET_01	Get full import order detail for existing active import order ID 1.	"1. Dispatch `GET /api/import-orders/1`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy chi tiết đơn nhập hàng thành công""`
3. `result` contains `id: 1`, `orderCode`, `supplierId`, `supplierName`, `goodsTotal`, `discountAmount`, `returnDeductionAmount`, `totalCost`, `paidAmount`, `remainingDebt`, `invoiceImage`, `items`, and `returnLines`."	Import order ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_IMP_DET_02	Reject getting detail for non-existent import order ID 99999.	1. Dispatch `GET /api/import-orders/99999`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`."	Import order ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
Import Order Payment History							
TC_IMP_PAY_01	Query paginated payment history for a specific import order ID 1.	"1. Dispatch `GET /api/import-orders/1/payments`
2. Inspect HTTP status and response items."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Lấy lịch sử thanh toán đơn nhập hàng thành công""`
3. `result.content` returns list of `SupplierPaymentResponse` associated with order ID 1."	Import order ID 1 has recorded supplier payments.	Passed	10/08/2026	dungnthe180742
TC_IMP_PAY_02	Query payment history for an order with zero payments made.	1. Dispatch `GET /api/import-orders/2/payments`.	"1. HTTP Status Code: `200 OK`
2. `result.content: []`, `result.totalElements = 0`."	Order ID 2 has no recorded payments.	Passed	10/08/2026	dungnthe180742
Update Import Order							
TC_IMP_UPD_01	Update existing DRAFT import order details and keep status as DRAFT.	"1. Prepare JSON body: {""orderStatus"": ""DRAFT"", ""lines"": [{""productId"": 1, ""quantity"": 15, ""costPerUnit"": 26000}]}
2. Dispatch `PUT /api/import-orders/1`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Cập nhật phiếu nhập hàng thành công""`
3. `result.orderStatus = ""DRAFT""`, lines updated in DB without stock batch creation."	Import order ID 1 exists with `orderStatus = ""DRAFT""`.	Passed	10/08/2026	dungnthe180742
TC_IMP_UPD_02	Complete DRAFT import order to IMPORTED status (increases stock, creates batches).	"1. Prepare JSON body:
{""supplierId"": 1, ""orderStatus"": ""IMPORTED"", ""invoiceImage"": ""https://..."", ""lines"": [{""productId"": 1, ""quantity"": 15, ""costPerUnit"": 26000}]}
2. Dispatch `PUT /api/import-orders/1`."	"1. HTTP Status Code: `200 OK`
2. `result.orderStatus = ""IMPORTED""`, `result.receivedDate` set to today.
3. In DB, creates `StockBatch` and increments stock."	Import order ID 1 exists with `orderStatus = ""DRAFT""`.	Passed	10/08/2026	dungnthe180742
TC_IMP_UPD_03	Reject updating completed import order (`orderStatus = ""IMPORTED""`).	1. Prepare valid JSON body, dispatch `PUT /api/import-orders/2` where Order 2 is `IMPORTED`.	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.IMPORT_ORDER_NOT_EDITABLE)` (""Chỉ được sửa phiếu tạm. Phiếu đã nhập hàng không thể chỉnh sửa."")."	Import order ID 2 has `orderStatus = ""IMPORTED""`.	Passed	10/08/2026	dungnthe180742
TC_IMP_UPD_04	Reject updating non-existent import order ID 99999.	1. Dispatch `PUT /api/import-orders/99999` with valid body.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`."	Import order ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
Cancel Draft Import Order							
TC_IMP_DEL_01	Cancel DRAFT import order successfully (soft-delete).	1. Dispatch `DELETE /api/import-orders/1`.	"1. HTTP Status Code: `200 OK`
2. Response Body contains `message: ""Đã hủy phiếu tạm thành công""`
3. In DB, order record ID 1 has `isRemoved = true`; attached return lines released back to WAITING_SUPPLIER."	Import order ID 1 exists with `orderStatus = ""DRAFT""`.	Passed	10/08/2026	dungnthe180742
TC_IMP_DEL_02	Reject cancelling completed import order (`orderStatus = ""IMPORTED""`).	1. Dispatch `DELETE /api/import-orders/2`.	"1. HTTP Status Code: `400 Bad Request`
2. Throws `AppException(ErrorCode.IMPORT_ORDER_NOT_DELETABLE)` (""Chỉ được hủy phiếu tạm. Phiếu đã nhập hàng không thể xóa."")."	Import order ID 2 has `orderStatus = ""IMPORTED""`.	Passed	10/08/2026	dungnthe180742
TC_IMP_DEL_03	Reject cancelling non-existent import order ID 99999.	1. Dispatch `DELETE /api/import-orders/99999`.	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.NOT_FOUND_IMPORT_ORDER)`."	Import order ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
```
