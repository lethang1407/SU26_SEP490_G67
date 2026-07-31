package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import project.be_sep490_g67.dto.request.AddNewSupplierRequest;
import project.be_sep490_g67.dto.response.AddNewSupplierResponse;
import project.be_sep490_g67.entity.Supplier;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.SupplierRepository;
import project.be_sep490_g67.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SupplierService {

    SupplierRepository supplierRepository;
    UserRepository userRepository;

    @Transactional
    public AddNewSupplierResponse addNewSupplier(AddNewSupplierRequest request) {
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
        Supplier savedSupplier = supplierRepository.save(supplier);

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
