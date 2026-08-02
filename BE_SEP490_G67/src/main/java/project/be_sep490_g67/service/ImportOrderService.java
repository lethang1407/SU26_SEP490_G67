package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.CreateImportOrderRequest;
import project.be_sep490_g67.dto.response.ImportOrderResponseDTO;
import project.be_sep490_g67.entity.ImportOrder;
import project.be_sep490_g67.entity.ImportOrderDetail;
import project.be_sep490_g67.entity.Product;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.ImportOrderDetailRepository;
import project.be_sep490_g67.repository.ImportOrderRepository;
import project.be_sep490_g67.repository.ProductRepository;
import project.be_sep490_g67.repository.SupplierRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ImportOrderService {

    ImportOrderRepository importOrderRepository;
    ImportOrderDetailRepository importOrderDetailRepository;
    ProductRepository productRepository;
    SupplierRepository supplierRepository;

    static final AtomicInteger SEQ = new AtomicInteger(1);

    @Transactional
    public List<ImportOrderResponseDTO> createOrders(CreateImportOrderRequest request) {
        if (request == null || request.getLines() == null || request.getLines().isEmpty()) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        Map<Integer, List<CreateImportOrderRequest.OrderLine>> bySupplier = new LinkedHashMap<>();
        for (CreateImportOrderRequest.OrderLine line : request.getLines()) {
            if (line.getSupplierId() == null || line.getProductId() == null || line.getQuantity() == null
                    || line.getQuantity() <= 0) {
                continue;
            }
            bySupplier.computeIfAbsent(line.getSupplierId(), k -> new ArrayList<>()).add(line);
        }

        if (bySupplier.isEmpty()) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        List<ImportOrderResponseDTO> created = new ArrayList<>();
        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);

        for (Map.Entry<Integer, List<CreateImportOrderRequest.OrderLine>> entry : bySupplier.entrySet()) {
            Supplier supplier = supplierRepository.findById(entry.getKey())
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

            ImportOrder order = new ImportOrder();
            order.setSupplier(supplier);
            order.setOrderCode("PO-" + datePart + "-" + String.format("%03d", SEQ.getAndIncrement()));
            order.setReceivedDate(null);
            order.setStatus("PENDING_CHECK");
            order.setNote("Tạo từ màn chuẩn bị đơn nhập");
            order.setTotalCost(BigDecimal.ZERO);
            order = importOrderRepository.save(order);

            BigDecimal total = BigDecimal.ZERO;
            List<ImportOrderResponseDTO.Line> responseLines = new ArrayList<>();
            boolean urgent = false;

            for (CreateImportOrderRequest.OrderLine lineReq : entry.getValue()) {
                Product product = productRepository.findById(lineReq.getProductId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

                BigDecimal cost = product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO;
                BigDecimal lineTotal = cost.multiply(BigDecimal.valueOf(lineReq.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP);

                ImportOrderDetail detail = new ImportOrderDetail();
                detail.setImportOrder(order);
                detail.setProduct(product);
                detail.setQuantity(lineReq.getQuantity());
                detail.setCostPerUnit(cost);
                detail.setLineTotal(lineTotal);
                importOrderDetailRepository.save(detail);

                total = total.add(lineTotal);
                if (lineReq.getOrderDate() == null
                        || !lineReq.getOrderDate().isAfter(LocalDate.now())) {
                    urgent = true;
                }

                responseLines.add(ImportOrderResponseDTO.Line.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .quantity(lineReq.getQuantity())
                        .costPerUnit(cost)
                        .lineTotal(lineTotal)
                        .build());
            }

            order.setTotalCost(total);
            importOrderRepository.save(order);

            created.add(ImportOrderResponseDTO.builder()
                    .id(order.getId())
                    .orderCode(order.getOrderCode())
                    .supplierId(supplier.getId())
                    .supplierName(supplier.getName())
                    .totalCost(total)
                    .urgent(urgent)
                    .lines(responseLines)
                    .build());
        }

        return created;
    }
}
