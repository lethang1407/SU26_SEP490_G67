package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.CreateProductRequest;
import project.be_sep490_g67.dto.request.UpdateProductRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.ProductBarcodeResponse;
import project.be_sep490_g67.dto.response.ProductDetailResponse;
import project.be_sep490_g67.dto.response.ProductListResponse;
import project.be_sep490_g67.dto.response.ProductSearchResponse;
import project.be_sep490_g67.service.ProductService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.PRODUCTS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductController {

    ProductService productService;

    @GetMapping
    ApiResponse<PageResponse<ProductListResponse>> getProductList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.<PageResponse<ProductListResponse>>builder()
                .result(productService.getProductList(keyword, category, status, page, size))
                .build();
    }

    /**
     * GET /api/products/barcode/{barcode}
     * find product by its barcode. Returns product info + units + available stock batches.
     */
    @GetMapping("/barcode/{barcode}")
    ApiResponse<ProductBarcodeResponse> getByBarcode(@PathVariable String barcode) {
        ProductBarcodeResponse result = productService.getProductByBarcode(barcode);
        return ApiResponse.<ProductBarcodeResponse>builder()
                .result(result)
                .build();
    }

    /**
     * GET /api/products/search?q={query}
     */
    @GetMapping("/search")
    ApiResponse<List<ProductSearchResponse>> searchByName(@RequestParam("q") String query) {
        List<ProductSearchResponse> results = productService.searchByNameAndBarcode(query);
        return ApiResponse.<List<ProductSearchResponse>>builder()
                .result(results)
                .build();
    }

    @GetMapping("/{productId}")
    ApiResponse<ProductDetailResponse> getProductById(@PathVariable Integer productId) {
        return ApiResponse.<ProductDetailResponse>builder()
                .result(productService.getProductById(productId))
                .build();
    }

    @PostMapping
    ApiResponse<ProductDetailResponse> createProduct(@Valid @RequestBody CreateProductRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.<ProductDetailResponse>builder()
                .result(productService.createProduct(request, username))
                .message("Tạo sản phẩm thành công")
                .build();
    }

    @PutMapping("/{productId}")
    ApiResponse<ProductDetailResponse> updateProduct(
            @PathVariable Integer productId,
            @Valid @RequestBody UpdateProductRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ApiResponse.<ProductDetailResponse>builder()
                .result(productService.updateProduct(productId, request, username))
                .message("Cập nhật sản phẩm thành công")
                .build();
    }
}
