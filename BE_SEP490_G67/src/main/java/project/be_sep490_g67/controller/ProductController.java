package project.be_sep490_g67.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.request.UpsertProductRequest;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.dto.response.ProductBarcodeResponse;
import project.be_sep490_g67.dto.response.ProductDetailResponse;
import project.be_sep490_g67.dto.response.ProductLegacyDetailResponse;
import project.be_sep490_g67.dto.response.ProductListItemResponse;
import project.be_sep490_g67.dto.response.ProductListResponse;
import project.be_sep490_g67.dto.response.ProductPosInfoResponse;
import project.be_sep490_g67.dto.response.ProductSearchResponse;
import project.be_sep490_g67.dto.response.PriceHistoryResponse;
import project.be_sep490_g67.service.ProductCommandService;
import project.be_sep490_g67.service.ProductListService;
import project.be_sep490_g67.service.ProductService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.PRODUCTS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductController {

    ProductService productService;
    ProductListService productListService;
    ProductCommandService productCommandService;

    @GetMapping
    ApiResponse<PageResponse<ProductListResponse>> getProductList(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
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
     * GET /api/products/{productId}/pos-info
     */
    @GetMapping("/{productId}/pos-info")
    ApiResponse<ProductPosInfoResponse> getPosInfo(@PathVariable Integer productId) {
        return ApiResponse.<ProductPosInfoResponse>builder()
                .result(productService.getPosInfo(productId))
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

    @GetMapping("/list")
    public ApiResponse<PageResponse<ProductListItemResponse>> getProducts(
            @RequestParam(defaultValue = "hot") String facet,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        PageResponse<ProductListItemResponse> result =
                productListService.getProductPage(facet, categoryId, keyword, page, size);
        return ApiResponse.<PageResponse<ProductListItemResponse>>builder()
                .result(result)
                .message("Lấy danh sách sản phẩm thành công")
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductDetailResponse> getProduct(@PathVariable Integer id) {
        return ApiResponse.<ProductDetailResponse>builder()
                .result(productCommandService.getById(id))
                .message("Lấy chi tiết sản phẩm thành công")
                .build();
    }

    @PostMapping
    public ApiResponse<ProductDetailResponse> createProduct(@Valid @RequestBody UpsertProductRequest request) {
        return ApiResponse.<ProductDetailResponse>builder()
                .result(productCommandService.create(request))
                .message("Tạo sản phẩm thành công")
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductDetailResponse> updateProduct(
            @PathVariable Integer id,
            @Valid @RequestBody UpsertProductRequest request
    ) {
        return ApiResponse.<ProductDetailResponse>builder()
                .result(productCommandService.update(id, request))
                .message("Cập nhật sản phẩm thành công")
                .build();
    }

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ProductDetailResponse.ImageResponse> uploadImage(
            @PathVariable Integer id,
            @RequestParam("file") MultipartFile file
    ) {
        return ApiResponse.<ProductDetailResponse.ImageResponse>builder()
                .result(productCommandService.uploadImage(id, file))
                .message("Tải ảnh thành công")
                .build();
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ApiResponse<Void> deleteImage(@PathVariable Integer id, @PathVariable Integer imageId) {
        productCommandService.deleteImage(id, imageId);
        return ApiResponse.<Void>builder()
                .message("Xóa ảnh thành công")
                .build();
    }

    @GetMapping("/{productId}/legacy-detail")
    ApiResponse<ProductLegacyDetailResponse> getProductById(@PathVariable Integer productId) {
        return ApiResponse.<ProductLegacyDetailResponse>builder()
                .result(productService.getProductById(productId))
                .build();
    }

    @GetMapping("/{id}/price-history")
    public ApiResponse<List<PriceHistoryResponse>> getPriceHistory(@PathVariable Integer id) {
        return ApiResponse.<List<PriceHistoryResponse>>builder()
                .result(productService.getPriceHistory(id))
                .message("Lấy lịch sử giá nhập thành công")
                .build();
    }
}
