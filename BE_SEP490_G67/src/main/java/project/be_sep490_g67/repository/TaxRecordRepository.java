package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.TaxRecord;
import project.be_sep490_g67.enums.TaxPeriodType;
import project.be_sep490_g67.enums.TaxRecordStatus;

import java.util.Optional;

/** Truy vấn bản tính nghĩa vụ thuế theo hồ sơ năm; công thức tính thuộc service. */
@Repository
public interface TaxRecordRepository extends JpaRepository<TaxRecord, Integer> {

    Optional<TaxRecord> findByProfileIdAndPeriodTypeAndIsRemovedFalse(
            Integer profileId, TaxPeriodType periodType);

    boolean existsByProfileIdAndPeriodTypeAndIsRemovedFalse(
            Integer profileId, TaxPeriodType periodType);

    long countByProfileIdAndStatusAndIsRemovedFalse(Integer profileId, TaxRecordStatus status);
}
