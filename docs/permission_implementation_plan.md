# KẾ HOẠCH TRIỂN KHAI PHÂN QUYỀN CHI TIẾT (GRANULAR PERMISSION SYSTEM)

> **Phương án lựa chọn:** Granular Permission Code (Mã phân quyền chi tiết)  
> **Áp dụng:** Cả Backend (Spring Security JWT Authorities) và Frontend (React Route Guards & Dynamic Sidebar)

---

## BƯỚC 1: XÂY DỰNG TẬP DỮ LIỆU PERMISSION CODE & SEED DATABASE

### 1.1 Bộ mã Permission Code theo từng Module

#### 🔵 Module `STAFF` (Quản lý Nhân sự)
- `STAFF:VIEW`: Xem danh sách & chi tiết nhân viên
- `STAFF:CREATE`: Thêm mới nhân viên
- `STAFF:UPDATE`: Cập nhật thông tin nhân viên

#### 🔵 Module `STORE` (Cấu hình Cửa hàng)
- `STORE:VIEW`: Xem thông tin pháp lý cửa hàng
- `STORE:UPDATE`: Cập nhật thông tin cửa hàng

#### 🔵 Module `PRODUCT` (Hàng hóa & Danh mục)
- `PRODUCT:VIEW`: Xem sản phẩm, tra cứu mã vạch, danh mục
- `PRODUCT:CREATE`: Tạo mới sản phẩm & danh mục
- `PRODUCT:UPDATE`: Cập nhật sản phẩm, danh mục & tải ảnh
- `PRODUCT:DELETE`: Xóa ảnh & sản phẩm

#### 🔵 Module `WAREHOUSE` (Quản lý Kho & Kiểm kho)
- `WAREHOUSE:VIEW`: Xem sơ đồ vị trí, khu vực kho
- `WAREHOUSE:LOCATION_MANAGE`: Thêm/sửa vùng & vị trí kho
- `WAREHOUSE:CHECK_VIEW`: Xem danh sách & chi tiết phiếu kiểm kho
- `WAREHOUSE:CHECK_CREATE`: Tạo & chốt phiếu kiểm kho

#### 🔵 Module `IMPORT` (Nhập hàng & Đơn nhập)
- `IMPORT:VIEW`: Xem danh sách phiếu nhập & lịch sử nhập hàng
- `IMPORT:CREATE`: Tạo phiếu nhập hàng (nháp/nhập) & tạo đơn từ gợi ý
- `IMPORT:UPDATE`: Chỉnh sửa phiếu nhập hàng
- `IMPORT:CANCEL`: Hủy phiếu nhập nháp

#### 🔵 Module `SUPPLIER` (Nhà cung cấp)
- `SUPPLIER:VIEW`: Xem thông tin & lịch sử nhà cung cấp
- `SUPPLIER:CREATE`: Thêm mới nhà cung cấp
- `SUPPLIER:UPDATE`: Cập nhật nhà cung cấp
- `SUPPLIER:DELETE`: Xóa nhà cung cấp
- `SUPPLIER:PAYMENT`: Ghi nhận thanh toán nợ nhà cung cấp

#### 🔵 Module `POS` (Thao tác bán hàng POS)
- `POS:SALE`: Thực hiện bán hàng POS, tạo đơn bán hàng
- `POS:EXCHANGE`: Thực hiện đổi trả hàng tại POS

#### 🔵 Module `SALES_ORDER` (Đơn bán hàng & Hóa đơn)
- `SALES_ORDER:VIEW_ALL`: Xem tất cả đơn bán hàng của cửa hàng
- `SALES_ORDER:VIEW_OWN`: Xem đơn bán hàng do chính mình tạo
- `SALES_ORDER:INVOICE`: Xem và xuất hóa đơn bán hàng

#### 🔵 Module `CUSTOMER` (Khách hàng & Công nợ)
- `CUSTOMER:VIEW`: Xem danh sách & chi tiết khách hàng
- `CUSTOMER:DEBT_VIEW`: Xem công nợ khách hàng
- `CUSTOMER:DEBT_MANAGE`: Quản lý & ghi nhận thu nợ khách hàng

#### 🔵 Module `AUDIT` (Hậu kiểm & Bất thường)
- `AUDIT:VIEW`: Xem danh sách cảnh báo bất thường kho/sổ sách
- `AUDIT:RESOLVE`: Xử lý bất thường kiểm kê đối soát

---

### 1.2 Bảng Phân Quyền Mặc Định Theo Role (Role-to-Permission Mapping)

