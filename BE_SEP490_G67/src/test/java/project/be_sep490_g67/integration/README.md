# POS — Backend Integration Test Specification

Three features, three sheets. Each section below is self-contained and maps 1:1 to one sheet of the test-case workbook.

| Sheet | Feature | TCs | Sequence diagram | Test class group |
|---|---|---|---|---|
| 1 | Add Product to Cart | 7 | SD-POS-01 (`SD_ADD_PRODUCT_TO_CART.md`) | `PosIntegrationTest$ScanBarcodeIntegration` |
| 2 | Checkout — Create Sales Order | 8 | SD-POS-02 (`SD_CREATE_SALES_ORDER.md`) | `PosIntegrationTest$AddProductToCartIntegration` |
| 3 | Print Invoice | 12 | SD-POS-03 (`SD_PRINT_INVOICE.md`) | `PosIntegrationTest$PrintInvoiceIntegration` |

One sheet, one feature, one diagram.

**Why scan and search sit in one sheet.** They are two entry paths into the **same** feature, not two features: both end at "Cart Updated Successfully" and both make exactly one backend look-up. They were previously drawn as two diagrams (*SD-POS-02 — Scan Barcode* and *SD-POS-01 — Search by Name*), which duplicated the whole cart-update tail; they are now a single diagram, SD-POS-01, with the entry path as branch A1/A8 and the shared tail in `opt A14`. Per **BR-CART-06** all cart operations happen client-side with no backend call until checkout, so the `POST /api/sales-orders` cases are a separate feature (Sheet 2), not the tail of this one.

> **Note on naming.** `CD_POS_FEATURES.md` still lists "Scan Barcode" and "Add Product to Cart (search by name)" as two separate sections. This spec follows the sequence-diagram titles instead. The test class also still names its first group `ScanBarcodeIntegration` and its second `AddProductToCartIntegration`, which no longer matches this grouping — see *Follow-up* at the end.

Test file: `src/test/java/project/be_sep490_g67/integration/PosIntegrationTest.java`
Run: `./mvnw test -Dtest=PosIntegrationTest`

## How to read the Expected Results column

Each cell gives the HTTP status followed by the **exact response body** the endpoint returns for that case. These are not hand-written samples — they were captured from a real run of the endpoints on 08/08/2026 and are reproduced verbatim (whitespace aside), so they can be used directly as the expected payload when the case is re-executed.

Every response uses the `ApiResponse` envelope:

```json
{ "code": 1000, "message": "...", "result": { } }
```

- `code` — `1000` on success; on failure it is the `ErrorCode` number (e.g. `3006`), except for `ResponseStatusException`, where `GlobalExceptionHandler` copies the **HTTP status number** into `code` (e.g. `404`, `400`).
- `message` — omitted entirely when null (`ApiResponse` is annotated `@JsonInclude(NON_NULL)`).
- `result` — omitted on error responses. **Inside** `result`, null fields are *not* omitted: the payload DTOs carry no `@JsonInclude`, so unset fields appear explicitly as `null`.

## How to read the Pre-conditions column

- **Depends on** — test cases that must have been executed and passed first, because they produce the data this case consumes. `None` means the case is independent. Cross-sheet dependencies are written with the sheet name.
- **State** — the state the system must be in before the procedure starts: which account is logged in, what rows must exist, and what status they must carry.
- **PRE-ENV** — the shared environment set-up below, required by all 27 cases.

**PRE-ENV — shared environment pre-conditions**

1. The class runs as a `@WebMvcTest` slice loading only `ProductController` and `SalesOrderController`.
2. `ProductService`, `SalesOrderService`, `ExchangeOrderService`, `InvoiceService`, `ReturnLookupService`, `AuditLogService` and `UserRepository` are `@MockitoBean` mocks — no MySQL or Redis instance is needed.
3. A `ConcurrentMapCacheManager` is imported to satisfy `@EnableCaching` on the application class.
4. A user session is present via `@WithMockUser`; POST requests carry a CSRF token.

