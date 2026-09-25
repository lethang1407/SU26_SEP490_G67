package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.AccountingPeriod;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import project.be_sep490_g67.enums.PeriodScope;

/** Truy vấn kỳ tháng; kiểm tra chồng lấn và trạng thái đóng thuộc service. */
@Repository
public interface AccountingPeriodRepository extends JpaRepository<AccountingPeriod, Integer> {
    /** Call only after acquiring the store/profile locks; includes removed rows for unique/range checks. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from AccountingPeriod p where p.profile.id = :profileId order by p.accountingMonth")
    List<AccountingPeriod> findAllForUpdate(@org.springframework.data.repository.query.Param("profileId") Integer profileId);

    boolean existsByProfileStoreIdAndStatus(Integer storeId, project.be_sep490_g67.enums.PeriodStatus status);

    boolean existsByProfileStoreId(Integer storeId);

    boolean existsByProfileIdAndStatus(Integer profileId, project.be_sep490_g67.enums.PeriodStatus status);

    boolean existsByProfileId(Integer profileId);


    Optional<AccountingPeriod> findByProfileIdAndAccountingMonthAndIsRemovedFalse(
            Integer profileId, Integer accountingMonth);

    Optional<AccountingPeriod> findByProfileIdAndAccountingMonthAndPeriodScopeAndIsRemovedFalse(
            Integer profileId, Integer accountingMonth, PeriodScope periodScope);

    List<AccountingPeriod> findByProfileIdAndIsRemovedFalseOrderByAccountingMonthAsc(Integer profileId);

    Page<AccountingPeriod> findByProfileIdAndIsRemovedFalse(Integer profileId, Pageable pageable);

    List<AccountingPeriod> findByProfileIdAndPeriodScopeAndIsRemovedFalseOrderByAccountingMonthAsc(
            Integer profileId, PeriodScope periodScope);

    List<AccountingPeriod> findByProfileIdAndStartAtLessThanAndEndExclusiveGreaterThanAndIsRemovedFalse(
            Integer profileId, Instant endExclusive, Instant startAt);
}
