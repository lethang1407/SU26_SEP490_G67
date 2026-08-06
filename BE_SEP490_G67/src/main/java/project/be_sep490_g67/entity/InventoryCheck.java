package project.be_sep490_g67.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "inventory_checks")
public class InventoryCheck extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "check_code", length = 40, nullable = false)
    private String checkCode;

    @Column(name = "check_date")
    private Instant checkDate;

    /** in_progress | completed | cancelled */
    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @Column(name = "warehouse", length = 100)
    private String warehouse;

    @Column(name = "note", length = 1000)
    private String note;

    @OneToMany(mappedBy = "inventoryCheck")
    private Set<InventoryCheckDetail> details = new LinkedHashSet<>();
}
