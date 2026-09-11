package project.be_sep490_g67.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import project.be_sep490_g67.entity.ApiEndpointPermission;
import project.be_sep490_g67.repository.ApiEndpointPermissionRepository;

import java.util.ArrayList;
import java.util.List;

@Component
public class ApiPermissionSeeder implements CommandLineRunner {

    @Autowired
    private ApiEndpointPermissionRepository apiEndpointPermissionRepository;

    @Autowired
    private DynamicAuthorizationManager dynamicAuthorizationManager;

    @Override
    public void run(String... args) throws Exception {
        if (apiEndpointPermissionRepository.count() == 0) {
            List<ApiEndpointPermission> initialSeed = new ArrayList<>();

            // Products
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/products/**", "PRODUCT:VIEW", "Xem sản phẩm", true));
            initialSeed.add(new ApiEndpointPermission(null, "POST", "/api/products/**", "PRODUCT:CREATE", "Tạo sản phẩm", true));
            initialSeed.add(new ApiEndpointPermission(null, "PUT", "/api/products/**", "PRODUCT:UPDATE", "Cập nhật sản phẩm", true));
            initialSeed.add(new ApiEndpointPermission(null, "DELETE", "/api/products/**", "PRODUCT:DELETE", "Xóa sản phẩm", true));

            // Categories
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/categories/**", "PRODUCT:VIEW", "Xem danh mục sản phẩm", true));
            initialSeed.add(new ApiEndpointPermission(null, "POST", "/api/categories/**", "PRODUCT:CREATE", "Tạo danh mục sản phẩm", true));
            initialSeed.add(new ApiEndpointPermission(null, "PUT", "/api/categories/**", "PRODUCT:UPDATE", "Sửa danh mục sản phẩm", true));

            // Customers & Debts
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/customers/debt/**", "CUSTOMER:DEBT_VIEW", "Xem công nợ khách hàng", true));
            initialSeed.add(new ApiEndpointPermission(null, "POST", "/api/customers/debt/**", "CUSTOMER:DEBT_MANAGE", "Quản lý công nợ", true));
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/customers/**", "CUSTOMER:VIEW", "Xem khách hàng", true));

            // Import Orders & Suggestions
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/import/suggestions/**", "IMPORT:VIEW", "Xem gợi ý danh sách nhập hàng", true));
            initialSeed.add(new ApiEndpointPermission(null, "POST", "/api/import/suggestions/**", "IMPORT:VIEW", "Lấy gợi ý chi tiết sản phẩm nhập", true));
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/import-orders/**", "IMPORT:VIEW", "Xem đơn nhập hàng", true));
            initialSeed.add(new ApiEndpointPermission(null, "POST", "/api/import-orders/**", "IMPORT:CREATE", "Tạo đơn nhập hàng", true));
            initialSeed.add(new ApiEndpointPermission(null, "PUT", "/api/import-orders/**", "IMPORT:UPDATE", "Cập nhật đơn nhập hàng", true));

            // Inventory Checks
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/inventory-checks/**", "WAREHOUSE:CHECK_VIEW", "Xem kiểm kê kho", true));
            initialSeed.add(new ApiEndpointPermission(null, "POST", "/api/inventory-checks/**", "WAREHOUSE:CHECK_CREATE", "Tạo phiếu kiểm kê kho", true));

            // Sales Orders / POS
            initialSeed.add(new ApiEndpointPermission(null, "POST", "/api/sales-orders/**", "POS:SALE", "Tạo đơn hàng POS", true));
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/sales-orders/**", "SALES_ORDER:VIEW_ALL", "Xem tất cả đơn hàng", true));

            // Reconciliation & Audit
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/reconciliations/**", "AUDIT:VIEW", "Xem đối soát két", true));

            // Suppliers & Warehouse
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/suppliers/**", "SUPPLIER:VIEW", "Xem nhà cung cấp", true));
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/storage-locations/**", "WAREHOUSE:VIEW", "Xem vị trí kho", true));
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/storage-zones/**", "WAREHOUSE:VIEW", "Xem khu vực kho", true));
            initialSeed.add(new ApiEndpointPermission(null, "GET", "/api/warehouse-report/**", "WAREHOUSE:VIEW", "Xem báo cáo kho hàng", true));

            apiEndpointPermissionRepository.saveAll(initialSeed);
            dynamicAuthorizationManager.reloadRules();
        }

        ensurePermission("GET", "/api/warehouse-report/**", "WAREHOUSE:VIEW", "Xem báo cáo kho hàng");
    }

    private void ensurePermission(String method, String path, String permissionCode, String description) {
        boolean exists = apiEndpointPermissionRepository.findByIsActiveTrue().stream()
                .anyMatch(p -> method.equalsIgnoreCase(p.getHttpMethod())
                        && path.equals(p.getUrlPattern()));
        if (!exists) {
            apiEndpointPermissionRepository.save(
                    new ApiEndpointPermission(null, method, path, permissionCode, description, true));
            dynamicAuthorizationManager.reloadRules();
        }
    }
}
