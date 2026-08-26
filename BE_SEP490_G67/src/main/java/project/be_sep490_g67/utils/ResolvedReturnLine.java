package project.be_sep490_g67.utils;

import project.be_sep490_g67.entity.SalesOrderDetail;
import project.be_sep490_g67.enums.ItemCondition;
import project.be_sep490_g67.enums.ResolutionType;

public record ResolvedReturnLine(
        SalesOrderDetail soldLine,
        int quantity,
        ResolutionType resolution,
        ItemCondition condition,
        String itemNote,
        String pairedExchangeItemRef
) {
}