> **Automated vs. manual execution.** In the automated slice run the *Depends on* links are not enforced: each test stubs the state it needs, so the cases pass in any order and in isolation. The links describe the real data dependency, and they do apply when these cases are re-executed manually against a running system with a seeded database.

---

# Sheet 1 — Add Product to Cart

| | |
|---|---|
| **Feature** | Add Product to Cart |
| **Test requirement** | Verify the two backend look-ups a cashier uses to put a product into the cart. **Scan path (SD-POS-02):** an existing barcode returns the product with its units and sellable batches so the batch/unit can be resolved, an unknown barcode returns 404 rather than a 500, a product with no sellable batch still returns 200 with an empty batch list, and a product with several batches returns all of them so the BatchSelectModal has something to show. **Search path (SD-POS-01):** a name query returns the matching products or an empty list, and the server accepts a short query without erroring. |
| **Number of TCs** | 7 |
| **Endpoints** | `GET /api/products/barcode/{barcode}`, `GET /api/products/search?q=` |
| **Sequence diagram** | SD-POS-01 (`SD_ADD_PRODUCT_TO_CART.md`) — scan path = branch A1, search path = branch A8 |
| **Scope note** | Everything after the HTTP response — resolving the default unit, choosing the batch, incrementing a duplicate line, recalculating totals, persisting the cart — is client-side per BR-CART-06 and is not covered by these backend cases. |

| Testing Round | Passed | Failed | Pending | N/A |
|---|---|---|---|---|
| **Round 1** | 7 | 0 | 0 | 0 |
| **Round 2** | 0 | 0 | 7 | 0 |
| **Round 3** | 0 | 0 | 7 | 0 |

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester | Round 2 | Test date | Tester | Round 3 | Test date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Function A — Add by scanning barcode (SD-POS-02)** | | | | | | | | | | | | |
| SITCID-SB-01 | Scanning a barcode that exists returns the product together with its units and available stock batches. | 1. Stub `ProductService.getProductByBarcode("8934567890123")` to return a product with 1 unit and 1 batch.<br>2. `GET /api/products/barcode/8934567890123` as cashier1. | **HTTP 200**<br>`{"code":1000,"result":{"id":1,"name":"Paracetamol 500mg","barcode":"8934567890123","sellingPrice":5000,"productUnits":[{"id":1,"name":"Viên","unitBase":1}],"stockBatches":[{"id":1,"batchCode":"LOT-001","quantity":100,"expiryDate":"2027-01-01"}]}}` | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in. Product id 1 ("Paracetamol 500mg") exists with barcode 8934567890123, is ACTIVE, has exactly 1 selling unit ("Viên") and exactly 1 batch LOT-001 with quantity > 0 and expiry in the future. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-SB-02 | Scanning an unknown barcode surfaces the service's 404 to the client instead of a 500. | 1. Stub `getProductByBarcode("0000000000000")` to throw `ResponseStatusException(NOT_FOUND)`.<br>2. `GET /api/products/barcode/0000000000000`. | **HTTP 404**<br>`{"code":404,"message":"Khong tim thay san pham voi ma vach: 0000000000000"}`<br>(no `result` field) | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in. No product row carries barcode 0000000000000. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-SB-03 | A product that exists but has no sellable batch still returns 200 with an empty batch list, so the POS can show "hết hàng" rather than an error. | 1. Stub `getProductByBarcode` to return the product with `stockBatches = []`.<br>2. `GET /api/products/barcode/8934567890123`. | **HTTP 200**<br>`{"code":1000,"result":{"id":1,"name":"Paracetamol 500mg","barcode":"8934567890123","sellingPrice":5000,"productUnits":[],"stockBatches":[]}}` | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in. The product with barcode 8934567890123 exists and is ACTIVE, but every one of its batches is either quantity 0 or past its expiry date. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-SB-04 | A product with several batches returns all of them, so the cashier can pick one in the BatchSelectModal (branch A5 of SD-POS-02). | 1. Stub `getProductByBarcode` to return 2 batches (LOT-A qty 50 exp 2026-12-01, LOT-B qty 30 exp 2027-06-01).<br>2. `GET /api/products/barcode/8934567890123`. | **HTTP 200**<br>`{"code":1000,"result":{"id":1,"name":"Vitamin C 1000mg","barcode":"8934567890123","sellingPrice":12000,"productUnits":[],"stockBatches":[{"id":1,"batchCode":"LOT-A","quantity":50,"expiryDate":"2026-12-01"},{"id":2,"batchCode":"LOT-B","quantity":30,"expiryDate":"2027-06-01"}]}}` | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in. The product with barcode 8934567890123 has exactly 2 sellable batches — LOT-A (qty 50, expiry 2026-12-01) and LOT-B (qty 30, expiry 2027-06-01) — both in stock and unexpired. | Passed | 08/08/2026 | | Pending | | | Pending | |
| **Function B — Add by searching name / barcode (SD-POS-01)** | | | | | | | | | | | | |
| SITCID-SB-05 | A 1-character search term is accepted by the server; the BR-CART-01 minimum-length guard (branch A1) is a client-side concern only. | 1. Stub `searchByNameAndBarcode("P")` to return an empty list.<br>2. `GET /api/products/search?q=P`. | **HTTP 200**<br>`{"code":1000,"result":[]}`<br>(no 400, no exception) | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in. No product name or barcode matches the single character "P" under the service's matching rule. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-SB-06 | Searching by product name returns the matching products for the suggestion list (branch A5). | 1. Stub `searchByNameAndBarcode("Para")` to return 1 match.<br>2. `GET /api/products/search?q=Para`. | **HTTP 200**<br>`{"code":1000,"result":[{"id":1,"name":"Paracetamol 500mg","barcode":"8934567890123","sellingPrice":5000,"productUnits":null,"stockBatches":null}]}` | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in. Exactly one ACTIVE product ("Paracetamol 500mg", id 1) matches the term "Para". | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-SB-07 | A search with no match returns an empty list, not an error, so the UI shows the "not found" message (branch A4). | 1. Stub `searchByNameAndBarcode("XYZ_NONEXISTENT")` to return an empty list.<br>2. `GET /api/products/search?q=XYZ_NONEXISTENT`. | **HTTP 200**<br>`{"code":1000,"result":[]}` | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in. No product name or barcode contains "XYZ_NONEXISTENT". | Passed | 08/08/2026 | | Pending | | | Pending | |

