package project.be_sep490_g67.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import project.be_sep490_g67.entity.StorageLocation;

import java.util.List;
import java.util.Optional;

@Repository
public interface StorageLocationRepository extends JpaRepository<StorageLocation, Integer> {

    Optional<StorageLocation> findFirstByIsRemovedFalseAndIsActiveTrueOrderByIdAsc();

    /**
     * Vị trí duy nhất của khu chứa hàng đổi trả (RT-HOLD, seed ở V41). Khu này bị khoá
     * không cho tạo thêm vị trí nên chỉ có một dòng; lấy theo zoneType thay vì theo
     * label để không phụ thuộc vào việc ai đó đổi tên nhãn.
     */
    @Query("""
            SELECT sl FROM StorageLocation sl
            JOIN FETCH sl.storageZone sz
            WHERE sz.zoneType = 'RETURN_HOLD'
              AND sl.isRemoved = false
              AND (sz.isRemoved = false OR sz.isRemoved IS NULL)
            ORDER BY sl.id ASC
            LIMIT 1
            """)
    Optional<StorageLocation> findReturnHoldLocation();

    /** Vị trí nhận hàng mới nhập (label kỹ thuật = IMPORTED; giữ NHAP-MOI để tương thích tạm). */
    @Query("""
            SELECT sl FROM StorageLocation sl
            JOIN FETCH sl.storageZone sz
            WHERE UPPER(sl.label) IN ('IMPORTED', 'NHAP-MOI')
              AND sl.isRemoved = false
              AND (sz.isRemoved = false OR sz.isRemoved IS NULL)
            ORDER BY CASE WHEN UPPER(sl.label) = 'IMPORTED' THEN 0 ELSE 1 END, sl.id ASC
            LIMIT 1
            """)
    Optional<StorageLocation> findReceivingLocation();

    @Query("""
            SELECT DISTINCT sl
            FROM StorageLocation sl
            JOIN FETCH sl.storageZone sz
            LEFT JOIN FETCH sl.batchLocations bl
            LEFT JOIN FETCH bl.batch b
            LEFT JOIN FETCH b.product p
            WHERE sl.isRemoved = false
              AND (sl.isActive = true OR sl.isActive IS NULL)
            ORDER BY sz.code ASC, sl.label ASC
            """)
    List<StorageLocation> findAllActiveWithContents();

    @Query("""
            SELECT DISTINCT sl
            FROM StorageLocation sl
            JOIN FETCH sl.storageZone sz
            LEFT JOIN FETCH sl.batchLocations bl
            LEFT JOIN FETCH bl.batch b
            LEFT JOIN FETCH b.product p
            WHERE sl.id = :id
              AND sl.isRemoved = false
              AND (sl.isActive = true OR sl.isActive IS NULL)
            """)
    Optional<StorageLocation> findActiveWithContentsById(Integer id);

    boolean existsByLabelIgnoreCaseAndIsRemovedFalse(String label);

    boolean existsByStorageZone_CodeIgnoreCaseAndShelfAndBinAndIsRemovedFalse(
            String zoneCode, String shelf, String bin);

    List<StorageLocation> findByStorageZone_CodeIgnoreCaseAndIsRemovedFalse(String zoneCode);
}
