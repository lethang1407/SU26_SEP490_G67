package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import project.be_sep490_g67.entity.Customer;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Integer> {

    /**
     * Look up an active customer by phone number.
     */
    @Query("SELECT c FROM Customer c WHERE c.phoneNumber = :phone AND c.isRemoved = false")
    Optional<Customer> findByPhoneNumber(@Param("phone") String phone);
}
