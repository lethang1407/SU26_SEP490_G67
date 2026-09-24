package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.AccountingRevenueLine;
import project.be_sep490_g67.enums.SourceType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Truy vấn dòng doanh thu theo kỳ và nguồn; không tự tổng hợp hay áp dụng quy tắc thuế. */
@Repository
public interface AccountingRevenueLineRepository extends JpaRepository<AccountingRevenueLine, Integer> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select l from AccountingRevenueLine l where l.sourceType = :type and l.sourceId = :id")
    Optional<AccountingRevenueLine> findSourceForUpdate(
            @org.springframework.data.repository.query.Param("type") SourceType type,
            @org.springframework.data.repository.query.Param("id") Integer id);


    Optional<AccountingRevenueLine> findBySourceTypeAndSourceIdAndIsRemovedFalse(
            SourceType sourceType, Integer sourceId);

    boolean existsBySourceTypeAndSourceIdAndIsRemovedFalse(SourceType sourceType, Integer sourceId);

    List<AccountingRevenueLine> findByPeriodIdAndPostingDateBetweenAndIsRemovedFalse(
            Integer periodId, LocalDate from, LocalDate to);

    List<AccountingRevenueLine> findByPeriodIdAndIsRemovedFalseOrderByPostingDateAscIdAsc(Integer periodId);

    Page<AccountingRevenueLine> findByPeriodIdAndIsRemovedFalse(Integer periodId, Pageable pageable);

    Page<AccountingRevenueLine> findByPeriodIdAndPostingDateBetweenAndIsRemovedFalse(
            Integer periodId, LocalDate from, LocalDate to, Pageable pageable);

    List<AccountingRevenueLine> findByPeriodProfileIdAndIsRemovedFalse(Integer profileId);
}
