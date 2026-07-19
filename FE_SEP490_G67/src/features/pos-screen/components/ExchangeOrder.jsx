import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Search, X,
    RefreshCcw,
    History,
    Home,
    Trash2,
    Plus,
    ArrowLeftSquare,
    ShoppingCart,
    AlertCircle,
    CheckCircle
} from "lucide-react";
import "../../../css/POS.css";
import { getOrderForExchange, processExchangeOrder, searchProductsByName } from "../api";
import { getApiErrorMessage } from "../../../utils/api-utils";

export default function ExchangeOrder() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    // State for original order data
    const [originalOrder, setOriginalOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Return items state (items from original order to be returned)
    const [returnItems, setReturnItems] = useState([]);

    // Exchange items state (new products to purchase)
    const [exchangeItems, setExchangeItems] = useState([]);

    // Product search state
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Other state
    const [returnNote, setReturnNote] = useState('');
    const [refundMethod, setRefundMethod] = useState('cash');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

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
                    productId: item.productId,
                    productCode: item.productCode,
                    productName: item.productName,
                    unitName: item.unitName,
                    quantityPurchased: item.quantityPurchased,
                    returnQty: 0,
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

    // Handle return quantity change
    const handleReturnQtyChange = useCallback((productId, delta) => {
        setReturnItems(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(0, Math.min(item.quantityPurchased, item.returnQty + delta));
                return { ...item, returnQty: newQty, total: newQty * item.unitPrice };
            }
            return item;
        }));
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
            const newItem = {
                productId: product.id,
                productCode: product.barcode || `SP${String(product.id).padStart(6, '0')}`,
                productName: product.name,
                unitName: product.productUnits?.[0]?.name || 'Cái',
                qty: 1,
                price: product.sellingPrice || 0,
                total: product.sellingPrice || 0,
                batchId: product.stockBatches?.[0]?.id || null,
                productUnitId: product.productUnits?.[0]?.id || null
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
    const handleRemoveReturnItem = useCallback((productId) => {
        setReturnItems(prev => prev.map(item =>
            item.productId === productId ? { ...item, returnQty: 0, total: 0 } : item
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

        // Check return quantities
        returnItems.forEach(item => {
            if (item.returnQty > item.quantityPurchased) {
                errors.returnItems = `Số lượng trả vượt quá số lượng đã mua`;
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
                    productId: item.productId,
                    quantity: item.returnQty,
                    unitPrice: item.unitPrice,
                    unitName: item.unitName
                })),
                exchangeItems: exchangeItems.map(item => ({
                    productId: item.productId,
                    batchId: item.batchId,
                    productUnitId: item.productUnitId,
                    quantity: item.qty,
                    unitPrice: item.price,
                    discountAmount: 0
                })),
                returnNote: returnNote,
                refundMethod: refundMethod.toUpperCase(),
                returnDiscount: 0,
                exchangeDiscount: 0
            };

            const result = await processExchangeOrder(payload);

            // Show success message
            alert(`Đổi trả hàng thành công!\nMã phiếu trả: ${result.returnCode}\n${netAmount > 0 ? `Hoàn tiền khách: ${netAmount.toLocaleString()} đ` : netAmount < 0 ? `Khách cần thanh toán thêm: ${Math.abs(netAmount).toLocaleString()} đ` : 'Không cần hoàn/thu thêm tiền'}`);

            // Navigate back to POS or order history
            navigate('/admin/pos');
        } catch (err) {
            setSubmitError(getApiErrorMessage(err, 'Không thể xử lý đổi trả hàng'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="pos-container">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <div>Đang tải...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pos-container">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
                    <AlertCircle size={48} color="#ef4444" />
                    <div style={{ color: '#ef4444', fontSize: '18px' }}>{error}</div>
                    <button onClick={() => navigate('/admin/pos')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pos-container">
            {/* Header */}
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
                </div>

                <div className="pos-header-center">
                    <button className="tab-active">
                        Đổi trả hàng - {originalOrder?.orderCode}
                    </button>
                </div>

                <div className="pos-header-right">
                    <button className="icon-btn" onClick={() => navigate('/admin/pos')} title="Trang chủ POS">
                        <Home size={24} />
                    </button>
                </div>
            </header>

            <div className="pos-main">
                {/* Left Column: Return & Exchange Items */}
                <div className="pos-cart-section" style={{ overflowY: 'auto' }}>

                    {/* Return Items Section */}
                    <div style={{ margin: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#f3f4f6', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                <ArrowLeftSquare size={16} color="#2563eb" /> THÔNG TIN HÀNG TRẢ
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>Chọn sản phẩm cần trả</div>
                        </div>
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th className="col-stt">STT</th>
                                    <th>MÃ SP</th>
                                    <th>TÊN SẢN PHẨM</th>
                                    <th>ĐVT</th>
                                    <th className="text-center">SL TRẢ</th>
                                    <th className="text-center">SL ĐÃ MUA</th>
                                    <th className="text-right">ĐƠN GIÁ</th>
                                    <th className="text-right">THÀNH TIỀN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map((item, index) => (
                                    <tr key={item.productId}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {index + 1}
                                                {item.returnQty > 0 && (
                                                    <button
                                                        className="btn-delete"
                                                        onClick={() => handleRemoveReturnItem(item.productId)}
                                                    >
                                                        <Trash2 size={16} color="#ef4444" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-bold" style={{ color: '#2563eb' }}>{item.productCode}</td>
                                        <td>{item.productName}</td>
                                        <td>{item.unitName}</td>
                                        <td>
                                            <div className="qty-control">
                                                <button className="qty-btn" onClick={() => handleReturnQtyChange(item.productId, -1)}>-</button>
                                                <input type="text" value={item.returnQty} readOnly className="qty-input" />
                                                <button className="qty-btn" onClick={() => handleReturnQtyChange(item.productId, 1)}>+</button>
                                            </div>
                                        </td>
                                        <td className="text-center">{item.quantityPurchased}</td>
                                        <td className="text-right">{item.unitPrice.toLocaleString()}</td>
                                        <td className="text-right font-bold">{item.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {validationErrors.returnItems && (
                            <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '13px', borderTop: '1px solid #e5e7eb' }}>
                                <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                {validationErrors.returnItems}
                            </div>
                        )}
                    </div>

                    {/* Exchange Search Bar */}
                    <div style={{ margin: '0 16px', display: 'flex', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb', position: 'relative' }}>
                        <div style={{ fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center' }}>Đổi hàng</div>
                        <div className="search-wrapper" style={{ flex: 1, maxWidth: '100%' }}>
                            <Search className="search-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm hàng hóa để đổi"
                                className="search-input"
                                style={{ backgroundColor: 'white' }}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>

                        {/* Search Dropdown */}
                        {searchInput.length >= 2 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '16px',
                                right: '16px',
                                marginTop: '4px',
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                zIndex: 10
                            }}>
                                {searchLoading ? (
                                    <div style={{ padding: '12px', textAlign: 'center' }}>Đang tìm...</div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(product => (
                                        <div
                                            key={product.id}
                                            style={{
                                                padding: '12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f3f4f6'
                                            }}
                                            onClick={() => handleAddExchangeProduct(product)}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ fontWeight: 'bold' }}>{product.name}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                Giá: {(product.sellingPrice || 0).toLocaleString()} đ
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>Không tìm thấy sản phẩm</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Exchange Items Section */}
                    <div style={{ margin: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#f3f4f6', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <ShoppingCart size={16} color="#16a34a" />
                            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>SẢN PHẨM ĐỔI</span>
                        </div>
                        {exchangeItems.length > 0 ? (
                            <table className="cart-table">
                                <thead>
                                    <tr>
                                        <th className="col-stt">STT</th>
                                        <th>MÃ SP</th>
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
                                            <td>{item.productName}</td>
                                            <td>{item.unitName}</td>
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
                            <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                                Chưa có sản phẩm đổi. Tìm kiếm sản phẩm để thêm vào.
                            </div>
                        )}
                    </div>

                    {/* Return Note */}
                    <div style={{ margin: '0 16px 16px 16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>GHI CHÚ TRẢ HÀNG</div>
                        <textarea
                            style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', minHeight: '80px', outline: 'none', resize: 'vertical' }}
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
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ borderLeft: '4px solid #16a34a', paddingLeft: '8px', fontWeight: 'bold', color: '#16a34a', marginBottom: '16px', fontSize: '13px' }}>
                                THÔNG TIN TRẢ HÀNG
                            </div>
                            <div className="summary-row">
                                <span>Mã hóa đơn gốc:</span>
                                <span style={{ color: '#2563eb', cursor: 'pointer' }}>{originalOrder?.orderCode}</span>
                            </div>
                            <div className="summary-row">
                                <span>Tổng giá gốc:</span>
                                <span className="font-bold">{(originalOrder?.totalAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="summary-row">
                                <span>Tổng tiền hàng trả:</span>
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{returnSubtotal.toLocaleString()}</span>
                            </div>
                            <div className="summary-row" style={{ marginTop: '12px', backgroundColor: '#f9fafb', padding: '12px 16px', borderRadius: '6px', margin: '12px -16px 0 -16px' }}>
                                <span className="font-bold" style={{ color: '#374151' }}>TỔNG TIỀN TRẢ:</span>
                                <span style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>{returnSubtotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Exchange Summary */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ borderLeft: '4px solid #16a34a', paddingLeft: '8px', fontWeight: 'bold', color: '#16a34a', marginBottom: '16px', fontSize: '13px' }}>
                                THÔNG TIN ĐỔI HÀNG
                            </div>
                            <div className="summary-row">
                                <span>Tổng tiền hàng:</span>
                                <span className="font-bold">{exchangeSubtotal.toLocaleString()}</span>
                            </div>
                            <div className="summary-row" style={{ marginTop: '12px', padding: '12px 16px', margin: '12px -16px 0 -16px' }}>
                                <span className="font-bold" style={{ color: '#374151' }}>TỔNG TIỀN MUA:</span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{exchangeSubtotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Grand Total Box */}
                        <div style={{ border: '1.5px dashed #93c5fd', borderRadius: '8px', padding: '24px 16px', textAlign: 'center', backgroundColor: '#eff6ff', marginBottom: '24px' }}>
                            <div style={{ color: '#1d4ed8', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                                {netAmount > 0 ? 'CẦN TRẢ KHÁCH' : netAmount < 0 ? 'KHÁCH CẦN THANH TOÁN' : 'KHÔNG CẦN HOÀN/THU TIỀN'}
                            </div>
                            <div style={{ color: netAmount > 0 ? '#1d4ed8' : '#16a34a', fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>
                                {Math.abs(netAmount).toLocaleString()} <span style={{ fontSize: '20px', textDecoration: 'underline', fontWeight: '600' }}>đ</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                                (Đã tính bù trừ giữa hàng trả và hàng đổi)
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <span className="payment-methods-title" style={{ marginTop: 0 }}>PHƯƠNG THỨC HOÀN TIỀN</span>
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
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                                    {validationErrors.refundMethod}
                                </div>
                            )}
                        </div>

                        {/* Submit Error */}
                        {submitError && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                color: '#ef4444',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
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
        </div>
    );
}
