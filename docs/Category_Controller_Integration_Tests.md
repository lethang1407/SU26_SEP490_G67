# Integration Test Cases - Category Management (`CategoryController`)

### 📋 Controller Overview & Test Objectives (Mô tả Controller & Mục tiêu Kiểm thử)

| Mục | Chi tiết |
| :--- | :--- |
| **Controller** | `CategoryController` (`project.be_sep490_g67.controller.CategoryController`) |
| **Base API Path** | `/api/category` |
| **Mô tả nghiệp vụ** | Quản lý danh mục hàng hóa trong tiệm tạp hóa / siêu thị mini. Hỗ trợ phân loại sản phẩm theo ngành hàng (Bánh kẹo, Nước giải khát, Gia vị, Thực phẩm khô, Hóa phẩm...), phục vụ quản lý tồn kho và tìm kiếm/lọc sản phẩm. |
| **Phạm vi API kiểm thử** | **1. `GET /api/category`**: Lấy danh sách danh mục phân trang, tìm kiếm theo tên hoặc mô tả, sắp xếp theo tên ASC và tự động tính tổng số sản phẩm (`productCount`) đang kinh doanh.<br>**2. `POST /api/category`**: Thêm mới danh mục hàng hóa, tự động chuẩn hóa khoảng trắng (trim), gán giá trị mặc định (`coverDays = 7`, `isRemoved = false`), validate độ dài và kiểm tra chống trùng tên không phân biệt hoa thường.<br>**3. `PUT /api/category/{categoryId}`**: Cập nhật thông tin danh mục, kiểm tra tồn tại của ID, ngăn chặn đổi trùng tên với danh mục khác, và chặn thao tác trên danh mục đã xóa mềm (`isRemoved = true`). |
| **Mục tiêu Integration Test** | Xác thực phân loại hàng hóa, tính toán số lượng sản phẩm, ràng buộc tên duy nhất và ngăn chặn thao tác trên danh mục đã xóa mềm. |

> **Note**: File này được tổng hợp và chuẩn hóa theo đúng cấu trúc bảng yêu cầu: `Test Case ID`, `Test Case Description`, `Test Case Procedure`, `Expected Results`, `Pre-conditions`, `Round 1`, `Test date`, `Tester`. Bạn có thể sao chép trực tiếp dữ liệu từ các bảng dưới đây vào file Excel.

---

### Bảng Thông Tin Module (Sheet Header)

| Attribute | Value |
| :--- | :--- |
| **Feature** | Category Management (`CategoryController`) |
| **Test requirement** | Standardized integration tests for all 3 API endpoints in `CategoryController`: category listing/search/pagination with active product count calculation, new grocery category creation with name duplication check and whitespace trimming, and category update with unique name validation and soft-deletion check. |
| **Number of TCs** | 23 |
| **Testing Round** | Passed: 23 \| Failed: 0 \| Pending: 0 \| N/A: 0 |

---