---

# Sheet 2 — Checkout (Create Sales Order)

| | |
|---|---|
| **Feature** | Checkout — Create Sales Order |
| **Test requirement** | Verify the first backend call of the sale, made once the client-side cart is finalised: a cash order is created and returns 201, a debt order is routed with `isDebt = true`, the selected customer and order discount are bound and forwarded to the service intact, and failures (insufficient stock, missing product, empty cart, debt without a customer) are rejected with the correct HTTP status. |
| **Number of TCs** | 8 |
| **Endpoints** | `POST /api/sales-orders`, `POST /api/sales-orders/debt` |
| **Sequence diagram** | SD-POS-02 (`SD_CREATE_SALES_ORDER.md`), with sub-diagram SD-POS-02a for FEFO deduction. This feature begins where SD-POS-01 ends — per **BR-CART-06** the cart is held client-side and no backend call is made until this point. |
| **Note** | The mocked `SalesOrderResponse` populates only `id`, `orderCode`, `orderStatus` and `totalAmount`, so the remaining fields serialise as `null` in the bodies below. Against a live service those fields are filled in — assert on the four listed fields, not on the nulls. |

| Testing Round | Passed | Failed | Pending | N/A |
|---|---|---|---|---|
| **Round 1** | 8 | 0 | 0 | 0 |
| **Round 2** | 0 | 0 | 8 | 0 |
| **Round 3** | 0 | 0 | 8 | 0 |

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester | Round 2 | Test date | Tester | Round 3 | Test date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Function A — Cash checkout** | | | | | | | | | | | | |
| SITCID-AC-01 | A normal cash checkout creates the order and returns 201 with the order identity. | 1. Stub `userRepository.findByUsername("cashier1")` → user id 10.<br>2. Stub `createOrder(request, false, 10)` → order 100.<br>3. `POST /api/sales-orders` with 1 item (productId 1, batchId 1, unitId 1, qty 2, price 5000), paymentMethod CASH, discount 0. | **HTTP 201 Created**<br>`{"code":1000,"message":"Tạo đơn hàng thành công","result":{"id":100,"orderCode":"HD-20260001","paymentMethod":null,"orderStatus":"COMPLETED","isDebt":null,"subtotal":null,"discountAmount":null,"totalAmount":10000,"paidAmount":null,"createdAt":null,"customer":null,"items":null}}` | PRE-ENV.<br>**Depends on:** SITCID-SB-01 *(Sheet 1)* — a product must have been added to the cart before it can be checked out.<br>**State:** cashier1 (user id 10) is logged in. Product 1 / batch 1 / unit 1 exist and batch 1 holds at least 2 units of sellable stock. Cart holds exactly that one line. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-AC-03 | The selected customer is bound from the request body and passed to the service unchanged. | 1. Stub the cashier lookup.<br>2. Stub `createOrder` matching `request.customerId == 42`.<br>3. `POST /api/sales-orders` with customerId 42.<br>4. Verify the argument. | **HTTP 201 Created**<br>`{"code":1000,"message":"Tạo đơn hàng thành công","result":{"id":100,"orderCode":"HD-20260001","paymentMethod":null,"orderStatus":"COMPLETED","isDebt":null,"subtotal":null,"discountAmount":null,"totalAmount":10000,"paidAmount":null,"createdAt":null,"customer":null,"items":null}}`<br>Plus: the service received a request whose `customerId` = 42. | PRE-ENV.<br>**Depends on:** SITCID-AC-01 — the plain cash checkout must pass first; this case adds the customer dimension.<br>**State:** cashier1 is logged in. Customer id 42 exists and is ACTIVE. Cart holds one sellable line. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-AC-04 | An order-level discount is bound and forwarded to the service without loss of precision. | 1. Stub the cashier lookup.<br>2. Stub `createOrder` matching `discountAmount == 1000`.<br>3. `POST /api/sales-orders` with discountAmount 1000.<br>4. Verify the argument. | **HTTP 201 Created**<br>`{"code":1000,"message":"Tạo đơn hàng thành công","result":{"id":100,"orderCode":"HD-20260001","paymentMethod":null,"orderStatus":"COMPLETED","isDebt":null,"subtotal":null,"discountAmount":null,"totalAmount":10000,"paidAmount":null,"createdAt":null,"customer":null,"items":null}}`<br>Plus: the service received a request whose `discountAmount` compares equal to 1000. | PRE-ENV.<br>**Depends on:** SITCID-AC-01 — the plain cash checkout must pass first; this case adds the discount dimension.<br>**State:** cashier1 is logged in. Cart subtotal is 10000, i.e. greater than the 1000 discount being applied (BR-CART-07). | Passed | 08/08/2026 | | Pending | | | Pending | |
| **Function B — Debt checkout** | | | | | | | | | | | | |
| SITCID-AC-02 | Checkout on the `/debt` route forwards `isDebt = true` to the service and returns 200. | 1. Stub the cashier lookup.<br>2. Stub `createOrder(request, true, 10)` → order 100.<br>3. `POST /api/sales-orders/debt` with customerId 42.<br>4. Verify the service was called with `isDebt = true`. | **HTTP 200 OK**<br>`{"code":1000,"message":"Tạo đơn hàng nợ thành công","result":{"id":100,"orderCode":"HD-20260001","paymentMethod":null,"orderStatus":"COMPLETED","isDebt":null,"subtotal":null,"discountAmount":null,"totalAmount":10000,"paidAmount":null,"createdAt":null,"customer":null,"items":null}}`<br>Plus: `createOrder(..., true, ...)` invoked exactly once. | PRE-ENV.<br>**Depends on:** SITCID-AC-01 (checkout path works), SITCID-AC-03 (a customer can be attached to an order).<br>**State:** cashier1 is logged in. Customer id 42 exists, is ACTIVE and is permitted to buy on credit. Cart holds one sellable line. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-AC-08 | A debt order without a customer is rejected — a debt cannot be attached to a walk-in buyer (BR-39). | 1. Stub the cashier lookup.<br>2. Stub `createOrder(..., true, ...)` to throw `ResponseStatusException(BAD_REQUEST, "Don no phai co thong tin khach hang")`.<br>3. `POST /api/sales-orders/debt` with `customerId = null`. | **HTTP 400 Bad Request**<br>`{"code":400,"message":"Don no phai co thong tin khach hang"}`<br>(no `result` field) | PRE-ENV.<br>**Depends on:** SITCID-AC-02 — the happy-path debt checkout must pass first, so a failure here isolates the missing-customer rule.<br>**State:** cashier1 is logged in. Cart holds one sellable line and **no** customer is selected. | Passed | 08/08/2026 | | Pending | | | Pending | |
| **Function C — Checkout validation & error handling** | | | | | | | | | | | | |
| SITCID-AC-05 | When FEFO deduction finds insufficient stock, the service's 400 reaches the client. | 1. Stub the cashier lookup.<br>2. Stub `createOrder` to throw `ResponseStatusException(BAD_REQUEST, "Khong du ton kho")`.<br>3. `POST /api/sales-orders`. | **HTTP 400 Bad Request**<br>`{"code":400,"message":"Khong du ton kho"}` | PRE-ENV.<br>**Depends on:** SITCID-AC-01 — the success path must pass first, so a 400 here is attributable to stock alone.<br>**State:** cashier1 is logged in. The cart line requests quantity 2 while total sellable stock across the product's batches is less than 2. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-AC-06 | Checking out a product id that no longer exists returns 404 via `AppException(PRODUCT_NOT_FOUND)`. | 1. Stub the cashier lookup.<br>2. Stub `createOrder` to throw `AppException(ErrorCode.PRODUCT_NOT_FOUND)`.<br>3. `POST /api/sales-orders`. | **HTTP 404 Not Found**<br>`{"code":1046,"message":"Không tìm thấy sản phẩm"}` | PRE-ENV.<br>**Depends on:** SITCID-AC-01 — the success path must pass first.<br>**State:** cashier1 is logged in. The cart still references product id 1, but that product has been deleted (or deactivated out of lookup) since it was added. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-AC-07 | Checking out an empty cart is rejected by bean validation before the service is reached. | 1. `POST /api/sales-orders` with `items = []` and paymentMethod CASH. | **HTTP 400 Bad Request**<br>`{"code":1005,"message":"Đơn hàng phải có ít nhất một sản phẩm"}`<br>(`1005` is the fallback code `GlobalExceptionHandler` assigns to non-`phoneNumber` field errors) | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 is logged in and the cart is empty. No product, customer or stock data is required — the request never reaches the service. | Passed | 08/08/2026 | | Pending | | | Pending | |

