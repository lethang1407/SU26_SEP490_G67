package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.BusinessTaxProfile;

import java.util.Optional;

/** Truy vấn hồ sơ thuế theo cửa hàng và năm; chưa chứa logic xác nhận nghiệp vụ. */
@Repository
public interface BusinessTaxProfileRepository extends JpaRepository<BusinessTaxProfile, Integer> {
    java.util.List<BusinessTaxProfile> findByStoreIdAndIsRemovedFalseOrderByTaxYearDesc(Integer storeId);

    /** Current read after the store lock; includes removed rows because the unique key does too. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from BusinessTaxProfile p where p.store.id = :storeId order by p.taxYear")
    java.util.List<BusinessTaxProfile> findAllForUpdate(@org.springframework.data.repository.query.Param("storeId") Integer storeId);


    Optional<BusinessTaxProfile> findByStoreIdAndTaxYearAndIsRemovedFalse(Integer storeId, Integer taxYear);
}
