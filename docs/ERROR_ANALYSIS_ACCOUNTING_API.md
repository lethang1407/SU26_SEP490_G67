# 🔍 Phân Tích Lỗi: NoResourceFoundException — Accounting API

> **Ngày phân tích:** 2026-09-22  
> **Người phân tích:** AI Assistant  
> **Trạng thái:** Chỉ phân tích — KHÔNG sửa code

---

## 1. Thông Tin Lỗi Gốc (Log)

```
2026-09-22T19:03:17.462+07:00  WARN 35628 --- [BE_SEP490_G67] [nio-8080-exec-9] 
.m.m.a.ExceptionHandlerExceptionResolver : Resolved 
[org.springframework.web.servlet.resource.NoResourceFoundException: 
No static resource api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines 
for request '/api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines'.]
```

### Tóm tắt
| Thông tin | Giá trị |
|---|---|
| **Timestamp** | `2026-09-22T19:03:17.462+07:00` |
| **Log level** | `WARN` |
| **Exception class** | `org.springframework.web.servlet.resource.NoResourceFoundException` |
| **URL bị gọi** | `/api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines` |
| **Thread** | `nio-8080-exec-9` |
| **PID** | `35628` |

---

## 2. Nguyên Nhân Gốc Rễ (Root Cause)

### 🔴 Sai lệch URL Path: Mismatch giữa URL gọi và Controller Mapping

**URL mà client (Postman/Frontend) đang gọi:**
```
/api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines
      ^^
      Chú ý: có "/v1/"
```

**URL mà Controller thực sự expose:**
```
/api/accounting/tax-profiles/2026/periods/1/revenue-lines
      ^
      Chú ý: KHÔNG có "/v1/"
```

### Giải thích chi tiết

#### Bước 1: `ApiPath.BASE_URL_V1` = `"/api"` (KHÔNG phải `"/api/v1"`)

Trong file `ApiPath.java` (line 4):
```java
public static final String BASE_URL_V1 = "/api";    // ← Chỉ là "/api", không phải "/api/v1"
```

> ⚠️ **CAUTION:** Tên hằng số là `BASE_URL_V1` (gợi ý có version "v1") nhưng giá trị thực tế chỉ là `"/api"`. 
> Đây là nguồn gốc gây **hiểu nhầm** khi viết URL từ phía client.

#### Bước 2: `AccountingController` ghép đường dẫn từ constant

Trong file `AccountingController.java` (line 26):
```java
@RequestMapping(ApiPath.BASE_URL_V1 + "/accounting/tax-profiles/{year}/periods")
```

Kết quả sau khi ghép:
```
"/api" + "/accounting/tax-profiles/{year}/periods"
= "/api/accounting/tax-profiles/{year}/periods"
```

#### Bước 3: Method-level mapping cho revenue-lines

Trong file `AccountingController.java` (line 92-95):
```java
@GetMapping("/{month}/revenue-lines")
public ApiResponse<AccountingRevenueResponse> getRevenue(
    @PathVariable Integer year, 
    @PathVariable Integer month) { ... }
```

Kết quả URL cuối cùng mà Spring MVC đăng ký:
```
/api/accounting/tax-profiles/{year}/periods/{month}/revenue-lines
```

#### Bước 4: So sánh trực tiếp

| | URL |
|---|---|
| **Client gọi** | `/api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines` |
| **Controller expose** | `/api/accounting/tax-profiles/2026/periods/1/revenue-lines` |
| **Sai lệch** | Thừa `/v1` trong URL client |

---

## 3. Tại Sao Lỗi Là `NoResourceFoundException` Thay Vì `404`?

### Cơ chế xử lý của Spring Boot 4.x

```
Client gửi GET /api/v1/accounting/...
    ↓
DispatcherServlet tìm Controller handler mapping → Không tìm thấy!
    ↓
Fallback sang ResourceHttpRequestHandler (static resources)
    ↓
Tìm trong classpath: static/, public/, META-INF/resources/ → Không tìm thấy!
    ↓
Throw NoResourceFoundException
    ↓
ExceptionHandlerExceptionResolver log WARN và trả 404
```

**Giải thích flow:**
1. Request đến `DispatcherServlet`
2. Spring MVC **không tìm thấy** controller nào match `/api/v1/accounting/...` (vì tất cả controller đều map dưới `/api/...` không có `/v1/`)
3. Khi không có controller match, Spring Boot tự động fallback sang **Static Resource Handler**
4. Static Resource Handler tìm trong `classpath:/static/`, `classpath:/public/`, `classpath:/META-INF/resources/` → Không tìm thấy file `api/v1/accounting/tax-profiles/2026/periods/1/revenue-lines`
5. Throw `NoResourceFoundException` với message "No static resource..."

> **NOTE:** Đây là hành vi **mặc định** của Spring Boot 4.x (project đang dùng Spring Boot **4.0.6**).
> Trong Spring Boot 3.x trở đi, khi không tìm thấy handler, thay vì trả về 404 đơn giản, nó sẽ fallback qua static resource handler rồi mới throw exception.

---

## 4. Xác Minh: Tất Cả Controller Đều Dùng `/api` — Không Có `/api/v1`

Dưới đây là tất cả các hằng số trong `ApiPath.java`:

