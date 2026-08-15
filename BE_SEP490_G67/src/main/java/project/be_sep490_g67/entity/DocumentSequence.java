package project.be_sep490_g67.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(
        name = "document_sequences",
        uniqueConstraints = @UniqueConstraint(
                name = "UK_document_sequences_slot",
                columnNames = {"doc_type", "seq_date"}
        )
)
public class DocumentSequence extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "doc_type", length = 30, nullable = false)
    private String docType;

    @Column(name = "seq_date", nullable = false)
    private LocalDate seqDate;

    @ColumnDefault("0")
    @Column(name = "counter", nullable = false)
    private Integer counter;
}
