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
public class StorageLocation extends BaseEntity{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "zone", nullable = false, length = 50)
    private String zone;

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

    @ColumnDefault("1")
    @Column(name = "is_active")
    private Boolean isActive;

    @OneToMany(mappedBy = "location")
    private Set<BatchLocation> batchLocations = new LinkedHashSet<>();


}