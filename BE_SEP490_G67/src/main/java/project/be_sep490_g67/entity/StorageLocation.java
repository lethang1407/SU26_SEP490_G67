package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "storage_locations")
public class StorageLocation extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private StorageZone storageZone;

    @Column(name = "aisle", length = 20)
    private String aisle;

    @Column(name = "shelf", length = 20)
    private String shelf;

    @Column(name = "bin", length = 20)
    private String bin;

    @Column(name = "label", nullable = false, length = 50)
    private String label;

    @Column(name = "description")
    private String description;

    @Column(name = "size", nullable = false, length = 10)
    private String size;

    @ColumnDefault("0")
    @Column(name = "is_full", nullable = false)
    private Boolean isFull;

    @ColumnDefault("1")
    @Column(name = "is_active")
    private Boolean isActive;

    @OneToMany(mappedBy = "location")
    private Set<BatchLocation> batchLocations = new LinkedHashSet<>();

    /** Mã khu (A, B, …) — lấy từ FK storage_zones. */
    public String getZoneCode() {
        return storageZone != null ? storageZone.getCode() : null;
    }
}
