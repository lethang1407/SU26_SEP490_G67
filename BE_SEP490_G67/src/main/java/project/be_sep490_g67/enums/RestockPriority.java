package project.be_sep490_g67.enums;

import lombok.Getter;

/**
 * Mức ưu tiên nhập hàng của một sản phẩm tồn thấp.
 *
 * <p> Tách khỏi {@link StockState}: trạng thái kho nói sản phẩm còn bao nhiêu,
 * mức ưu tiên nói có nên nhập hay không. Hết hàng mà 30 ngày không ai mua thì vẫn là
 * {@link #SLOW_MOVING}
 */
@Getter
public enum RestockPriority {

    /**
     * Tồn thấp/hết và vẫn bán tốt gần đây.
     */
    PRIORITY_RESTOCK(0, "Ưu tiên nhập", "RED", RestockAction.IMPORT),

    /**
     * Tồn thấp, mức bán trung bình — chủ cửa hàng tự cân nhắc.
     */
    REVIEW(1, "Cần xem xét", "ORANGE", RestockAction.VIEW_DETAIL),

    /**
     * Tồn thấp nhưng bán rất ít hoặc lâu không phát sinh bán.
     */
    SLOW_MOVING(2, "Bán chậm", "GRAY", RestockAction.VIEW_DETAIL);

    /**
     * Nhỏ hơn = xếp trước khi sắp danh sách.
     */
    private final int rank;
    private final String label;
    private final String tone;
    /**
     * -- GETTER --
     * Hành động duy nhất được mời gọi ở mức này.
     */
    private final RestockAction action;

    RestockPriority(int rank, String label, String tone, RestockAction action) {
        this.rank = rank;
        this.label = label;
        this.tone = tone;
        this.action = action;
    }

}
