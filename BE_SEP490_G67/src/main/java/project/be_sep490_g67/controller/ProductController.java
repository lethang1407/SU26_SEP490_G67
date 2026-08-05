package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ProductBarcodeResponse;
import project.be_sep490_g67.dto.response.ProductPosInfoResponse;
import project.be_sep490_g67.dto.response.ProductSearchResponse;
import project.be_sep490_g67.service.ProductService;

import java.util.List;

@RestController
@RequestMapping(ApiPath.PRODUCTS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductController {

    ProductService productService;

    /**
     * GET /api/products/barcode/{barcode}
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
}