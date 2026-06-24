package project.be_sep490_g67.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import project.be_sep490_g67.constants.ApiPath;
import project.be_sep490_g67.dto.response.ApiResponse;
import project.be_sep490_g67.dto.response.ProductBarcodeResponse;
import project.be_sep490_g67.service.ProductService;

@RestController
@RequestMapping(ApiPath.PRODUCTS)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductController {

    ProductService productService;

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
}