---

# Sheet 3 — Print Invoice

| | |
|---|---|
| **Feature** | Print Invoice |
| **Test requirement** | Verify that the invoice endpoint returns the complete payload the printable template needs, enforces the ownership (IDOR) rule while letting privileged roles through, and maps every invoice-integrity failure to the correct HTTP status. |
| **Number of TCs** | 12 |
| **Endpoint** | `GET /api/sales-orders/{id}/invoice` |
| **Sequence diagram** | SD-POS-03 (`SD_PRINT_INVOICE.md`) |
| **Unit-test cross-reference** | `BE_SEP490_G67/InvoiceService_TestCases.md` (UTCID01–UTCID15) |

| Testing Round | Passed | Failed | Pending | N/A |
|---|---|---|---|---|
| **Round 1** | 12 | 0 | 0 | 0 |
| **Round 2** | 0 | 0 | 12 | 0 |
| **Round 3** | 0 | 0 | 12 | 0 |

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester | Round 2 | Test date | Tester | Round 3 | Test date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Function A — Retrieve invoice data** | | | | | | | | | | | | |
| SITCID-PI-01 <br>*(unit: UTCID07)* | The cashier who created the order can fetch its invoice and receives every field the printable template needs. | 1. Stub `findActiveByUsernameWithRole("cashier1")` → user 10, role CASHIER.<br>2. Stub `invoiceService.getInvoice(100, 10, false)` → a non-debt invoice.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 200**<br>`{"code":1000,"message":"Lấy dữ liệu hóa đơn thành công","result":{"storeName":"Nha Thuoc ABC","storeAddress":"123 Nguyen Hue","taxCode":"0123456789","currency":"VND","taxRate":0,"orderId":100,"orderCode":"HD-20260001","orderStatus":"COMPLETED","paymentMethod":"CASH","isDebt":false,"subtotal":10000,"discountAmount":0,"totalAmount":10000,"paidAmount":10000,"remainingDebt":0,"createdAtVn":"08/08/2026 10:30","cashierName":"Nguyen Van B","customer":null,"items":[{"productId":1,"productName":"Paracetamol 500mg","unitName":"Viên","quantity":2,"unitPrice":5000,"discountAmount":0,"lineTotal":10000}]}}` | PRE-ENV.<br>**Depends on:** SITCID-AC-01 *(Sheet 2)* — order 100 is the order that cash checkout created.<br>**State:** cashier1 (user id 10, role CASHIER, ACTIVE) is logged in. Order 100 exists, status COMPLETED, `createdBy` = 10, not a debt, has 1 active line item. A store configuration row exists with name, address, tax code and currency VND. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-08 <br>*(unit: UTCID08)* | A debt invoice reaches the client with the debt flag and the outstanding balance intact. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice(100, 10, false)` → invoice with total 10000, paid 4000, remaining 6000, `isDebt = true`.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 200** — same payload as SITCID-PI-01 except:<br>`"isDebt":true`, `"paidAmount":4000`, `"remainingDebt":6000`<br>`{"code":1000,"message":"Lấy dữ liệu hóa đơn thành công","result":{...,"isDebt":true,"subtotal":10000,"discountAmount":0,"totalAmount":10000,"paidAmount":4000,"remainingDebt":6000,...}}` | PRE-ENV.<br>**Depends on:** SITCID-AC-02 *(Sheet 2 — the debt order must exist)*, SITCID-PI-01 (invoice retrieval works).<br>**State:** cashier1 is logged in. Order 100 exists, `createdBy` = 10, `isDebt` = true, totalAmount 10000, paidAmount 4000. Store configuration exists. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-09 <br>*(unit: UTCID10)* | Line items removed from the order are not serialised into the invoice payload. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice` → invoice holding only the active item.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 200** — payload as SITCID-PI-01; `result.items` holds exactly 1 element (the removed line is absent):<br>`"items":[{"productId":1,"productName":"Paracetamol 500mg","unitName":"Viên","quantity":2,"unitPrice":5000,"discountAmount":0,"lineTotal":10000}]` | PRE-ENV.<br>**Depends on:** SITCID-PI-01.<br>**State:** cashier1 is logged in. Order 100 has exactly 2 detail rows: one active, one with `isRemoved = true`. Store configuration exists. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-10 <br>*(unit: UTCID15)* | A line item with no discount is serialised as 0, never as `null`, so the printed invoice never shows an empty cell. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice` → invoice whose line item has `discountAmount = ZERO`.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 200** — payload as SITCID-PI-01; the line item carries a numeric zero, not `null`:<br>`"items":[{...,"discountAmount":0,...}]` | PRE-ENV.<br>**Depends on:** SITCID-PI-01.<br>**State:** cashier1 is logged in. Order 100's first detail row has `discountAmount` NULL in the database. Store configuration exists. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-12 <br>*(unit: UTCID12)* | A walk-in sale produces an invoice with no customer block. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice` → invoice with `customer = null`.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 200** — payload as SITCID-PI-01, with the customer block explicitly null:<br>`"customer":null`<br>(the key **is** present in the JSON; `InvoiceResponse` carries no `@JsonInclude`, so the null is serialised rather than omitted) | PRE-ENV.<br>**Depends on:** SITCID-AC-01 *(Sheet 2 — a cash order created without a customer)*, SITCID-PI-01.<br>**State:** cashier1 is logged in. Order 100 exists with `customer_id` NULL. Store configuration exists. | Passed | 08/08/2026 | | Pending | | | Pending | |
| **Function B — Invoice access control** | | | | | | | | | | | | |
| SITCID-PI-02 <br>*(unit: UTCID02)* | A cashier cannot read another cashier's invoice — the IDOR guard rejects the request. | 1. Stub `findActiveByUsernameWithRole("cashier2")` → user 99, role CASHIER.<br>2. Stub `getInvoice(100, 99, false)` to throw `AppException(INVOICE_ACCESS_DENIED)`.<br>3. `GET /api/sales-orders/100/invoice` as cashier2. | **HTTP 403 Forbidden**<br>`{"code":3006,"message":"Bạn không có quyền truy cập hóa đơn này"}`<br>(no `result` field — no invoice data leaks) | PRE-ENV.<br>**Depends on:** SITCID-AC-01 *(Sheet 2 — order 100 exists)*, SITCID-PI-01 (the owner *can* read it — the contrast this case relies on).<br>**State:** A second account cashier2 (user id 99, role CASHIER, ACTIVE) exists and is logged in. Order 100 has `createdBy` = 10, i.e. a different user. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-03 <br>*(unit: UTCID09)* | An ADMIN is resolved as privileged, so the controller calls the service with `isPrivileged = true` and the IDOR guard is bypassed. | 1. Stub `findActiveByUsernameWithRole("admin1")` → user 99, role ADMIN.<br>2. Stub `getInvoice(100, 99, true)` → invoice.<br>3. `GET /api/sales-orders/100/invoice`.<br>4. Verify `getInvoice(100, 99, true)` was called. | **HTTP 200** — identical payload to SITCID-PI-01, returned to a non-owner:<br>`{"code":1000,"message":"Lấy dữ liệu hóa đơn thành công","result":{...,"orderId":100,...}}`<br>Plus: the service was invoked with `isPrivileged = true`. | PRE-ENV.<br>**Depends on:** SITCID-AC-01 *(Sheet 2 — order 100 exists)*, SITCID-PI-02 (a non-privileged stranger is blocked — this case proves ADMIN is the exception).<br>**State:** An account admin1 (user id 99, role ADMIN, ACTIVE) exists and is logged in. Order 100 has `createdBy` = 10, i.e. not the caller. | Passed | 08/08/2026 | | Pending | | | Pending | |
| **Function C — Invoice integrity errors** | | | | | | | | | | | | |
| SITCID-PI-04 <br>*(unit: UTCID03)* | A cancelled order cannot be printed as an invoice. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice` to throw `AppException(ORDER_CANCELLED)`.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 422 Unprocessable Entity**<br>`{"code":3002,"message":"Đơn hàng đã bị hủy, không thể xuất hóa đơn"}` | PRE-ENV.<br>**Depends on:** SITCID-PI-01 — the success path must pass first, so the 422 is attributable to the status alone.<br>**State:** cashier1 is logged in. Order 100 exists with `createdBy` = 10 and `orderStatus` = CANCELLED. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-05 <br>*(unit: UTCID04)* | An order whose line items are all missing/removed cannot be printed. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice` to throw `AppException(ORDER_EMPTY_DETAILS)`.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 422 Unprocessable Entity**<br>`{"code":3003,"message":"Đơn hàng không có sản phẩm, không thể xuất hóa đơn"}` | PRE-ENV.<br>**Depends on:** SITCID-PI-01.<br>**State:** cashier1 is logged in. Order 100 exists with `createdBy` = 10, status COMPLETED, and zero active detail rows. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-06 <br>*(unit: UTCID05)* | Missing store configuration is reported as a server-side configuration error, not as a client error. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice` to throw `AppException(STORE_CONFIG_MISSING)`.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 500 Internal Server Error**<br>`{"code":3004,"message":"Lỗi cấu hình hệ thống: không tìm thấy cấu hình cửa hàng"}` | PRE-ENV.<br>**Depends on:** SITCID-PI-01.<br>**State:** cashier1 is logged in. Order 100 is valid and printable, but the store configuration table holds no row. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-07 <br>*(unit: UTCID06)* | An order whose totals do not reconcile is refused rather than printed with wrong numbers. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice` to throw `AppException(ORDER_TOTAL_MISMATCH)`.<br>3. `GET /api/sales-orders/100/invoice`. | **HTTP 422 Unprocessable Entity**<br>`{"code":3005,"message":"Tổng tiền đơn hàng không khớp, cần kiểm tra lại dữ liệu"}` | PRE-ENV.<br>**Depends on:** SITCID-PI-01.<br>**State:** cashier1 is logged in. Order 100 exists with `createdBy` = 10 and corrupted totals, i.e. `subtotal − discountAmount ≠ totalAmount`. | Passed | 08/08/2026 | | Pending | | | Pending | |
| SITCID-PI-11 <br>*(unit: UTCID01)* | Requesting the invoice of an order id that does not exist returns 404. | 1. Stub the cashier lookup.<br>2. Stub `getInvoice(9999, 10, false)` to throw `AppException(ORDER_NOT_FOUND)`.<br>3. `GET /api/sales-orders/9999/invoice`. | **HTTP 404 Not Found**<br>`{"code":3001,"message":"Không tìm thấy đơn hàng"}` | PRE-ENV.<br>**Depends on:** None.<br>**State:** cashier1 (user id 10, ACTIVE) is logged in. No sales order row has id 9999. | Passed | 08/08/2026 | | Pending | | | Pending | |

