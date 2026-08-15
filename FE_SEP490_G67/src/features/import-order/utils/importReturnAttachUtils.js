import { RETURN_METHOD } from '../../import-return/constants';

export function lineAmount(line) {
    if (line.method === RETURN_METHOD.EXCHANGE) return 0;
    return Number(line.lineValue) || (Number(line.quantity) || 0) * (Number(line.returnPrice) || 0);
}

export function mapPendingReturnLine(line) {
    const detailId = line.detailId ?? line.id;
    return {
        key: String(detailId),
        detailId,
        returnId: line.returnId ?? null,
        returnCode: line.returnCode || '',
        productId: line.productId ?? null,
        productName: line.productName || '',
        method: line.method || RETURN_METHOD.RETURN,
        quantity: Number(line.quantity) || 0,
        returnPrice: Number(line.returnPrice) || 0,
        lineValue: Number(line.lineValue) || 0,
        batchCode: line.batchCode || '',
        returnReason: line.returnReason || '',
        lineStatus: line.lineStatus || '',
        attached: Boolean(line.attached),
    };
}

export function selectedReturnDeduction(lines = [], selectedKeys = []) {
    const selected = new Set(selectedKeys.map(String));
    return lines.reduce((sum, line) => {
        if (!selected.has(String(line.key))) return sum;
        return sum + lineAmount(line);
    }, 0);
}
