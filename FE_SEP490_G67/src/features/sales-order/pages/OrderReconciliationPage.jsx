import React, { useState, useEffect, useCallback } from 'react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getReconciliationSummary, submitReconciliation } from '../api';
import '../../../css/AdminDashboard.css';
import '../../../css/OrderReconciliation.css';

export default function OrderReconciliationPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Day Open State
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [confirmedOpeningCash, setConfirmedOpeningCash] = useState(0);

  // Opening Cash Input — defaults to last closing cash saved in localStorage or 0
  const [openingCashInput, setOpeningCashInput] = useState(() => {
    const saved = localStorage.getItem('lastClosingCash');
    return saved !== null ? saved : '0';
  });

  // Summary State from BE (synthesized from SalesOrder & DebtPayment)
  const [summary, setSummary] = useState(null);

  // Reconcile Inputs
  const [cashActual, setCashActual] = useState('');
  const [bankActual, setBankActual] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  // Modals visibility
  const [showDenomModal, setShowDenomModal] = useState(false);
  const [showPettyModal, setShowPettyModal] = useState(false);
  const [showCashDropModal, setShowCashDropModal] = useState(false);

  // Denomination counter state
  const [denomCounts, setDenomCounts] = useState({
    500000: 0,
    200000: 0,
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
  });

  const denomValues = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

  const denomGrandTotal = denomValues.reduce((sum, val) => {
    return sum + val * (Number(denomCounts[val]) || 0);
  }, 0);

  // Local Petty Cash Vouchers State (Thu/Chi lặt vặt)
  const [pettyType, setPettyType] = useState('OUT');
  const [pettyCategory, setPettyCategory] = useState('Chi mua bao bì/vật tư');
  const [pettyAmount, setPettyAmount] = useState('');
  const [pettyReason, setPettyReason] = useState('');
  const [pettyVouchers, setPettyVouchers] = useState([]);

  // Cash Drop Form State
  const [cashDropAmount, setCashDropAmount] = useState('1000000');
  const [cashDropReason, setCashDropReason] = useState('Nộp két an toàn cửa hàng');

  // Filter transaction list
  const [txFilter, setTxFilter] = useState('ALL');

  // Fetch summary data from BE
  const fetchSummary = useCallback(async (dateStr, openingCashVal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReconciliationSummary(dateStr, openingCashVal);
      const data = res?.result || res?.data || res;
      setSummary(data);
    } catch (err) {
      console.error('Failed to load reconciliation summary:', err);
      setError(err?.message || 'Không thể tải dữ liệu đối soát từ hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reset day open status when changing date unless stored
    const dayOpenKey = `isDayOpen_${selectedDate}`;
    const openSaved = localStorage.getItem(dayOpenKey);
    const openingSaved = localStorage.getItem(`openingCash_${selectedDate}`);

    if (openSaved === 'true') {
      setIsDayOpen(true);
      const val = Number(openingSaved || 0);
      setConfirmedOpeningCash(val);
      fetchSummary(selectedDate, val);
    } else {
      setIsDayOpen(false);
      fetchSummary(selectedDate, 0);
    }
  }, [selectedDate, fetchSummary]);

  // Confirm Open Day handler
  const handleOpenDay = () => {
    const amt = Number(openingCashInput || 0);
    setConfirmedOpeningCash(amt);
    setIsDayOpen(true);
    localStorage.setItem(`isDayOpen_${selectedDate}`, 'true');
    localStorage.setItem(`openingCash_${selectedDate}`, amt.toString());
    fetchSummary(selectedDate, amt);
    alert(`✓ Đã xác nhận mở ngày thành công với tiền két đầu ngày: ${amt.toLocaleString()} đ!`);
  };

  // Apply Denomination Counter
  const handleApplyDenomTotal = () => {
    setCashActual(denomGrandTotal.toString());
    setShowDenomModal(false);
  };

  // Create Petty Voucher (Local state addition)
  const handleCreatePettyVoucher = (e) => {
    e.preventDefault();
    if (!pettyAmount || Number(pettyAmount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }
    const amt = Number(pettyAmount);
    const newVoucher = {
      code: `${pettyType === 'OUT' ? 'PC' : 'PT'}-${String(pettyVouchers.length + 1).padStart(3, '0')}`,
      type: pettyType,
      category: pettyCategory,
      amount: amt,
      reason: pettyReason || (pettyType === 'OUT' ? 'Chi lặt vặt tại két' : 'Thu bổ sung tại két'),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      performer: 'Thu ngân quầy',
    };
    setPettyVouchers([newVoucher, ...pettyVouchers]);
    setPettyAmount('');
    setPettyReason('');
    setShowPettyModal(false);
    alert(`✓ Đã thêm ${pettyType === 'OUT' ? 'Phiếu Chi' : 'Phiếu Thu'} (${amt.toLocaleString()}đ) thành công!`);
  };

  // Create Cash Drop
  const handleCreateCashDrop = (e) => {
    e.preventDefault();
    if (!cashDropAmount || Number(cashDropAmount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ!');
      return;
    }
    const amt = Number(cashDropAmount);
    const newDrop = {
      code: `CD-${String(pettyVouchers.length + 1).padStart(3, '0')}`,
      type: 'OUT',
      category: 'Rút nộp Két an toàn',
      amount: amt,
      reason: cashDropReason || 'Rút bớt tiền quầy nộp Két chính',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      performer: 'Thu ngân quầy',
    };
    setPettyVouchers([newDrop, ...pettyVouchers]);
    setShowCashDropModal(false);
    alert(`✓ Đã ghi nhận rút ${amt.toLocaleString()} đ từ két quầy nộp Két an toàn!`);
  };

  // Submit / Close Reconciliation
  const handleCloseDay = async () => {
    if (cashActual === '') {
      alert('Vui lòng kiểm đếm và nhập số tiền mặt thực tế tại két trước khi chốt sổ!');
      return;
    }
    try {
      setLoading(true);
      const amt = Number(cashActual);

      // Save last closing cash to localStorage so tomorrow's opening defaults to this carryover cash!
      localStorage.setItem('lastClosingCash', amt.toString());

      await submitReconciliation({
        date: selectedDate,
        actualCash: amt,
        bankActual: Number(bankActual || (summary?.theoreticalBank || 0)),
        note: closeNote || 'Chốt sổ ngày hoàn tất',
      });

      setIsClosed(true);
      alert(`🎉 Đã lưu chốt sổ ngày thành công! Số tiền chốt két thực tế (${amt.toLocaleString()}đ) sẽ tự động làm tiền đầu ngày gợi ý cho ca làm việc tiếp theo.`);
    } catch (err) {
      alert('Không thể chốt sổ: ' + (err?.message || 'Lỗi hệ thống'));
    } finally {
      setLoading(false);
    }
  };

  // Calculate live petty totals
  const pettyIncomeTotal = pettyVouchers.filter((v) => v.type === 'IN').reduce((sum, v) => sum + v.amount, 0);
  const pettyExpenseTotal = pettyVouchers.filter((v) => v.type === 'OUT').reduce((sum, v) => sum + v.amount, 0);

  // Live cash and bank theory
  const cashSalesVal = summary?.cashSales || 0;
  const cashDebtCollectedVal = summary?.cashDebtCollected || 0;
  const bankSalesVal = summary?.bankSales || 0;
  const bankDebtCollectedVal = summary?.bankDebtCollected || 0;

  const cashTheory = confirmedOpeningCash + cashSalesVal + cashDebtCollectedVal + pettyIncomeTotal - pettyExpenseTotal;
  const bankTheory = bankSalesVal + bankDebtCollectedVal;

  const liveCashDiff = cashActual !== '' ? Number(cashActual) - cashTheory : null;
  const liveBankDiff = bankActual !== '' ? Number(bankActual) - bankTheory : null;

  // Combine BE transactions with local petty vouchers
  const localVoucherTx = pettyVouchers.map((v) => ({
    time: v.time,
    code: v.code,
    category: v.category,
    transactionType: v.type === 'IN' ? 'VOUCHER_IN' : 'VOUCHER_OUT',
    paymentMethod: 'Tiền mặt',
    amount: v.amount,
    isNegative: v.type === 'OUT',
    performer: v.performer,
  }));

  const allTransactions = [...localVoucherTx, ...(summary?.transactions || [])];

  const filteredTransactions = allTransactions.filter((tx) => {
    if (txFilter === 'CASH') return tx.paymentMethod === 'Tiền mặt';
    if (txFilter === 'BANK') return tx.paymentMethod?.includes('Chuyển khoản');
    return true;
  });

  return (
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main order-reconciliation-page">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1>Quản lý Đơn hàng &amp; Đối soát Két</h1>
            <p>Tổng hợp doanh thu từ đơn hàng thực tế, chốt sổ két tiền mặt và đối soát ngân hàng</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Ngày đối soát:</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600', fontSize: '14px' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchSummary(selectedDate, confirmedOpeningCash)}
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontWeight: '600', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
            >
              🔄 Tải lại
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '600' }}>
            ⚠️ {error}
          </div>
        )}

        {loading && !summary ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontWeight: '600' }}>
            ⏳ Đang tổng hợp dữ liệu đơn hàng từ hệ thống...
          </div>
        ) : (
          <div>
            {/* Day Open Banner */}
            {!isDayOpen && (
              <div className="open-day-banner" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1' }}>
                  <div style={{ fontSize: '32px' }}>🔑</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#92400e', marginBottom: '4px' }}>
                      Chưa xác nhận tiền đầu ngày — Ngày {selectedDate}
                    </div>
                    <div style={{ fontSize: '13px', color: '#a16207', lineHeight: '1.5' }}>
                      Tiền chốt két ca trước được lưu tự động: <strong>{Number(openingCashInput || 0).toLocaleString()} đ</strong> (tiền dư được giữ lại trong két quầy). Đếm két rồi bấm xác nhận để mở ca làm việc.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: '0' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={openingCashInput}
                      onChange={(e) => setOpeningCashInput(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '170px',
                        textAlign: 'right',
                        fontWeight: '700',
                        fontSize: '15px',
                        paddingRight: '28px',
                        borderColor: '#f59e0b',
                        borderRadius: '8px',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: '#64748b', fontSize: '13px' }}>
                      đ
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleOpenDay}
                    disabled={loading}
                    style={{ background: '#d97706', borderColor: '#d97706', whiteSpace: 'nowrap', padding: '9px 18px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    ✓ Xác nhận mở ngày
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div style={{ position: 'relative' }}>
              {!isDayOpen && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '0',
                    background: 'rgba(248,250,252,0.88)',
                    backdropFilter: 'blur(4px)',
                    zIndex: '10',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    minHeight: '400px',
                  }}
                >
                  <div
                    style={{
                      background: '#fff',
                      padding: '24px 32px',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      maxWidth: '520px',
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>🔒</span>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>Bảng đối soát đang được khóa</div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>
                        Vui lòng <strong>Xác nhận mở ngày</strong> ở khung màu vàng bên trên để xem dữ liệu tổng hợp và thực hiện đối soát cho ngày này.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dashboard Stats */}
              <div className="grid-stats">
                <div className="stat-card">
                  <div className="stat-card__label">Tổng đơn hàng</div>
                  <div className="stat-card__value">{summary?.totalOrdersCount || 0} đơn</div>
                  <div className="stat-card__subtext">
                    {summary?.completedOrdersCount || 0} hoàn thành · {summary?.cancelledOrdersCount || 0} hủy · {summary?.debtOrdersCount || 0} nợ
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Doanh thu ghi nhận</div>
                  <div className="stat-card__value">{(summary?.totalRevenue || 0).toLocaleString()} đ</div>
                  <div className="stat-card__subtext">Tiền mặt + Chuyển khoản + Ghi nợ</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Thực thu bán hàng</div>
                  <div className="stat-card__value">{((summary?.cashSales || 0) + (summary?.bankSales || 0)).toLocaleString()} đ</div>
                  <div className="stat-card__subtext">Tiền mặt ({(summary?.cashSales || 0).toLocaleString()}đ) + CK ({(summary?.bankSales || 0).toLocaleString()}đ)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Ghi nợ phát sinh hôm nay</div>
                  <div className="stat-card__value" style={{ color: '#ea580c' }}>{(summary?.debtSales || 0).toLocaleString()} đ</div>
                  <div className="stat-card__subtext">{summary?.debtOrdersCount || 0} đơn ghi nợ mới</div>
                </div>
              </div>

              {/* Grid Reconcile: Cash, Bank, and Summary Panels (3 Columns) */}
              <div className="grid-reconcile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                
                {/* Panel 1: Cash Panel */}
                <div className="panel" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderTop: '4px solid #3b82f6' }}>
                  <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontWeight: '700', fontSize: '15px' }}>
                    <span>[KÉT 1] TIỀN MẶT TẠI QUẦY</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setShowPettyModal(true)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        ➕ Phiếu Thu/Chi
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCashDropModal(true)}
                        style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        🏦 Rút nộp Két chính
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>SỔ SÁCH (Lý thuyết)</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{cashTheory.toLocaleString()} đ</div>
                    </div>
                    <div style={{ fontSize: '20px', color: '#cbd5e1' }}>=</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '4px', display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                        <span>THỰC TẾ</span>
                        <button
                          type="button"
                          onClick={() => setShowDenomModal(true)}
                          style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          🧮 Đếm tờ tiền
                        </button>
                      </div>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Nhập tiền đếm..."
                        value={cashActual}
                        onChange={(e) => setCashActual(e.target.value)}
                        style={{ textAlign: 'right', fontWeight: '700', fontSize: '16px', width: '145px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  {liveCashDiff !== null && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '14px',
                        background: liveCashDiff === 0 ? '#ecfdf5' : '#fef2f2',
                        color: liveCashDiff === 0 ? '#047857' : '#b91c1c',
                        border: `1px solid ${liveCashDiff === 0 ? '#a7f3d0' : '#fecaca'}`,
                      }}
                    >
                      CHÊNH LỆCH KÉT: {liveCashDiff === 0 ? 'Khớp (0 đ)' : `${liveCashDiff > 0 ? '+' : ''}${liveCashDiff.toLocaleString()} đ`}
                    </div>
                  )}

                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Diễn giải dòng tiền mặt tại quầy</h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span>Tiền mặt đầu ngày</span>
                      <strong>{confirmedOpeningCash.toLocaleString()} đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span>+ Thu bán hàng &amp; Thu khác</span>
                      <strong style={{ color: '#16a34a' }}>+ {(cashSalesVal + cashDebtCollectedVal + pettyIncomeTotal).toLocaleString()} đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span>− Chi lặt vặt / Rút két an toàn</span>
                      <strong style={{ color: '#dc2626' }}>- {pettyExpenseTotal.toLocaleString()} đ</strong>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Bank Panel */}
                <div className="panel" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', borderTop: '4px solid #22c55e' }}>
                  <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontWeight: '700', fontSize: '15px' }}>
                    <span>[KÉT 2] TÀI KHOẢN NGÂN HÀNG</span>
                    <span className="badge badge-green" style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>⚡ VietQR Webhook</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>TRÊN HỆ THỐNG</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803d' }}>{bankTheory.toLocaleString()} đ</div>
                    </div>
                    <div style={{ fontSize: '20px', color: '#86efac' }}>=</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px' }}>TRÊN APP NGÂN HÀNG</div>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Số dư app..."
                        value={bankActual}
                        onChange={(e) => setBankActual(e.target.value)}
                        style={{ textAlign: 'right', fontWeight: '700', fontSize: '16px', width: '145px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac' }}
                      />
                    </div>
                  </div>

                  {liveBankDiff !== null && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '14px',
                        background: liveBankDiff === 0 ? '#ecfdf5' : '#fef2f2',
                        color: liveBankDiff === 0 ? '#047857' : '#b91c1c',
                        border: `1px solid ${liveBankDiff === 0 ? '#a7f3d0' : '#fecaca'}`,
                      }}
                    >
                      CHÊNH LỆCH NGÂN HÀNG: {liveBankDiff === 0 ? 'Khớp (0 đ)' : `${liveBankDiff > 0 ? '+' : ''}${liveBankDiff.toLocaleString()} đ`}
                    </div>
                  )}

                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Phân rã doanh thu chuyển khoản</h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span>Bán hàng qua VietQR</span>
                      <strong>{bankSalesVal.toLocaleString()} đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span>Thu nợ qua Chuyển khoản</span>
                      <strong style={{ color: '#16a34a' }}>+ {bankDebtCollectedVal.toLocaleString()} đ</strong>
                    </div>
                  </div>
                </div>

                {/* Panel 3: TỔNG KẾT & CHỐT NGÀY */}
                <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid #e2e8f0', borderTop: '4px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', padding: '20px', borderRadius: '12px' }}>
                  <div className="panel-title" style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>
                    TỔNG KẾT &amp; CHỐT NGÀY
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                      <span>Doanh thu Tiền mặt</span>
                      <span style={{ color: '#0f172a', fontWeight: '600' }}>{cashSalesVal.toLocaleString()} đ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                      <span>Doanh thu Chuyển khoản</span>
                      <span style={{ color: '#0f172a', fontWeight: '600' }}>{bankSalesVal.toLocaleString()} đ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '12px', paddingBottom: '16px', borderBottom: '1px dashed #cbd5e1' }}>
                      <span>Doanh thu Ghi nợ (Chưa thu)</span>
                      <span style={{ color: '#ea580c', fontWeight: '600' }}>{(summary?.debtSales || 0).toLocaleString()} đ</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Tổng Doanh Thu</span>
                      <span style={{ color: '#2563eb', fontSize: '22px', fontWeight: '800' }}>{(summary?.totalRevenue || 0).toLocaleString()} đ</span>
                    </div>
                  </div>

                  {/* Discrepancy Alert Block */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Trạng thái chốt sổ:</div>
                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: isClosed ? '#16a34a' : (liveCashDiff === null ? '#334155' : (liveCashDiff === 0 ? '#16a34a' : '#dc2626')) }}>
                      {isClosed
                        ? '✓ Đã hoàn tất chốt sổ ngày'
                        : (liveCashDiff === null
                            ? '⚠️ Chưa nhập tiền kiểm đếm thực tế'
                            : (liveCashDiff === 0 && (liveBankDiff === 0 || liveBankDiff === null)
                                ? '✓ Số liệu két khớp 100%'
                                : `⚠️ Chênh lệch tiền mặt: ${(liveCashDiff || 0).toLocaleString()} đ`))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ghi chú chốt sổ (nếu có)..."
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={handleCloseDay}
                      disabled={loading || isClosed}
                      style={{
                        width: '100%',
                        marginBottom: '10px',
                        fontSize: '15px',
                        padding: '12px',
                        background: isClosed ? '#16a34a' : '#2563eb',
                        border: 'none',
                        color: '#fff',
                        fontWeight: '700',
                        borderRadius: '8px',
                        cursor: isClosed ? 'default' : 'pointer',
                        opacity: isClosed ? 0.9 : 1,
                      }}
                    >
                      {isClosed ? '✓ ĐÃ CHỐT SỔ NGÀY' : '💾 XÁC NHẬN CHỐT SỔ NGÀY'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Panel 4: CHI TIẾT DÒNG TIỀN VÀ ĐƠN HÀNG */}
              <div className="panel" style={{ marginTop: '24px', borderTop: '4px solid #64748b', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h4 style={{ fontWeight: '700', color: '#0f172a', margin: 0, fontSize: '16px' }}>
                    📋 Chi tiết giao dịch &amp; Đơn hàng ({filteredTransactions.length} giao dịch)
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="form-control"
                      value={txFilter}
                      onChange={(e) => setTxFilter(e.target.value)}
                      style={{ width: '180px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', color: '#334155', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="ALL">Tất cả nguồn tiền</option>
                      <option value="CASH">Chỉ Tiền mặt</option>
                      <option value="BANK">Chỉ Chuyển khoản</option>
                    </select>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '13px', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>Thời gian</th>
                        <th style={{ padding: '10px 12px' }}>Mã / Đối tượng</th>
                        <th style={{ padding: '10px 12px' }}>Phân loại</th>
                        <th style={{ padding: '10px 12px' }}>Nguồn tiền</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá trị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>
                            Chưa có giao dịch phát sinh trong ngày này.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx, idx) => (
                          <tr
                            key={tx.code + '-' + idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: tx.isNegative ? '#fef2f2' : (tx.transactionType === 'DEBT_COLLECTION' ? '#f0fdf4' : '#fff'),
                              fontSize: '13px',
                            }}
                          >
                            <td style={{ padding: '10px 12px', color: '#64748b' }}>{tx.time}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <strong style={{ color: '#2563eb' }}>{tx.code}</strong>
                              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>({tx.performer})</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  background: tx.isNegative ? '#ffedd5' : '#dcfce7',
                                  color: tx.isNegative ? '#c2410c' : '#15803d',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                }}
                              >
                                {tx.category}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#334155' }}>{tx.paymentMethod}</td>
                            <td
                              style={{
                                padding: '10px 12px',
                                textAlign: 'right',
                                color: tx.isNegative ? '#dc2626' : '#16a34a',
                                fontWeight: '700',
                              }}
                            >
                              {tx.isNegative ? '-' : '+'} {(tx.amount || 0).toLocaleString()} đ
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: DENOMINATION COUNTER */}
        {showDenomModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '520px',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>🧮 Trình đếm Mệnh giá tiền mặt tại Két</h3>
                <button
                  type="button"
                  onClick={() => setShowDenomModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                {denomValues.map((val) => {
                  const count = Number(denomCounts[val]) || 0;
                  const lineTotal = val * count;
                  return (
                    <div
                      key={val}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ width: '110px', fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>
                        {val.toLocaleString()} đ
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>x</span>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={count || ''}
                          onChange={(e) => {
                            const valInput = e.target.value;
                            setDenomCounts({
                              ...denomCounts,
                              [val]: valInput === '' ? 0 : Math.max(0, parseInt(valInput, 10) || 0),
                            });
                          }}
                          placeholder="0"
                          style={{ width: '80px', textAlign: 'center', fontWeight: '700', fontSize: '14px', padding: '4px' }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>tờ</span>
                      </div>
                      <div style={{ width: '130px', textAlign: 'right', fontWeight: '700', color: lineTotal > 0 ? '#2563eb' : '#94a3b8', fontSize: '14px' }}>
                        = {lineTotal.toLocaleString()} đ
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '2px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>TỔNG TIỀN KIỂM ĐẾM:</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb' }}>{denomGrandTotal.toLocaleString()} đ</div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyDenomTotal}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  ✓ Áp dụng vào tiền đếm két
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: PETTY CASH FORM */}
        {showPettyModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '480px',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>➕ Tạo Phiếu Thu / Chi Lặt Vặt Tại Két</h3>
                <button
                  type="button"
                  onClick={() => setShowPettyModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePettyVoucher} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPettyType('OUT');
                      setPettyCategory('Chi mua bao bì/vật tư');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: pettyType === 'OUT' ? '#fee2e2' : 'transparent',
                      color: pettyType === 'OUT' ? '#dc2626' : '#64748b',
                    }}
                  >
                    🔴 PHIẾU CHI (Chi tiền ra)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPettyType('IN');
                      setPettyCategory('Nộp bổ sung tiền thối');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: pettyType === 'IN' ? '#dcfce7' : 'transparent',
                      color: pettyType === 'IN' ? '#15803d' : '#64748b',
                    }}
                  >
                    🟢 PHIẾU THU (Thu tiền vào)
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Phân loại:</label>
                  <select
                    className="form-control"
                    value={pettyCategory}
                    onChange={(e) => setPettyCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {pettyType === 'OUT' ? (
                      <>
                        <option value="Chi mua bao bì/vật tư">Chi mua bao bì/vật tư</option>
                        <option value="Chi tiền ship COD">Chi tiền ship COD</option>
                        <option value="Chi bồi hoàn khách hàng">Chi bồi hoàn khách hàng</option>
                        <option value="Chi mua đá/nước uống quầy">Chi mua đá/nước uống quầy</option>
                        <option value="Chi khác phát sinh">Chi khác phát sinh</option>
                      </>
                    ) : (
                      <>
                        <option value="Nộp bổ sung tiền thối">Nộp bổ sung tiền thối đầu ca</option>
                        <option value="Thu bồi hoàn nhân viên">Thu bồi hoàn chênh lệch từ nhân viên</option>
                        <option value="Thu khác">Thu khác</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Số tiền (đ):</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="1000"
                    placeholder="Nhập số tiền..."
                    value={pettyAmount}
                    onChange={(e) => setPettyAmount(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Lý do (chi tiết):</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập chi tiết diễn giải lý do..."
                    value={pettyReason}
                    onChange={(e) => setPettyReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPettyModal(false)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ background: pettyType === 'OUT' ? '#dc2626' : '#16a34a', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ✓ Thêm phiếu &amp; Tính két
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: CASH DROP FORM */}
        {showCashDropModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '440px',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>🏦 Rút Nộp Két Chính An Toàn</h3>
                <button
                  type="button"
                  onClick={() => setShowCashDropModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCashDrop} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#c2410c' }}>
                  ⚠️ Rút bớt tiền mặt thừa tại két quầy nộp vào Két an toàn của Cửa hàng trưởng!
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Số tiền rút nộp Két chính (đ):</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="100000"
                    value={cashDropAmount}
                    onChange={(e) => setCashDropAmount(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Diễn giải / Lý do:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cashDropReason}
                    onChange={(e) => setCashDropReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCashDropModal(false)}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ background: '#c2410c', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    ✓ Rút tiền &amp; Nộp Két chính
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
