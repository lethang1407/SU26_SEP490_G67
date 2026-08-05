import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Search,
    Home,
    Trash2,
    ArrowLeftSquare,
    ShoppingCart,
    AlertCircle,
    Info
} from "lucide-react";
import "../../../css/POS.css";
import "../../../css/ExchangeOrder.css";
import ExchangeOrderPicker from '../components/ExchangeOrderPicker';
import ProductInfoModal from '../components/ProductInfoModal';
import { getOrderForExchange, processExchangeOrder, searchProductsByName } from "../api";
import { getApiErrorMessage } from "../../../utils/api-utils";

/**
 * Tình trạng hàng trả. Chỉ RESELLABLE mới được nhập lại kho bán;
 * các tình trạng còn lại được ghi nhận hủy.
 * DAMAGED / EXPIRED được phép trả cả với sản phẩm không cho trả.
 */
const ITEM_CONDITIONS = [
    { value: 'RESELLABLE', label: 'Nguyên vẹn' },
    { value: 'DAMAGED', label: 'Hỏng' },
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'OPENED', label: 'Đã mở' },
];

const CONDITION_OVERRIDES_POLICY = ['DAMAGED', 'EXPIRED'];

export default function ExchangeOrder({ orderId: orderIdProp, embedded = false, onDone, onDirtyChange }) {
    const params = useParams();
    const orderId = orderIdProp ?? params.orderId;
    const navigate = useNavigate();
    const [originalOrder, setOriginalOrder] = useState(null);
    const [loading, setLoading] = useState(!!orderId);
    const [error, setError] = useState(null);
    const [returnItems, setReturnItems] = useState([]);
    const [exchangeItems, setExchangeItems] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [returnNote, setReturnNote] = useState('');
    const [refundMethod, setRefundMethod] = useState('cash');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

    // Sản phẩm đang mở bảng thông tin (nút "i" ở cả bảng hàng trả và hàng đổi)
    const [infoProductId, setInfoProductId] = useState(null);

    // Load original order data
    useEffect(() => {
        const loadOrder = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getOrderForExchange(orderId);
                setOriginalOrder(data);

                // Initialize return items with 0 quantity
                const initialReturnItems = data.items.map(item => ({
                    salesOrderDetailId: item.salesOrderDetailId,
                    productId: item.productId,
                    productCode: item.productCode,
                    productName: item.productName,
                    unitName: item.unitName,
                    quantityPurchased: item.quantityPurchased,
                    quantityReturned: item.quantityReturned ?? 0,
                    quantityReturnable: item.quantityReturnable ?? item.quantityPurchased,
                    productReturnable: item.productReturnable ?? true,
                    returnQty: 0,
                    itemCondition: '',
                    unitPrice: item.unitPrice,
                    total: 0
                }));
                setReturnItems(initialReturnItems);
            } catch (err) {
                setError(getApiErrorMessage(err, 'Không thể tải thông tin đơn hàng'));
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            loadOrder();
        }
    }, [orderId]);

    // Search products
    useEffect(() => {
        const searchProducts = async () => {
            if (searchInput.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            try {
                setSearchLoading(true);
                const results = await searchProductsByName(searchInput);
                setSearchResults(results);
            } catch (err) {
                console.error('Search error:', err);
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        };

        const debounce = setTimeout(searchProducts, 300);
        return () => clearTimeout(debounce);
    }, [searchInput]);

    const onDirtyChangeRef = useRef(onDirtyChange);
    useEffect(() => {
        onDirtyChangeRef.current = onDirtyChange;
    });
    useEffect(() => {
        const dirty = returnItems.some(item => item.returnQty > 0)
            || exchangeItems.length > 0
            || returnNote.trim().length > 0;
        onDirtyChangeRef.current?.(dirty);
    }, [returnItems, exchangeItems, returnNote]);

    const handleReturnQtyChange = useCallback((salesOrderDetailId, delta) => {
        setReturnItems(prev => prev.map(item => {
            if (item.salesOrderDetailId === salesOrderDetailId) {
                const newQty = Math.max(0, Math.min(item.quantityReturnable, item.returnQty + delta));
                return { ...item, returnQty: newQty, total: newQty * item.unitPrice };
            }
            return item;
        }));
        setValidationErrors(prev => ({ ...prev, returnItems: null }));
    }, []);

    // Handle item condition change
    const handleConditionChange = useCallback((salesOrderDetailId, condition) => {
        setReturnItems(prev => prev.map(item =>
            item.salesOrderDetailId === salesOrderDetailId
                ? { ...item, itemCondition: condition }
                : item
        ));
        setValidationErrors(prev => ({ ...prev, returnItems: null }));
    }, []);

    // Handle exchange quantity change
    const handleExchangeQtyChange = useCallback((index, delta) => {
        setExchangeItems(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty, total: newQty * item.price };
            }
            return item;
        }));
    }, []);

    // Handle exchange unit change
    const handleExchangeUnitChange = useCallback((index, productUnitId) => {
        setExchangeItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const selectedUnit = (item.units ?? []).find(
                (u) => String(u.id) === String(productUnitId)
            );
            if (!selectedUnit) return item;
            const newPrice = selectedUnit.sellingPrice ?? item.price;
            return {
                ...item,
                productUnitId: selectedUnit.id,
                unitName: selectedUnit.name,
                price: newPrice,
                total: item.qty * newPrice
            };
        }));
    }, []);

    // Add product to exchange list
    const handleAddExchangeProduct = useCallback((product) => {
        const existingIndex = exchangeItems.findIndex(item => item.productId === product.id);

        if (existingIndex >= 0) {
            // Increase quantity if already exists
            setExchangeItems(prev => prev.map((item, i) => {
                if (i === existingIndex) {
                    const newQty = item.qty + 1;
                    return { ...item, qty: newQty, total: newQty * item.price };
                }
                return item;
            }));
        } else {
            // Add new item
            const units = product.productUnits ?? [];
            const defaultUnit = units.find((u) => u.isDefault)
                ?? units.find((u) => Number(u.unitBase) === 1)
                ?? units[0];
            const price = defaultUnit?.sellingPrice ?? product.sellingPrice ?? 0;
            const newItem = {
                productId: product.id,
                productCode: product.barcode || `SP${String(product.id).padStart(6, '0')}`,
                productName: product.name,
                units,
                unitName: defaultUnit?.name || 'Cái',
                qty: 1,
                price,
                total: price,
                batchId: product.stockBatches?.[0]?.id || null,
                productUnitId: defaultUnit?.id ?? null
            };
            setExchangeItems(prev => [...prev, newItem]);
        }

        setSearchInput('');
        setSearchResults([]);
        setValidationErrors(prev => ({ ...prev, exchangeItems: null }));
    }, [exchangeItems]);

    // Remove exchange item
    const handleRemoveExchangeItem = useCallback((index) => {
        setExchangeItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Remove return item (set qty to 0)
    const handleRemoveReturnItem = useCallback((salesOrderDetailId) => {
        setReturnItems(prev => prev.map(item =>
            item.salesOrderDetailId === salesOrderDetailId ? { ...item, returnQty: 0, total: 0 } : item
        ));
    }, []);

    // Calculate totals
    const returnSubtotal = returnItems.reduce((sum, item) => sum + item.total, 0);
    const exchangeSubtotal = exchangeItems.reduce((sum, item) => sum + item.total, 0);
    const netAmount = returnSubtotal - exchangeSubtotal;

    // Validate form
    const validateForm = () => {
        const errors = {};

        const itemsToReturn = returnItems.filter(item => item.returnQty > 0);
        if (itemsToReturn.length === 0) {
            errors.returnItems = 'Phải có ít nhất một sản phẩm trả lại';
        }

        returnItems.forEach(item => {
            if (item.returnQty > item.quantityReturnable) {
                errors.returnItems = `Chỉ còn ${item.quantityReturnable} sản phẩm có thể trả`;
            }
        });

        itemsToReturn.forEach(item => {
            if (!item.itemCondition) {
                errors.returnItems = `Vui lòng chọn tình trạng cho "${item.productName}"`;
            } else if (!item.productReturnable
                && !CONDITION_OVERRIDES_POLICY.includes(item.itemCondition)) {
                errors.returnItems = `"${item.productName}" không được phép trả lại (chỉ nhận khi hỏng hoặc hết hạn)`;
            }
        });

        if (!refundMethod) {
            errors.refundMethod = 'Vui lòng chọn phương thức hoàn tiền';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit exchange order
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setSubmitting(true);
            setSubmitError(null);

            const itemsToReturn = returnItems.filter(item => item.returnQty > 0);

            const payload = {
                originalOrderId: parseInt(orderId),
                returnItems: itemsToReturn.map(item => ({
                    salesOrderDetailId: item.salesOrderDetailId,
                    productId: item.productId,
                    quantity: item.returnQty,
                    unitName: item.unitName,
                    itemCondition: item.itemCondition
                })),
                exchangeItems: exchangeItems.map(item => ({
                    productId: item.productId,
                    batchId: item.batchId,
                    productUnitId: item.productUnitId,
                    quantity: item.qty,
                    unitPrice: item.price,
                    discountAmount: 0
                })),
                returnNote: returnNote.trim() || null,
                refundMethod: refundMethod.toUpperCase(),
                returnDiscount: 0,
                exchangeDiscount: 0
            };

            const result = await processExchangeOrder(payload);
            alert(`Đổi trả hàng thành công!\nMã phiếu trả: ${result.returnCode}\n${netAmount > 0 ? `Hoàn tiền khách: ${netAmount.toLocaleString()} đ` : netAmount < 0 ? `Khách cần thanh toán thêm: ${Math.abs(netAmount).toLocaleString()} đ` : 'Không cần hoàn/thu thêm tiền'}`);
            if (embedded) {
                onDone?.();
            } else {
                navigate('/admin/pos');
            }
        } catch (err) {
            setSubmitError(getApiErrorMessage(err, 'Không thể xử lý đổi trả hàng'));
        } finally {
            setSubmitting(false);
        }
    };

    // Chưa chọn hóa đơn -> hiển thị bước tìm kiếm & chọn hóa đơn cần đổi/trả
    if (!orderId) {
        return <ExchangeOrderPicker />;
    }

    const shell = (children) => embedded
        ? children
        : <div className="pos-container">{children}</div>;

    if (loading) {
        return shell(
            <div className="exchange-state-container">
                <div>Đang tải...</div>
            </div>
        );
    }

    if (error) {
        return shell(
            <div className="exchange-error-container">
                <AlertCircle size={48} color="#ef4444" />
                <div className="exchange-error-text">{error}</div>
                <button
                    onClick={() => (embedded ? onDone?.() : navigate('/admin/pos'))}
                    className="exchange-error-back-btn"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    return shell(
        <>
            {/* Header*/}
            {!embedded && (
                <header className="pos-header">
                    <div className="pos-header-left">
                        <div className="search-wrapper">
                            <Search className="search-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm hàng hóa để đổi..."
                                className="search-input"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>

                        <div className="pos-header-center">
                            <button className="tab-active">
                                Trả hàng - {originalOrder?.orderCode}
                            </button>
                        </div>
                    </div>

                    <div className="pos-header-right">
                        <button className="icon-btn" onClick={() => navigate('/admin/pos')} title="Trang chủ POS">
                            <Home size={24} />
                        </button>
                    </div>
                </header>
            )}

            <div className="pos-main">
                {/* Left Column: Return & Exchange Items */}
                <div className="pos-cart-section exchange-cart-section">

                    {/* Return Items Section */}
                    <div className="exchange-section">
                        <div className="exchange-section-header">
                            <div className="exchange-section-header-title">
                                <ArrowLeftSquare size={16} color="#2563eb" /> THÔNG TIN HÀNG TRẢ
                            </div>
                            <div className="exchange-section-header-subtitle">Chọn sản phẩm cần trả</div>
                        </div>
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th className="col-stt">STT</th>
                                    <th>MÃ SKU</th>
                                    <th>TÊN SẢN PHẨM</th>
                                    <th>ĐVT</th>
                                    <th className="text-center">SL TRẢ</th>
                                    <th className="text-center">SL ĐÃ MUA</th>
                                    <th className="text-center">TÌNH TRẠNG</th>
                                    <th className="text-right">ĐƠN GIÁ</th>
                                    <th className="text-right">THÀNH TIỀN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map((item, index) => (
                                    <tr key={item.salesOrderDetailId ?? item.productId}>
                                        <td>
                                            <div className="return-row-index">
                                                {index + 1}
                                                {item.returnQty > 0 && (
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleRemoveReturnItem(item.salesOrderDetailId)}
                                                    >
                                                        <Trash2 size={16} color="#ef4444" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-bold product-code-cell">{item.productCode}</td>
                                        <td>
                                            <div className="cart-name-cell">
                                                <span>{item.productName}</span>
                                                <button
                                                    className="btn-product-info"
                                                    title="Xem thông tin sản phẩm"
                                                    onClick={() => setInfoProductId(item.productId)}
                                                >
                                                    <Info size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td>{item.unitName}</td>
                                        <td>
                                            <div className="qty-control">
                                                <button className="qty-btn" onClick={() => handleReturnQtyChange(item.salesOrderDetailId, -1)}>-</button>
                                                <input type="text" value={item.returnQty} readOnly className="qty-input" />
                                                <button className="qty-btn" onClick={() => handleReturnQtyChange(item.salesOrderDetailId, 1)}>+</button>
                                            </div>
                                            {item.quantityReturnable < item.quantityPurchased && (
                                                <div className="qty-remaining-note">
                                                    còn {item.quantityReturnable}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-center">{item.quantityPurchased}</td>
                                        <td className="text-center">
                                            <select
                                                className="unit-select"
                                                value={item.itemCondition}
                                                disabled={item.returnQty === 0}
                                                onChange={(e) => handleConditionChange(item.salesOrderDetailId, e.target.value)}
                                            >
                                                <option value="">-- Chọn --</option>
                                                {ITEM_CONDITIONS.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                            {!item.productReturnable && (
                                                <div className="condition-policy-note">
                                                    Không cho trả — chỉ nhận khi hỏng/hết hạn
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-right">{item.unitPrice.toLocaleString()}</td>
                                        <td className="text-right font-bold">{item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {validationErrors.returnItems && (
                            <div className="exchange-section-error">
                                <AlertCircle size={14} className="inline-icon" />
                                {validationErrors.returnItems}
                            </div>
                        )}
                    </div>

                    {/* Exchange Search Bar */}
                    <div className="exchange-search-bar">
                        <div className="exchange-search-bar-label">Đổi hàng</div>
                        <div className="search-wrapper exchange-search-wrapper">
                            <Search className="search-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm hàng hóa để đổi"
                                className="search-input exchange-search-input"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>

                        {/* Search Dropdown */}
                        {searchInput.length >= 2 && (
                            <div className="exchange-dropdown">
                                {searchLoading ? (
                                    <div className="exchange-dropdown-state">Đang tìm...</div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(product => (
                                        <div
                                            key={product.id}
                                            className="exchange-dropdown-item"
                                            onClick={() => handleAddExchangeProduct(product)}
                                        >
                                            <div className="exchange-dropdown-item-name">{product.name}</div>
                                            <div className="exchange-dropdown-item-price">
                                                Giá: {(product.sellingPrice || 0).toLocaleString()} đ
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="exchange-dropdown-state exchange-dropdown-empty">Không tìm thấy sản phẩm</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Exchange Items Section */}
                    <div className="exchange-section">
                        <div className="exchange-items-header">
                            <ShoppingCart size={16} color="#16a34a" />
                            <span className="exchange-items-header-title">SẢN PHẨM ĐỔI</span>
                        </div>
                        {exchangeItems.length > 0 ? (
                            <table className="cart-table">
                                <thead>
                                    <tr>
                                        <th className="col-stt">STT</th>
                                        <th>MÃ SKU</th>
                                        <th>TÊN SẢN PHẨM</th>
                                        <th>ĐVT</th>
                                        <th className="text-center">SỐ LƯỢNG</th>
                                        <th className="text-right">ĐƠN GIÁ</th>
                                        <th className="text-right">THÀNH TIỀN</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exchangeItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td className="font-bold">{item.productCode}</td>
                                            <td>
                                                <div className="cart-name-cell">
                                                    <span>{item.productName}</span>
                                                    <button
                                                        className="btn-product-info"
                                                        title="Xem thông tin sản phẩm"
                                                        onClick={() => setInfoProductId(item.productId)}
                                                    >
                                                        <Info size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                {(item.units ?? []).length > 1 ? (
                                                    <select
                                                        className="unit-select"
                                                        value={item.productUnitId ?? ''}
                                                        onChange={(e) => handleExchangeUnitChange(index, e.target.value)}
                                                    >
                                                        {item.units.map((u) => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    item.unitName
                                                )}
                                            </td>
                                            <td>
                                                <div className="qty-control">
                                                    <button className="qty-btn" onClick={() => handleExchangeQtyChange(index, -1)}>-</button>
                                                    <input type="text" value={item.qty} readOnly className="qty-input" />
                                                    <button className="qty-btn" onClick={() => handleExchangeQtyChange(index, 1)}>+</button>
                                                </div>
                                            </td>
                                            <td className="text-right">{item.price.toLocaleString()}</td>
                                            <td className="text-right font-bold">{item.total.toLocaleString()}</td>
                                            <td>
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleRemoveExchangeItem(index)}
                                                >
                                                    <Trash2 size={16} color="#ef4444" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="exchange-empty-state">
                                Chưa có sản phẩm đổi. Tìm kiếm sản phẩm để thêm vào.
                            </div>
                        )}
                    </div>

                    {/* Return Note */}
                    <div className="return-note-section">
                        <div className="return-note-label">GHI CHÚ TRẢ HÀNG</div>
                        <textarea
                            className="return-note-textarea"
                            placeholder="Nhập lý do trả hàng, tình trạng hàng hóa hoặc các lưu ý khác..."
                            value={returnNote}
                            onChange={(e) => setReturnNote(e.target.value)}
                        ></textarea>
                    </div>

                </div>

                {/* Right Column: Summary & Payment */}
                <div className="pos-payment-section">
                    <div className="payment-content">

                        {/* Return Summary */}
                        <div className="exchange-summary-block">
                            <div className="exchange-summary-title">
                                THÔNG TIN TRẢ HÀNG
                            </div>
                            <div className="summary-row">
                                <span>Mã hóa đơn gốc:</span>
                                <span className="order-code-link">{originalOrder?.orderCode}</span>
                            </div>
                            <div className="summary-row">
                                <span>Tổng giá gốc:</span>
                                <span className="font-bold">{(originalOrder?.totalAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="summary-row">
                                <span>Tổng tiền hàng trả:</span>
                                <span className="amount-negative">{returnSubtotal.toLocaleString()}</span>
                            </div>
                            <div className="summary-row exchange-summary-row-highlight">
                                <span className="font-bold summary-label-dark">TỔNG TIỀN TRẢ:</span>
                                <span className="amount-negative amount-large">{returnSubtotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Exchange Summary */}
                        <div className="exchange-summary-block">
                            <div className="exchange-summary-title">
                                THÔNG TIN ĐỔI HÀNG
                            </div>
                            <div className="summary-row">
                                <span>Tổng tiền hàng:</span>
                                <span className="font-bold">{exchangeSubtotal.toLocaleString()}</span>
                            </div>
                            <div className="summary-row exchange-summary-row-highlight-plain">
                                <span className="font-bold summary-label-dark">TỔNG TIỀN MUA:</span>
                                <span className="amount-large">{exchangeSubtotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Grand Total Box */}
                        <div className="grand-total-box">
                            <div className="grand-total-label">
                                {netAmount > 0 ? 'CẦN TRẢ KHÁCH' : netAmount < 0 ? 'KHÁCH CẦN THANH TOÁN' : 'KHÔNG CẦN HOÀN/THU TIỀN'}
                            </div>
                            <div className={`grand-total-value ${netAmount > 0 ? 'positive' : 'negative'}`}>
                                {Math.abs(netAmount).toLocaleString()} <span className="grand-total-value-unit">đ</span>
                            </div>
                            <div className="grand-total-note">
                                (Đã tính bù trừ giữa hàng trả và hàng đổi)
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <span className="payment-methods-title no-top-margin">PHƯƠNG THỨC HOÀN TIỀN</span>
                            <div className="methods-grid">
                                <label className={`method-label ${refundMethod === 'cash' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        checked={refundMethod === 'cash'}
                                        onChange={() => setRefundMethod('cash')}
                                    />
                                    <span>Tiền mặt</span>
                                </label>
                                <label className={`method-label ${refundMethod === 'transfer' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        checked={refundMethod === 'transfer'}
                                        onChange={() => setRefundMethod('transfer')}
                                    />
                                    <span>Chuyển khoản</span>
                                </label>
                            </div>
                            {validationErrors.refundMethod && (
                                <div className="refund-method-error">
                                    {validationErrors.refundMethod}
                                </div>
                            )}
                        </div>

                        {/* Submit Error */}
                        {submitError && (
                            <div className="exchange-submit-error">
                                <AlertCircle size={16} />
                                {submitError}
                            </div>
                        )}

                    </div>

                    <div className="payment-footer">
                        <button
                            className="btn-checkout"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'ĐANG XỬ LÝ...' : 'ĐỔI TRẢ HÀNG'}
                        </button>
                    </div>
                </div>
            </div>

            {infoProductId && (
                <ProductInfoModal
                    productId={infoProductId}
                    onClose={() => setInfoProductId(null)}
                />
            )}
        </>
    );
}
