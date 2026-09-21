package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.RevenueAdjustment;
import project.be_sep490_g67.enums.AdjustmentStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** Truy vấn khoản điều chỉnh; chỉ service được phép quyết định khi nào khoản ảnh hưởng doanh thu. */
@Repository
public interface RevenueAdjustmentRepository extends JpaRepository<RevenueAdjustment, Integer> {
    Optional<RevenueAdjustment> findByProfileIdAndIdempotencyKey(Integer profileId, String key);
    List<RevenueAdjustment> findByProfileIdAndIsRemovedFalseOrderByIdAsc(Integer profileId);

    List<RevenueAdjustment> findByProfileIdAndPostingDateBetweenAndIsRemovedFalse(Integer profileId, LocalDate start, LocalDate end);

    boolean existsBySourceTypeAndSourceIdAndStatusAndIsRemovedFalse(
            project.be_sep490_g67.enums.SourceType type, Integer sourceId, AdjustmentStatus status);

    boolean existsByProfileStoreId(Integer storeId);


    Optional<RevenueAdjustment> findByProfileIdAndIdempotencyKeyAndIsRemovedFalse(
            Integer profileId, String idempotencyKey);

    List<RevenueAdjustment> findByProfileIdAndStatusAndPostingDateBetweenAndIsRemovedFalse(
            Integer profileId, AdjustmentStatus status, LocalDate from, LocalDate to);

    List<RevenueAdjustment> findByRelatedPeriodIdAndIsRemovedFalse(Integer relatedPeriodId);
}