| Module | Permission Code | ADMIN | CASHIER | ACCOUNTANT | WAREHOUSE |
|:--- |:--- |:---:|:---:|:---:|:---:|
| **STAFF** | `STAFF:VIEW`, `STAFF:CREATE`, `STAFF:UPDATE` | ✅ | ❌ | ❌ | ❌ |
| **STORE** | `STORE:VIEW`, `STORE:UPDATE` | ✅ | ❌ | ❌ | ❌ |
| **PRODUCT** | `PRODUCT:VIEW` | ✅ | ✅ | ✅ | ✅ |
| | `PRODUCT:CREATE`, `PRODUCT:UPDATE`, `PRODUCT:DELETE` | ✅ | ❌ | ❌ | ✅ |
| **WAREHOUSE** | `WAREHOUSE:VIEW`, `WAREHOUSE:LOCATION_MANAGE` | ✅ | ❌ | ❌ | ✅ |
| | `WAREHOUSE:CHECK_VIEW`, `WAREHOUSE:CHECK_CREATE` | ✅ | ❌ | ❌ | ✅ |
| **IMPORT** | `IMPORT:VIEW` | ✅ | ❌ | ✅ | ✅ |
| | `IMPORT:CREATE`, `IMPORT:UPDATE`, `IMPORT:CANCEL` | ✅ | ❌ | ❌ | ✅ |
| **SUPPLIER** | `SUPPLIER:VIEW` | ✅ | ❌ | ✅ | ✅ |
| | `SUPPLIER:CREATE`, `SUPPLIER:UPDATE`, `SUPPLIER:DELETE` | ✅ | ❌ | ❌ | ✅ |
| | `SUPPLIER:PAYMENT` | ✅ | ❌ | ✅ | ❌ |
| **POS** | `POS:SALE`, `POS:EXCHANGE` | ✅ | ✅ | ❌ | ❌ |
| **SALES_ORDER**| `SALES_ORDER:VIEW_ALL` | ✅ | ❌ | ✅ | ❌ |
| | `SALES_ORDER:VIEW_OWN` | ✅ | ✅ | ✅ | ❌ |
| | `SALES_ORDER:INVOICE` | ✅ | ✅ | ✅ | ❌ |
| **CUSTOMER** | `CUSTOMER:VIEW` | ✅ | ✅ | ✅ | ❌ |
| | `CUSTOMER:DEBT_VIEW`, `CUSTOMER:DEBT_MANAGE` | ✅ | ❌ | ✅ | ❌ |
| **AUDIT** | `AUDIT:VIEW`, `AUDIT:RESOLVE` | ✅ | ❌ | ✅ | ❌ |

---

## BƯỚC 2: CẬP NHẬT BACKEND (BE)

1. **Cập nhật SQL Seed (`Database/test_data_seed.sql` & `dbDev_v1.0.sql`)**:
   - Thêm danh sách `permissions` vào bảng `permissions`.
   - Thêm dữ liệu `role_permissions` liên kết cho 4 Roles.
2. **Nạp Authorities vào JWT Claim Scope (`AuthenticationService.java`)**:
   - Duyệt qua `user.roles -> role.permissions` và nạp thêm các mã permission (`code`) vào array `buildScope(user)`.
3. **Trả về Permissions trong Profile API (`UserProfileResponse.java` & `UserService.java`)**:
   - Thêm field `Set<String> permissions` vào `UserProfileResponse`.
4. **Cấu hình `@PreAuthorize` trên các Controllers**:
   - Gắn `@PreAuthorize("hasAuthority('STAFF:VIEW')")`, `@PreAuthorize("hasAuthority('PRODUCT:CREATE')")`, ... vào từng method controller tương ứng.

---

## BƯỚC 3: CẬP NHẬT FRONTEND (FE)

1. **Lưu trữ & Quản lý State Permission**:
   - Nạp `permissions` từ `getProfile()` và lưu trữ trong Auth state / local storage.
   - Viết helper / hook `useHasPermission(requiredPermissions)`.
2. **Tạo Component Bảo Vệ Route (`ProtectedRoute.jsx`)**:
   - Bọc các routes trong `admin.routes.jsx`. Kiểm tra xem user có chứa mã permission yêu cầu hay không. Nếu không, chuyển hướng tới `/admin/dashboard` hoặc trang `403 Forbidden`.
3. **Cấu hình Phân Quyền Menu Sidebar (`menuData.js` & `Sidebar.jsx`)**:
   - Khai báo trường `permission` cho từng menu item trong `menuData.js`.
   - `Sidebar.jsx` lọc menu hiển thị dựa trên danh sách permissions của user.

---

## TIẾN ĐỘ THỰC HIỆN

- [ ] **Giai đoạn 1:** Cập nhật Database SQL seed dữ liệu Permissions & Role_Permissions.
- [ ] **Giai đoạn 2:** Cập nhật BE (AuthenticationService, UserProfileResponse, Controller `@PreAuthorize`).
- [ ] **Giai đoạn 3:** Cập nhật FE (Profile API response handling, `ProtectedRoute`, `Sidebar` filtering).
- [ ] **Giai đoạn 4:** Kiểm thử toàn bộ luồng xác thực & phân quyền (Integration Test).