| Hằng số | Giá trị | Chứa `/v1`? |
|---|---|:---:|
| `BASE_URL_V1` | `/api` | ❌ Không |
| `USER` | `/api/users` | ❌ |
| `AUTH` | `/api/auth` | ❌ |
| `STORE` | `/api/store` | ❌ |
| `STAFF` | `/api/staff` | ❌ |
| `SUPPLIER` | `/api/suppliers` | ❌ |
| `CATEGORY` | `/api/category` | ❌ |
| `PRODUCTS` | `/api/products` | ❌ |
| `CUSTOMERS` | `/api/customers` | ❌ |
| `SALES_ORDERS` | `/api/sales-orders` | ❌ |
| `IMPORT_ORDERS` | `/api/import-orders` | ❌ |
| `STORAGE_LOCATIONS` | `/api/storage-locations` | ❌ |
| `INVENTORY_ATTENTION` | `/api/inventory-attention` | ❌ |
| `STORAGE_ZONES` | `/api/storage-zones` | ❌ |
| `INVENTORY_CHECKS` | `/api/inventory-checks` | ❌ |
| `STOCK_BATCHES` | `/api/stock-batches` | ❌ |
| `IMPORT_RETURNS` | `/api/import-returns` | ❌ |
| `DEBT_PAYMENTS_CUSTOMER` | `/api/debt-payments` | ❌ |
| `IMPORT_HISTORY` | `/api/import-history` | ❌ |
| `SALES_HISTORY` | `/api/sales-history` | ❌ |
| `NOTIFICATIONS` | `/api/notifications` | ❌ |
| `WAREHOUSE_REPORT` | `/api/warehouse-report` | ❌ |
| `REVENUE_REPORT` | `/api/revenue-report` | ❌ |

**Không có endpoint nào trong hệ thống sử dụng prefix `/api/v1/`.**

---

## 5. Các Bước Kiểm Tra Bổ Sung

### ✅ Đã kiểm tra — Không có vấn đề:
- **`server.servlet.context-path`**: Không được cấu hình → context-path mặc định là `/`
- **`WebMvcConfigurer`**: Không có custom resource handler
- **`@ComponentScan`**: Không có custom scan → Spring Boot tự scan toàn bộ package `project.be_sep490_g67`
- **SecurityConfig**: `anyRequest().permitAll()` → Không bị chặn bởi Security

### 🔎 Kiểm tra thêm nếu cần:
- Kiểm tra Postman Collection đang dùng biến `{{baseUrl}}` có chứa `/v1` không
- Kiểm tra Frontend code (axios/fetch) có hardcode `/api/v1/` không

---

## 6. URL Đúng Cho Tất Cả Endpoint Accounting

Dưới đây là danh sách URL **đúng** cho tất cả endpoint của `AccountingController`:

| HTTP Method | URL Đúng | Mô tả |
|---|---|---|
| `GET` | `/api/accounting/tax-profiles/{year}/periods` | Lấy danh sách kỳ kế toán |
| `POST` | `/api/accounting/tax-profiles/{year}/periods` | Tạo kỳ kế toán mới |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/{month}` | Lấy chi tiết 1 kỳ |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/{month}/revenue-lines` | **Lấy doanh thu** |
| `POST` | `/api/accounting/tax-profiles/{year}/periods/{month}/revenue-lines/synchronize` | Đồng bộ doanh thu |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/{month}/reconciliation` | Đối soát |
| `POST` | `/api/accounting/tax-profiles/{year}/periods/{month}/close` | Đóng kỳ |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/summary` | Tổng hợp năm |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/summary/months/{month}` | Tổng hợp tháng |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/summary/quarters/{quarter}` | Tổng hợp quý |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/{month}/tax-support/s1a` | Sổ S1a (JSON) |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/{month}/tax-support/s1a.xlsx` | Sổ S1a (Excel) |
| `GET` | `/api/accounting/tax-profiles/{year}/periods/tax-support/01-tkn-cnkd.docx` | Thông báo CNKD (Word) |

> **IMPORTANT:** **Tất cả đều bắt đầu bằng `/api/accounting/...`** — KHÔNG CÓ `/v1/` trong path.

---

## 7. Kết Luận

| Mục | Chi tiết |
|---|---|
| **Loại lỗi** | Sai URL path phía client |
| **Mức nghiêm trọng** | 🟡 Trung bình (lỗi config/URL, không phải lỗi logic) |
| **Nguyên nhân** | Client gọi `/api/v1/...` nhưng server expose `/api/...` |
| **Gốc rễ sâu** | Tên hằng số `BASE_URL_V1` gây hiểu nhầm rằng URL chứa `/v1` |
| **Ảnh hưởng** | Chỉ ảnh hưởng các request có URL sai, không ảnh hưởng data/logic |
| **Cách khắc phục** | Sửa URL phía client (Postman/Frontend) bỏ `/v1` |

> ⚠️ **Lưu ý cho tương lai:** Nếu team muốn thêm API versioning (`/api/v1/`, `/api/v2/`), cần sửa giá trị hằng số `BASE_URL_V1` trong `ApiPath.java` từ `"/api"` thành `"/api/v1"` và cập nhật lại tất cả client/Postman collections.
