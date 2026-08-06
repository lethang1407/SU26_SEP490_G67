package project.be_sep490_g67.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StorageLocationResponse {
    Integer id;
    String label;
    /** Mã khu (A, B, …) — từ storage_zones.code */
    String zone;
    Integer zoneId;
    String zoneTitle;
    String aisle;
    String shelf;
    String bin;
    String size;
    String description;
    Boolean isFull;
    /** SALES | WAREHOUSE */
    String zoneType;
    List<StorageLocationContentResponse> contents;
}