---

## Coverage notes / limitations (all three sheets)

These are controller-slice tests: every service is a mock, so they assert the HTTP contract (routing, binding, validation, status mapping, the controller's role/IDOR resolution) rather than the behaviour of `ProductService`, `SalesOrderService` or `InvoiceService`.

- **Security config is not the production one.** `@WebMvcTest` does not load `SecurityConfig`, so Spring Boot's default filter chain applies and `@EnableMethodSecurity` is inactive. SITCID-PI-02 and SITCID-PI-03 pass because of the role check written inside `SalesOrderController.getInvoice`, not because the application's security configuration was exercised. The `roles = {"CASHIER"}` on the Sheet 1 cases has no effect.
- **The cart itself has no backend coverage, by design.** BR-CART-06 keeps every cart operation client-side, so the branches that follow the lookups in SD-POS-01/02 — resolve default unit, resolve/select batch, increment a duplicate line (A6/A7), recalculate totals, persist the cart — can only be covered by frontend tests. Sheet 1 covers exactly the two HTTP calls those diagrams make.
- **SITCID-PI-09 and SITCID-PI-10 assert the serialisation, not the rule.** The mocked service already returns a filtered/defaulted `InvoiceResponse`, so the filtering of removed lines and the null-discount default are actually proven by UTCID10 and UTCID15 in `InvoiceServiceTest`.
- **SITCID-PI-12 asserts absence loosely.** The test uses `jsonPath("$.result.customer").doesNotExist()`, which also passes when the key is present with a `null` value — which is what actually happens. If the intent is a genuinely omitted key, the DTO needs `@JsonInclude(NON_NULL)`; if `null` is acceptable, `.value(nullValue())` states it more honestly.
- **No database is involved.** FEFO deduction, the stock-movement audit trail and invoice-number generation are not covered here; they live in `SalesOrderServiceTest`, `StockDeductionServiceTest`, `DocumentCodeServiceTest` and `InvoiceServiceTest`.

## Follow-up

The test class still carries the old grouping: `ScanBarcodeIntegration` (now Sheet 1 Function A + B) and `AddProductToCartIntegration` (now Sheet 2, Checkout). Renaming those nested classes, their `@DisplayName`s and the `SITCID-SB-*` / `SITCID-AC-*` prefixes would bring the code in line with this spec. Left as-is for now so the IDs in this document keep matching the method names in the source.
