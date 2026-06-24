package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import project.be_sep490_g67.dto.response.ProductBarcodeResponse;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.StockBatch;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.StockBatchRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProductService {

    ProductRepository productRepository;
    StockBatchRepository stockBatchRepository;

    /**
     * Look up a product by barcode.
     * Returns full product info + base product unit + available stock batches.
     */
    @Transactional(readOnly = true)
    public ProductBarcodeResponse getProductByBarcode(String barcode) {
        Product product = productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với mã vạch: " + barcode));

        // Map product units — only non-removed units
        List<ProductBarcodeResponse.ProductUnitInfo> unitInfos = product.getProductUnits()
                .stream()
                .filter(u -> Boolean.FALSE.equals(u.getIsRemoved()))
                .map(u -> ProductBarcodeResponse.ProductUnitInfo.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .unitBase(u.getUnitBase())
                        .build())
                .toList();

        // Fetch available stock batches
        List<StockBatch> batches = stockBatchRepository.findAvailableByProductId(product.getId());
        List<ProductBarcodeResponse.StockBatchInfo> batchInfos = batches.stream()
                .map(b -> ProductBarcodeResponse.StockBatchInfo.builder()
                        .id(b.getId())
                        .batchCode("BATCH-" + b.getId())
                        .quantity(b.getQuantityIn())
                        .expiryDate(b.getExpiryDate() != null ? b.getExpiryDate().toString() : null)
                        .build())
                .toList();

        return ProductBarcodeResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .barcode(product.getBarcode())
                .sellingPrice(product.getSellingPrice())
                .productUnits(unitInfos)
                .stockBatches(batchInfos)
                .build();
    }
}
