# Bảng Tổng Quan Cấu Trúc Thư Mục src

## Cấu trúc tổng quan

```
src/
├── app/              # Cấu hình ứng dụng chính
├── components/       # Các component dùng chung
├── config/           # Cấu hình môi trường
├── css/              # File CSS cho từng module
├── features/         # Các tính năng chính của ứng dụng
├── hooks/            # Custom React hooks
├── lib/              # Thư viện và utilities cốt lõi
├── utils/            # Các hàm tiện ích
├── index.css         # CSS toàn cục
└── main.jsx          # Entry point của ứng dụng
```

---

## Chi tiết từng thư mục/file

### 📁 app/
**Mô tả:** Cấu hình và khởi tạo ứng dụng chính  
**Chứa:**
- `App.jsx` - Component gốc, khởi tạo RouterProvider
- `providers/` - Các context providers (AuthProvider, v.v.)
- `router/` - Cấu hình routing và định tuyến trang

**Chức năng:** Quản lý cấu trúc tổng thể ứng dụng, routing và các providers toàn cục

---

### 📁 components/
**Mô tả:** Các UI components dùng chung trong toàn bộ ứng dụng  
**Chứa:**
- `layouts/` - Layout components (PublicLayout)
- `ui/` - Các UI components cơ bản:
  - `header-footer/` - Header và Footer
  - `it-help/` - IT Help components
  - `not-found/` - 404 Page
  - `notification/` - Notification components
  - `sidebar/` - Sidebar navigation

**Chức năng:** Cung cấp các component tái sử dụng cho giao diện người dùng

---

### 📁 config/
**Mô tả:** Quản lý cấu hình môi trường và biến môi trường  
**Chứa:**
- `env.js` - Validation và export các biến môi trường sử dụng Zod schema
  - `API_URL` - URL của backend API
  - `ENABLE_API_MOCKING` - Bật/tắt mock API
  - `APP_URL` - URL của ứng dụng frontend
  - `APP_MOCK_API_PORT` - Port cho mock API
  - `ENABLE_AUTO_REDIRECT_LOGIN` - Tự động redirect khi unauthorized

**Chức năng:** Đảm bảo type-safe cho environment variables và validate cấu hình

---

### 📁 css/
**Mô tả:** Các file CSS module-specific cho từng tính năng  
**Chứa:**
- `AddStaff.css` - Styling cho thêm nhân viên
- `AdminDashboard.css` - Styling cho dashboard admin
- `AdminHeader.css` - Styling cho header admin
- `LoginScreen.css` - Styling cho màn hình đăng nhập
- `Profile.css` - Styling cho trang profile
- `SideBar.css` - Styling cho sidebar
- `StaffManagement.css` - Styling cho quản lý nhân viên
- `Supplier.css` - Styling cho quản lý nhà cung cấp

**Chức năng:** Tách biệt styling cho từng module/feature cụ thể

---

### 📁 features/
**Mô tả:** Các tính năng chính của ứng dụng, tổ chức theo module  
**Chứa:**

#### 🔐 **auth/** - Xác thực người dùng
- `api/` - API calls cho authentication
- `pages/` - Các trang:
  - `LoginPage.jsx` - Đăng nhập
  - `ForgotPasswordPage.jsx` - Quên mật khẩu
  - `VerifyOtpPage.jsx` - Xác thực OTP
  - `ResetPasswordPage.jsx` - Đặt lại mật khẩu
- `utils/validation.js` - Validation rules cho form auth

#### 📂 **category/** - Quản lý danh mục sản phẩm

#### 📊 **dashboard/** - Trang tổng quan
- `components/` - Các components dashboard:
  - `AlertBanner.jsx` - Banner thông báo cảnh báo
  - `RecentActivity.jsx` - Hoạt động gần đây
  - `RevenueTrendChart.jsx` - Biểu đồ xu hướng doanh thu
  - `StatCards.jsx` - Các thẻ thống kê
  - `TodayProblems.jsx` - Vấn đề trong ngày
  - `TopProducts.jsx` - Sản phẩm bán chạy
- `pages/AdminDashboard.jsx` - Trang dashboard chính

#### 🛒 **pos-screen/** - Màn hình bán hàng (Point of Sale)

#### 👤 **profile/** - Quản lý thông tin cá nhân

#### 👥 **staff/** - Quản lý nhân viên

#### 🏪 **store/** - Quản lý cửa hàng

#### 📦 **supplier/** - Quản lý nhà cung cấp

#### 👨‍💼 **users/** - Quản lý người dùng

**Chức năng:** Mỗi feature là một module độc lập với api, components, pages và utils riêng

---

### 📁 hooks/
**Mô tả:** Custom React hooks dùng chung  
**Chứa:**
- `index.js` - Export tất cả hooks
- `useDocumentTitle.jsx` - Hook để thay đổi document title dynamically

**Chức năng:** Cung cấp logic tái sử dụng cho các components

---

### 📁 lib/
**Mô tả:** Thư viện và utilities cốt lõi của ứng dụng  
**Chứa:**
- `api-clien.js` - Axios instance đã được cấu hình với:
  - Base URL từ env
  - Request interceptor: tự động thêm Authorization header
  - Response interceptor: xử lý lỗi và auto-redirect khi 401
  - Credentials handling

**Chức năng:** Quản lý HTTP client và các interceptors cho API calls

---

### 📁 utils/
**Mô tả:** Các hàm tiện ích dùng chung  
**Chứa:**
- `api-utils.js` - Utility functions cho API operations

**Chức năng:** Cung cấp helper functions cho xử lý data và logic

---

### 📄 index.css
**Mô tả:** File CSS global cho toàn bộ ứng dụng  
**Chức năng:** Define các styles chung, CSS variables, reset styles

---

### 📄 main.jsx
**Mô tả:** Entry point của React application  
**Chứa:**
```jsx
- createRoot() để render app
- AuthProvider wrapper
- App component import
```
**Chức năng:** Khởi tạo và mount ứng dụng React vào DOM

---

## Kiến trúc tổng thể

**Pattern sử dụng:** Feature-based architecture  
**Đặc điểm:**
- ✅ Mỗi feature là module độc lập (auth, dashboard, staff, etc.)
- ✅ Shared components và hooks tách riêng
- ✅ Centralized configuration (config/, lib/)
- ✅ API client với interceptors
- ✅ Environment validation với Zod
- ✅ Type-safe configuration

**Ưu điểm:**
- Dễ bảo trì và mở rộng
- Code organization rõ ràng
- Tái sử dụng code tốt
- Dễ test từng module độc lập