package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.RevenueAdjustment;
import project.be_sep490_g67.enums.AdjustmentStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Truy vấn khoản điều chỉnh; chỉ service được phép quyết định khi nào khoản ảnh hưởng doanh thu. */
@Repository
public interface RevenueAdjustmentRepository extends JpaRepository<RevenueAdjustment, Integer> {
    Optional<RevenueAdjustment> findByProfileIdAndIdempotencyKey(Integer profileId, String key);
    List<RevenueAdjustment> findByProfileIdAndIsRemovedFalseOrderByIdAsc(Integer profileId);

    Page<RevenueAdjustment> findByProfileIdAndIsRemovedFalse(Integer profileId, Pageable pageable);

    List<RevenueAdjustment> findByProfileIdAndPostingDateBetweenAndIsRemovedFalse(Integer profileId, LocalDate start, LocalDate end);

    boolean existsBySourceTypeAndSourceIdAndStatusAndIsRemovedFalse(
            project.be_sep490_g67.enums.SourceType type, Integer sourceId, AdjustmentStatus status);

    boolean existsByProfileStoreId(Integer storeId);

    boolean existsByProfileId(Integer profileId);


    Optional<RevenueAdjustment> findByProfileIdAndIdempotencyKeyAndIsRemovedFalse(
            Integer profileId, String idempotencyKey);

    List<RevenueAdjustment> findByProfileIdAndStatusAndPostingDateBetweenAndIsRemovedFalse(
            Integer profileId, AdjustmentStatus status, LocalDate from, LocalDate to);

    Page<RevenueAdjustment> findByProfileIdAndStatusAndIsRemovedFalse(
            Integer profileId, AdjustmentStatus status, Pageable pageable);

    Page<RevenueAdjustment> findByProfileIdAndPostingDateBetweenAndIsRemovedFalse(
            Integer profileId, LocalDate from, LocalDate to, Pageable pageable);

    List<RevenueAdjustment> findByRelatedPeriodIdAndIsRemovedFalse(Integer relatedPeriodId);
}
