package project.be_sep490_g67.util;

import project.be_sep490_g67.entity.StockBatch;

public final class StockBatchUtils {

    private StockBatchUtils() {
    }

    public static String resolveBatchCode(StockBatch batch) {
        if (batch == null) {
            return null;
        }
        if (batch.getBatchCode() != null && !batch.getBatchCode().isBlank()) {
            return batch.getBatchCode().trim();
        }
        if (batch.getId() != null) {
            return "BATCH-" + batch.getId();
        }
        return null;
    }
}
