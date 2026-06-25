package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.dto.request.AddNewSupplierRequest;
import project.be_sep490_g67.dto.response.AddNewSupplierResponse;
import project.be_sep490_g67.dto.response.SupplierListItemResponse;
import project.be_sep490_g67.dto.response.SupplierListPageResponse;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.SupplierRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierService {

    SupplierRepository supplierRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public SupplierListPageResponse findAllSuppliers(String search, String debtFilter, int page, int size) {
        String safeSearch = (search == null || search.isBlank()) ? "" : search.trim();
        String safeFilter = (debtFilter == null || debtFilter.isBlank()) ? "ALL" : debtFilter.toUpperCase();

        // Bước 1: Lấy tất cả NCC khớp với từ khóa tìm kiếm
        List<Supplier> suppliers = supplierRepository.searchSuppliers(safeSearch);

        // Bước 2: Lấy nợ của từng NCC trong 1 query, chuyển thành Map { supplierId -> debt }
        // row[0] = supplierId (Integer), row[1] = totalDebt (BigDecimal)
        Map<Integer, BigDecimal> debtMap = supplierRepository.findDebtPerSupplier()
                .stream()
                .collect(Collectors.toMap(
                        row -> (Integer) row[0],
                        row -> (BigDecimal) row[1]
                ));

        // Bước 3: Gắn nợ vào từng NCC, tạo danh sách response
        List<SupplierListItemResponse> allItems = suppliers.stream()
                .map(s -> SupplierListItemResponse.builder()
                        .id(s.getId())
                        .supplierCode(s.getSupplierCode())
                        .name(s.getName())
                        .phoneNumber(s.getPhoneNumber())
                        .address(s.getAddress())
                        .currentDebt(debtMap.getOrDefault(s.getId(), BigDecimal.ZERO))
                        .build())
                .toList();

        // Bước 4: Lọc theo debtFilter (ALL / HAS_DEBT / NO_DEBT)
        List<SupplierListItemResponse> filtered = switch (safeFilter) {
            case "HAS_DEBT" -> allItems.stream()
                    .filter(item -> item.getCurrentDebt().compareTo(BigDecimal.ZERO) > 0)
                    .toList();
            case "NO_DEBT" -> allItems.stream()
                    .filter(item -> item.getCurrentDebt().compareTo(BigDecimal.ZERO) == 0)
                    .toList();
            default -> allItems;
        };

        // Bước 5: Phân trang thủ công
        int totalElements = filtered.size();
        int totalPages    = Math.max(1, (int) Math.ceil((double) totalElements / size));
        int safePage      = Math.min(page, totalPages - 1);
        int from          = safePage * size;
        int to            = Math.min(from + size, totalElements);
        List<SupplierListItemResponse> pageContent = filtered.subList(from, to);

        // Bước 6: Tổng nợ toàn hệ thống (không bị ảnh hưởng bởi filter/search)
        BigDecimal totalDebt = supplierRepository.calculateTotalDebt();

        return SupplierListPageResponse.builder()
                .content(pageContent)
                .page(safePage)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .totalDebt(totalDebt != null ? totalDebt : BigDecimal.ZERO)
                .build();
    }

    @Transactional
    public AddNewSupplierResponse addNewSupplier(AddNewSupplierRequest request) {
        if (supplierRepository.existsSuppliersBySupplierCode(request.getSupplierCode())) {
            throw new AppException(ErrorCode.EXISTED_SUPPLIER);
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Supplier supplier = new Supplier();
        supplier.setName(request.getName());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setSupplierCode(request.getSupplierCode());
        supplier.setAddress(request.getAddress());
        supplier.setPhoneNumber(request.getPhoneNumber());
        supplier.setNotes(request.getNotes());
        supplier.setCategories(request.getCategories());
        supplier.setIsRemoved(false);

        Supplier savedSupplier = supplierRepository.save(supplier);
        log.info("Created new supplier with code {}", savedSupplier.getSupplierCode());

        return AddNewSupplierResponse.builder()
                .name(savedSupplier.getName())
                .contactPerson(savedSupplier.getContactPerson())
                .supplierCode(savedSupplier.getSupplierCode())
                .address(savedSupplier.getAddress())
                .phoneNumber(savedSupplier.getPhoneNumber())
                .notes(savedSupplier.getNotes())
                .categories(savedSupplier.getCategories())
                .createdAt(savedSupplier.getCreatedAt())
                .createdBy(user)
                .build();
    }
}
