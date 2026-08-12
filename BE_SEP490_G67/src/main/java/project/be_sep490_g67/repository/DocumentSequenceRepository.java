package project.be_sep490_g67.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.DocumentSequence;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DocumentSequenceRepository extends JpaRepository<DocumentSequence, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT ds FROM DocumentSequence ds
            WHERE ds.storeId = :storeId
              AND ds.docType = :docType
              AND ds.seqDate = :seqDate
            """)
    Optional<DocumentSequence> lockSlot(@Param("storeId") Integer storeId,
                                        @Param("docType") String docType,
                                        @Param("seqDate") LocalDate seqDate);

    @Modifying
    @Query(value = """
            INSERT IGNORE INTO document_sequences
                (store_id, doc_type, seq_date, counter, is_removed, created_at, updated_at)
            VALUES (:storeId, :docType, :seqDate, 0, b'0', NOW(6), NOW(6))
            """, nativeQuery = true)
    void insertSlotIfAbsent(@Param("storeId") Integer storeId,
                            @Param("docType") String docType,
                            @Param("seqDate") LocalDate seqDate);
}