### Bảng Integration Test Cases (`CategoryController`)

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Category List & Search** | | | | | | | |
| **TC_CAT_LST_01** | Query category list without search keyword using default pagination (page 0, size 10). | 1. Dispatch `GET /api/category`<br>2. Inspect HTTP status code and response payload. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Lấy danh sách danh mục hàng hóa thành công"`<br>3. `result.content` returns up to 10 categories sorted by `name` ASC.<br>4. `result.page = 0`, `result.size = 10`, `result.totalElements` and `result.totalPages` correctly populated.<br>5. Each item contains `id`, `name`, `description`, `productCount`, and `updatedAt`. | User authenticated. Database contains active grocery categories with associated active products. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_LST_02** | Search category list by name keyword (`search = "Bánh kẹo"`). | 1. Dispatch `GET /api/category?search=Bánh kẹo`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. `result.content` returns only categories whose name or description contains "Bánh kẹo" (case-insensitive).<br>3. `result.totalElements` matches count of matching categories. | User authenticated. Database contains categories matching keyword "Bánh kẹo". | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_LST_03** | Search category list by description keyword (`search = "nước ngọt"`). | 1. Dispatch `GET /api/category?search=nước ngọt`<br>2. Inspect response content items. | 1. HTTP Status Code: `200 OK`<br>2. `result.content` returns categories whose description mentions "nước ngọt" (ví dụ: Nước giải khát). | User authenticated. Category exists with description containing "nước ngọt". | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_LST_04** | Search category list with keyword returning no results (`search = "KhôngTồnTại123"`). | 1. Dispatch `GET /api/category?search=KhôngTồnTại123`<br>2. Inspect response payload. | 1. HTTP Status Code: `200 OK`<br>2. `result.content: []`, `result.totalElements = 0`, `result.totalPages = 0`. | No category matches search keyword. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_LST_05** | Verify soft-deleted categories (`isRemoved = true`) are excluded from listing. | 1. Dispatch `GET /api/category`<br>2. Inspect returned category IDs. | 1. HTTP Status Code: `200 OK`<br>2. Response content strictly excludes any category record with `isRemoved = true`. | Database contains both active categories and soft-deleted categories (`isRemoved = true`). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_LST_06** | Query category list with custom pagination parameters (page 1, size 5). | 1. Dispatch `GET /api/category?page=1&size=5`<br>2. Inspect pagination metadata and items. | 1. HTTP Status Code: `200 OK`<br>2. `result.page = 1`, `result.size = 5`, `result.content` contains second page items. | Database contains more than 5 active categories. | Passed | 10/08/2026 | dungnthe180742 |
| **Add New Category** | | | | | | | |
| **TC_CAT_ADD_01** | Add new category successfully with valid name and description. | 1. Prepare JSON body:<br>`{"name": "Gia vị & Nấu ăn", "description": "Nước mắm, dầu ăn, hạt nêm, đường, muối"}`<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Tạo mới danh mục thành công"`<br>3. `result` contains auto-generated `id`, `name: "Gia vị & Nấu ăn"`, `description: "Nước mắm, dầu ăn, hạt nêm, đường, muối"`, `productCount: 0`.<br>4. In DB, new record created with `coverDays = 7` and `isRemoved = false`. | User authenticated. Category name "Gia vị & Nấu ăn" does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_02** | Add new category successfully with name only (optional description omitted/null). | 1. Prepare JSON body:<br>`{"name": "Mì gói & Thực phẩm khô"}`<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `200 OK`<br>2. `result.name = "Mì gói & Thực phẩm khô"`, `result.description = null`, `result.productCount = 0`. | User authenticated. Name "Mì gói & Thực phẩm khô" is unique. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_03** | Add new category with leading/trailing whitespaces in name and description (auto-trimming). | 1. Prepare JSON body:<br>`{"name": "   Hóa phẩm & Tẩy rửa   ", "description": "   Bột giặt, nước rửa chén, xà bông   "}`<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `200 OK`<br>2. `result.name = "Hóa phẩm & Tẩy rửa"` (trimmed), `result.description = "Bột giặt, nước rửa chén, xà bông"` (trimmed). | User authenticated. Trimmed name is unique. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_04** | Reject adding category when `name` is blank or empty string. | 1. Prepare JSON body: `{"name": "", "description": "Mô tả danh mục"}`<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Vui lòng nhập tên danh mục"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_05** | Reject adding category when `name` is null or whitespace only. | 1. Prepare JSON body: `{"name": "   "}`<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Vui lòng nhập tên danh mục"`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_06** | Reject adding category when `name` length exceeds 100 characters. | 1. Prepare JSON body with `name` consisting of 101 characters.<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error on `@Size(max = 100)`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_07** | Reject adding category when `description` length exceeds 500 characters. | 1. Prepare JSON body with valid name and `description` of 501 characters.<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error on `@Size(max = 500)`. | User authenticated. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_08** | Reject adding category when category name already exists (case-insensitive duplicate check). | 1. Prepare JSON body: `{"name": "bánh kẹo & snack"}`<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `409 Conflict`<br>2. Throws `AppException(ErrorCode.CATEGORY_NAME_EXISTED)` ("Tên danh mục đã tồn tại"). | Active category with name "Bánh Kẹo & Snack" exists in DB (`isRemoved = false`). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_ADD_09** | Allow adding category with name matching a soft-deleted category (`isRemoved = true`). | 1. Prepare JSON body: `{"name": "Đồ ăn vặt cũ"}`<br>2. Dispatch `POST /api/category`. | 1. HTTP Status Code: `200 OK`<br>2. Response body returns created category successfully. | Category with name "Đồ ăn vặt cũ" exists in DB with `isRemoved = true`. | Passed | 10/08/2026 | dungnthe180742 |
| **Update Category** | | | | | | | |
| **TC_CAT_UPD_01** | Update existing category details successfully with valid name and description. | 1. Prepare JSON body:<br>`{"name": "Bánh Kẹo & Snack Cập Nhật", "description": "Snack khoai tây, bánh quy bơ, kẹo dẻo các loại"}`<br>2. Dispatch `PUT /api/category/1`. | 1. HTTP Status Code: `200 OK`<br>2. Response Body contains `code: 1000` and `message: "Cập nhật danh mục thành công"`<br>3. `result.id = 1`, `result.name = "Bánh Kẹo & Snack Cập Nhật"`, `result.description = "Snack khoai tây, bánh quy bơ, kẹo dẻo các loại"`, `result.productCount` reflects active products assigned to category ID 1. | Category ID 1 exists in DB (`isRemoved = false`). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_UPD_02** | Update category keeping the same existing category name (same ID, no conflict). | 1. Prepare JSON body:<br>`{"name": "Bánh Kẹo & Snack", "description": "Cập nhật mô tả nhưng giữ nguyên tên"}`<br>2. Dispatch `PUT /api/category/1`. | 1. HTTP Status Code: `200 OK`<br>2. `result.id = 1`, `result.name = "Bánh Kẹo & Snack"`, `result.description = "Cập nhật mô tả nhưng giữ nguyên tên"`. | Category ID 1 has name "Bánh Kẹo & Snack". | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_UPD_03** | Reject update when `name` is blank or empty string. | 1. Prepare JSON body: `{"name": "", "description": "Mô tả"}`<br>2. Dispatch `PUT /api/category/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error: `"Vui lòng nhập tên danh mục"`. | Category ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_UPD_04** | Reject update when `name` length exceeds 100 characters. | 1. Prepare JSON body with `name` of 101 characters.<br>2. Dispatch `PUT /api/category/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error on size constraint. | Category ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_UPD_05** | Reject update when `description` length exceeds 500 characters. | 1. Prepare JSON body with valid name and `description` of 501 characters.<br>2. Dispatch `PUT /api/category/1`. | 1. HTTP Status Code: `400 Bad Request`<br>2. Validation error on size constraint. | Category ID 1 exists in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_UPD_06** | Reject update when new name duplicates another active category's name. | 1. Prepare JSON body with name of Category ID 2: `{"name": "Mì gói & Thực phẩm khô"}`<br>2. Dispatch `PUT /api/category/1`. | 1. HTTP Status Code: `409 Conflict`<br>2. Throws `AppException(ErrorCode.CATEGORY_NAME_EXISTED)` ("Tên danh mục đã tồn tại"). | Category ID 1 and Category ID 2 exist; Category ID 2 has name "Mì gói & Thực phẩm khô" (`isRemoved = false`). | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_UPD_07** | Reject update for non-existent category ID 99999. | 1. Prepare valid JSON body: `{"name": "Tên Mới"}`<br>2. Dispatch `PUT /api/category/99999`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.CATEGORY_NOT_FOUND)` ("Không tìm thấy danh mục"). | Category ID 99999 does not exist in DB. | Passed | 10/08/2026 | dungnthe180742 |
| **TC_CAT_UPD_08** | Reject update for soft-deleted category (`isRemoved = true`). | 1. Prepare valid JSON body: `{"name": "Tên Mới"}`<br>2. Dispatch `PUT /api/category/10`. | 1. HTTP Status Code: `404 Not Found`<br>2. Throws `AppException(ErrorCode.CATEGORY_NOT_FOUND)`. | Category ID 10 exists in DB with `isRemoved = true`. | Passed | 10/08/2026 | dungnthe180742 |

