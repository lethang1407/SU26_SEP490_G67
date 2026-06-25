package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import project.be_sep490_g67.dto.response.CustomerResponse;
import project.be_sep490_g67.entity.Customer;
import project.be_sep490_g67.repository.CustomerRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CustomerService {

    CustomerRepository customerRepository;

    /**
     * Look up a customer by phone number.
     * Returns empty Optional if not found (caller decides invoice type).
     */
    public Optional<CustomerResponse> findByPhone(String phone) {
        return customerRepository.findByPhoneNumber(phone)
                .map(c -> CustomerResponse.builder()
                        .id(c.getId())
                        .fullName(c.getFullName())
                        .phoneNumber(c.getPhoneNumber())
                        .totalDebt(c.getTotalDebt())
                        .build());
    }
}