---

### Direct TSV / Copy-Paste Text Block (for Excel)

```tsv
Test Case ID	Test Case Description	Test Case Procedure	Expected Results	Pre-conditions	Round 1	Test date	Tester
Category List & Search							
TC_CAT_LST_01	Query category list without search keyword using default pagination (page 0, size 10).	"1. Dispatch `GET /api/category`
2. Inspect HTTP status code and response payload."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Lấy danh sách danh mục hàng hóa thành công""`
3. `result.content` returns up to 10 categories sorted by `name` ASC.
4. `result.page = 0`, `result.size = 10`, `result.totalElements` and `result.totalPages` correctly populated.
5. Each item contains `id`, `name`, `description`, `productCount`, and `updatedAt`."	User authenticated. Database contains active grocery categories with associated active products.	Passed	10/08/2026	dungnthe180742
TC_CAT_LST_02	Search category list by name keyword (`search = ""Bánh kẹo""`).	"1. Dispatch `GET /api/category?search=Bánh kẹo`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. `result.content` returns only categories whose name or description contains ""Bánh kẹo"" (case-insensitive).
3. `result.totalElements` matches count of matching categories."	User authenticated. Database contains categories matching keyword "Bánh kẹo".	Passed	10/08/2026	dungnthe180742
TC_CAT_LST_03	Search category list by description keyword (`search = ""nước ngọt""`).	"1. Dispatch `GET /api/category?search=nước ngọt`
2. Inspect response content items."	"1. HTTP Status Code: `200 OK`
2. `result.content` returns categories whose description mentions ""nước ngọt"" (ví dụ: Nước giải khát)."	User authenticated. Category exists with description containing "nước ngọt".	Passed	10/08/2026	dungnthe180742
TC_CAT_LST_04	Search category list with keyword returning no results (`search = ""KhôngTồnTại123""`).	"1. Dispatch `GET /api/category?search=KhôngTồnTại123`
2. Inspect response payload."	"1. HTTP Status Code: `200 OK`
2. `result.content: []`, `result.totalElements = 0`, `result.totalPages = 0`."	No category matches search keyword.	Passed	10/08/2026	dungnthe180742
TC_CAT_LST_05	Verify soft-deleted categories (`isRemoved = true`) are excluded from listing.	"1. Dispatch `GET /api/category`
2. Inspect returned category IDs."	"1. HTTP Status Code: `200 OK`
2. Response content strictly excludes any category record with `isRemoved = true`."	Database contains both active categories and soft-deleted categories (`isRemoved = true`).	Passed	10/08/2026	dungnthe180742
TC_CAT_LST_06	Query category list with custom pagination parameters (page 1, size 5).	"1. Dispatch `GET /api/category?page=1&size=5`
2. Inspect pagination metadata and items."	"1. HTTP Status Code: `200 OK`
2. `result.page = 1`, `result.size = 5`, `result.content` contains second page items."	Database contains more than 5 active categories.	Passed	10/08/2026	dungnthe180742
Add New Category							
TC_CAT_ADD_01	Add new category successfully with valid name and description.	"1. Prepare JSON body:
{""name"": ""Gia vị & Nấu ăn"", ""description"": ""Nước mắm, dầu ăn, hạt nêm, đường, muối""}
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Tạo mới danh mục thành công""`
3. `result` contains auto-generated `id`, `name: ""Gia vị & Nấu ăn""`, ""description"": ""Nước mắm, dầu ăn, hạt nêm, đường, muối"", `productCount: 0`.
4. In DB, new record created with `coverDays = 7` and `isRemoved = false`."	User authenticated. Category name "Gia vị & Nấu ăn" does not exist in DB.	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_02	Add new category successfully with name only (optional description omitted/null).	"1. Prepare JSON body:
{""name"": ""Mì gói & Thực phẩm khô""}
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `200 OK`
2. `result.name = ""Mì gói & Thực phẩm khô""`, `result.description = null`, `result.productCount = 0`."	User authenticated. Name "Mì gói & Thực phẩm khô" is unique.	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_03	Add new category with leading/trailing whitespaces in name and description (auto-trimming).	"1. Prepare JSON body:
{""name"": ""   Hóa phẩm & Tẩy rửa   "", ""description"": ""   Bột giặt, nước rửa chén, xà bông   ""}
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `200 OK`
2. `result.name = ""Hóa phẩm & Tẩy rửa""` (trimmed), `result.description = ""Bột giặt, nước rửa chén, xà bông""` (trimmed)."	User authenticated. Trimmed name is unique.	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_04	Reject adding category when `name` is blank or empty string.	"1. Prepare JSON body: {""name"": """", ""description"": ""Mô tả danh mục""}
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Vui lòng nhập tên danh mục""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_05	Reject adding category when `name` is null or whitespace only.	"1. Prepare JSON body: {""name"": ""   ""}
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Vui lòng nhập tên danh mục""."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_06	Reject adding category when `name` length exceeds 100 characters.	"1. Prepare JSON body with `name` consisting of 101 characters.
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error on `@Size(max = 100)`."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_07	Reject adding category when `description` length exceeds 500 characters.	"1. Prepare JSON body with valid name and `description` of 501 characters.
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error on `@Size(max = 500)`."	User authenticated.	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_08	Reject adding category when category name already exists (case-insensitive duplicate check).	"1. Prepare JSON body: {""name"": ""bánh kẹo & snack""}
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `409 Conflict`
2. Throws `AppException(ErrorCode.CATEGORY_NAME_EXISTED)` (""Tên danh mục đã tồn tại"")."	Active category with name "Bánh Kẹo & Snack" exists in DB (`isRemoved = false`).	Passed	10/08/2026	dungnthe180742
TC_CAT_ADD_09	Allow adding category with name matching a soft-deleted category (`isRemoved = true`).	"1. Prepare JSON body: {""name"": ""Đồ ăn vặt cũ""}
2. Dispatch `POST /api/category`."	"1. HTTP Status Code: `200 OK`
2. Response body returns created category successfully."	Category with name "Đồ ăn vặt cũ" exists in DB with `isRemoved = true`.	Passed	10/08/2026	dungnthe180742
Update Category							
TC_CAT_UPD_01	Update existing category details successfully with valid name and description.	"1. Prepare JSON body:
{""name"": ""Bánh Kẹo & Snack Cập Nhật"", ""description"": ""Snack khoai tây, bánh quy bơ, kẹo dẻo các loại""}
2. Dispatch `PUT /api/category/1`."	"1. HTTP Status Code: `200 OK`
2. Response Body contains `code: 1000` and `message: ""Cập nhật danh mục thành công""`
3. `result.id = 1`, `result.name = ""Bánh Kẹo & Snack Cập Nhật""`, `result.description = ""Snack khoai tây, bánh quy bơ, kẹo dẻo các loại""`, `result.productCount` reflects active products assigned to category ID 1."	Category ID 1 exists in DB (`isRemoved = false`).	Passed	10/08/2026	dungnthe180742
TC_CAT_UPD_02	Update category keeping the same existing category name (same ID, no conflict).	"1. Prepare JSON body:
{""name"": ""Bánh Kẹo & Snack"", ""description"": ""Cập nhật mô tả nhưng giữ nguyên tên""}
2. Dispatch `PUT /api/category/1`."	"1. HTTP Status Code: `200 OK`
2. `result.id = 1`, `result.name = ""Bánh Kẹo & Snack""`, `result.description = ""Cập nhật mô tả nhưng giữ nguyên tên""`."	Category ID 1 has name "Bánh Kẹo & Snack".	Passed	10/08/2026	dungnthe180742
TC_CAT_UPD_03	Reject update when `name` is blank or empty string.	"1. Prepare JSON body: {""name"": """", ""description"": ""Mô tả""}
2. Dispatch `PUT /api/category/1`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error: ""Vui lòng nhập tên danh mục""."	Category ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CAT_UPD_04	Reject update when `name` length exceeds 100 characters.	"1. Prepare JSON body with `name` of 101 characters.
2. Dispatch `PUT /api/category/1`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error on size constraint."	Category ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CAT_UPD_05	Reject update when `description` length exceeds 500 characters.	"1. Prepare JSON body with valid name and `description` of 501 characters.
2. Dispatch `PUT /api/category/1`."	"1. HTTP Status Code: `400 Bad Request`
2. Validation error on size constraint."	Category ID 1 exists in DB.	Passed	10/08/2026	dungnthe180742
TC_CAT_UPD_06	Reject update when new name duplicates another active category's name.	"1. Prepare JSON body with name of Category ID 2: {""name"": ""Mì gói & Thực phẩm khô""}
2. Dispatch `PUT /api/category/1`."	"1. HTTP Status Code: `409 Conflict`
2. Throws `AppException(ErrorCode.CATEGORY_NAME_EXISTED)` (""Tên danh mục đã tồn tại"")."	Category ID 1 and Category ID 2 exist; Category ID 2 has name "Mì gói & Thực phẩm khô" (`isRemoved = false`).	Passed	10/08/2026	dungnthe180742
TC_CAT_UPD_07	Reject update for non-existent category ID 99999.	"1. Prepare valid JSON body: {""name"": ""Tên Mới""}
2. Dispatch `PUT /api/category/99999`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.CATEGORY_NOT_FOUND)` (""Không tìm thấy danh mục"")."	Category ID 99999 does not exist in DB.	Passed	10/08/2026	dungnthe180742
TC_CAT_UPD_08	Reject update for soft-deleted category (`isRemoved = true`).	"1. Prepare valid JSON body: {""name"": ""Tên Mới""}
2. Dispatch `PUT /api/category/10`."	"1. HTTP Status Code: `404 Not Found`
2. Throws `AppException(ErrorCode.CATEGORY_NOT_FOUND)`."	Category ID 10 exists in DB with `isRemoved = true`.	Passed	10/08/2026	dungnthe180742
```
