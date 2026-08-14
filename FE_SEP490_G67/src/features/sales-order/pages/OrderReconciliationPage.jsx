import React, { useState } from 'react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import '../../../css/AdminDashboard.css';
import '../../../css/OrderReconciliation.css';

export default function OrderReconciliationPage() {
  const [activeTab, setActiveTab] = useState('reconcile');
  const [isDayOpen, setIsDayOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('300000');

  // Reconcile State
  const [cashActual, setCashActual] = useState('');
  const [bankActual, setBankActual] = useState('');
  
  // Dynamic Financial Totals
  const [baseCashSales, setBaseCashSales] = useState(1380000);
  const [baseBankSales, setBaseBankSales] = useState(150000);
  const [pettyCashExpenseTotal, setPettyCashExpenseTotal] = useState(45000);
  const [pettyCashIncomeTotal, setPettyCashIncomeTotal] = useState(0);

  const cashTheory = Number(openingCashInput || 0) + baseCashSales + pettyCashIncomeTotal - pettyCashExpenseTotal;
  const bankTheory = baseBankSales;

  // Modals visibility
  const [showDenomModal, setShowDenomModal] = useState(false);
  const [showPettyModal, setShowPettyModal] = useState(false);
  const [showCashDropModal, setShowCashDropModal] = useState(false);

  // Denomination counter state
  const [denomCounts, setDenomCounts] = useState({
    500000: 2,
    200000: 2,
    100000: 2,
    50000: 0,
    20000: 1,
    10000: 1,
    5000: 1,
    2000: 0,
    1000: 0,
  });

  const denomValues = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

  const denomGrandTotal = denomValues.reduce((sum, val) => {
    return sum + val * (Number(denomCounts[val]) || 0);
  }, 0);

  // Petty Cash State
  const [pettyType, setPettyType] = useState('OUT');
  const [pettyCategory, setPettyCategory] = useState('Chi mua bao bì/vật tư');
  const [pettyAmount, setPettyAmount] = useState('');
  const [pettyReason, setPettyReason] = useState('');
  const [pettyVouchers, setPettyVouchers] = useState([
    {
      code: 'PC-001',
      type: 'OUT',
      category: 'Hoàn trả hàng',
      amount: 45000,
      reason: 'Hoàn tiền mặt cho khách đơn #DH038',
      time: '09:30 01/07',
      performer: 'Thị A',
    },
  ]);

  // Cash Drop State
  const [cashDropAmount, setCashDropAmount] = useState('1000000');
  const [cashDropVouchers, setCashDropVouchers] = useState([]);

  // Auto Webhook State
  const [webhookLogs, setWebhookLogs] = useState([
    {
      transId: 'FT24183091',
      orderCode: '#DH041',
      amount: 50000,
      time: '16:45:12',
      status: 'MATCHED_100',
    },
  ]);

  // Audit Filters
  const [chkUrgent, setChkUrgent] = useState(true);
  const [chkWarn, setChkWarn] = useState(false);
  const [chkInfo, setChkInfo] = useState(false);

  // Adjustment State
  const [searchCode, setSearchCode] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adjReason, setAdjReason] = useState('');
  const [adjRefundMethod, setAdjRefundMethod] = useState('CASH');

  // Sample data for demo
  const [anomalies, setAnomalies] = useState([
    {
      id: 'anomaly-1',
      type: 'urgent',
      title: '[1] Chuyển khoản chưa xác nhận — Đơn #041',
      tag: 'Chưa nhận tiền',
      customer: 'Anh Tuấn',
      amount: 50000,
      time: '01/07 16:45',
      seller: 'Thị A',
      note: 'Hàng đã giao cho khách mang đi, nhưng tiền chuyển khoản ngân hàng chưa được xác nhận.',
      impact: 'Ảnh hưởng đối soát: +50,000đ CK chờ xác nhận',
      resolved: false,
    },
    {
      id: 'anomaly-2',
      type: 'urgent',
      title: '[2] Đơn hủy có thu tiền mặt — Đơn #039',
      tag: 'Đã nhận tiền mặt',
      customer: 'Khách lẻ',
      amount: 120000,
      time: '01/07 11:20',
      seller: 'Văn B',
      note: 'Nhân viên báo hủy đơn do nhập nhầm, nhưng lịch sử quầy ghi nhận đã nhận 120,000đ tiền mặt.',
      impact: 'Ảnh hưởng đối soát: Thừa tiền mặt tại quầy',
      resolved: false,
    },
    {
      id: 'anomaly-3',
      type: 'warning',
      title: '[3] Hoàn tiền mặt cho hóa đơn Chuyển khoản — Đơn #038',
      tag: 'Cảnh báo hệ thống',
      customer: 'Chị Mai',
      amount: 45000,
      time: '01/07 09:30',
      seller: 'Thị A',
      note: 'Đơn hàng gốc thanh toán CK nhưng khi hoàn hàng lại chi tiền mặt tại két.',
      impact: 'Giảm tiền mặt két tại quầy',
      resolved: false,
    },
    {
      id: 'anomaly-4',
      type: 'info',
      title: '[4] Sản phẩm bán dưới giá vốn — Đơn #042',
      tag: 'Thông tin',
      customer: 'Khách quen',
      amount: 250000,
      time: '01/07 14:30',
      seller: 'Văn B',
      note: 'Sản phẩm "Nước mắm Nam Ngư 500ml" bán với giá 20,000đ (Giá vốn 22,000đ).',
      impact: 'Giảm biên lợi nhuận đơn hàng',
      resolved: false,
    },
  ]);

  const [adjustmentsHistory, setAdjustmentsHistory] = useState([
    {
      id: 'DC-035',
      orderCode: '#DH035',
      time: '01/07/2024 14:15',
      changeSummary: 'Dép tổ ong (Size L): 2 -> 1 đôi',
      diffAmount: -40000,
      refundMethod: 'Tiền mặt',
      reason: 'Khách đổi ý lấy 1 đôi thay vì 2 đôi',
      createdByName: 'Văn B',
      status: 'Đã hoàn tất',
    },
  ]);

  const cashDiff = cashActual !== '' ? Number(cashActual) - cashTheory : null;
  const bankDiff = bankActual !== '' ? Number(bankActual) - bankTheory : null;

  const handleApplyDenomTotal = () => {
    setCashActual(denomGrandTotal.toString());
    setShowDenomModal(false);
  };

  const handleCreatePettyVoucher = (e) => {
    e.preventDefault();
    if (!pettyAmount || Number(pettyAmount) <= 0) return;
    const amt = Number(pettyAmount);
    const newVoucher = {
      code: `${pettyType === 'OUT' ? 'PC' : 'PT'}-00${pettyVouchers.length + 1}`,
      type: pettyType,
      category: pettyCategory,
      amount: amt,
      reason: pettyReason || 'Chi lặt vặt phát sinh tại két',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
      performer: 'Thu ngân quầy',
    };
    setPettyVouchers([newVoucher, ...pettyVouchers]);
    if (pettyType === 'OUT') {
      setPettyCashExpenseTotal((prev) => prev + amt);
    } else {
      setPettyCashIncomeTotal((prev) => prev + amt);
    }
    setPettyAmount('');
    setPettyReason('');
    setShowPettyModal(false);
    alert(`Đã lưu ${pettyType === 'OUT' ? 'Phiếu Chi' : 'Phiếu Thu'} thành công!`);
  };

  const handleCreateCashDrop = (e) => {
    e.preventDefault();
    if (!cashDropAmount || Number(cashDropAmount) <= 0) return;
    const amt = Number(cashDropAmount);
    const newDrop = {
      code: `CD-00${cashDropVouchers.length + 1}`,
      amount: amt,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      performedBy: 'Thu ngân',
      receivedBy: 'Cửa hàng trưởng',
    };
    setCashDropVouchers([newDrop, ...cashDropVouchers]);
    setPettyCashExpenseTotal((prev) => prev + amt);
    setShowCashDropModal(false);
    alert(`Đã rút ${amt.toLocaleString()} đ từ két quầy nộp vào Két an toàn!`);
  };

  const handleSimulateBankWebhook = () => {
    const randomTrans = `FT${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const randomOrder = `#DH0${Math.floor(Math.random() * 90 + 10)}`;
    const randomMoney = 150000;
    const newLog = {
      transId: randomTrans,
      orderCode: randomOrder,
      amount: randomMoney,
      time: new Date().toLocaleTimeString('vi-VN'),
      status: 'MATCHED_100',
    };
    setWebhookLogs([newLog, ...webhookLogs]);
    setBaseBankSales((prev) => prev + randomMoney);
    alert(`⚡ Giả lập Webhook SePay/Casso thành công!\nNgân hàng báo tiền về +${randomMoney.toLocaleString()}đ (Mã GD: ${randomTrans})\nTự động khớp đơn ${randomOrder} 100%!`);
  };

  const handleResolveAnomaly = (id) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  };

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const newTicket = {
      id: `DC-0${Math.floor(Math.random() * 900 + 100)}`,
      orderCode: selectedOrder.code,
      time: new Date().toLocaleString('vi-VN'),
      changeSummary: selectedOrder.changeSummary || 'Chỉnh sửa số lượng sản phẩm',
      diffAmount: selectedOrder.diffAmount || -30000,
      refundMethod: adjRefundMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
      reason: adjReason || 'Điều chỉnh sai sót khi thanh toán',
      createdByName: 'Chủ cửa hàng',
      status: 'Đã hoàn tất',
    };
    setAdjustmentsHistory([newTicket, ...adjustmentsHistory]);
    setSelectedOrder(null);
    setAdjReason('');
    alert('Đã lưu phiếu điều chỉnh và tự động cập nhật kho & doanh thu!');
  };

  return (
    <div className="admin-layout">
      <SideBar />
      <div className="admin-content">
        <AdminHeader />
        <main className="admin-main order-reconciliation-page">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Quản lý Đơn hàng &amp; Đối soát Két</h1>
              <p>Chốt sổ két tiền mặt, tự động đối soát VietQR Webhook và kiểm tra bất thường</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSimulateBankWebhook}
                style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: '600', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
              >
                ⚡ Test Webhook VietQR (SePay API)
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tab-navigation">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'reconcile' ? 'active' : ''}`}
              onClick={() => setActiveTab('reconcile')}
            >
              💰 Đối soát &amp; Đối chiếu két
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              🚨 Hậu kiểm bất thường
              <span
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  marginLeft: '6px',
                }}
              >
                {anomalies.filter((a) => !a.resolved && a.type === 'urgent').length}
              </span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'adjust' ? 'active' : ''}`}
              onClick={() => setActiveTab('adjust')}
            >
              ✏️ Điều chỉnh đơn hàng
            </button>
          </div>

          {/* Tab 1: Reconcile */}
          {activeTab === 'reconcile' && (
            <div className="tab-content active">
              {/* Day Open Banner */}
              {!isDayOpen && (
                <div className="open-day-banner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1' }}>
                    <div style={{ fontSize: '28px' }}>🔑</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14.5px', color: '#92400e', marginBottom: '3px' }}>
                        Chưa xác nhận tiền đầu ngày — 01/07/2024
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#a16207' }}>
                        Chốt sổ hôm qua (30/06): <strong>300,000 đ</strong>. Đếm két thực tế rồi nhập vào ô bên cạnh để mở ngày.
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
                        style={{
                          width: '160px',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontSize: '14px',
                          paddingRight: '28px',
                          borderColor: '#f59e0b',
                        }}
                      />
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', color: '#64748b', fontSize: '13px' }}>
                        đ
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsDayOpen(true)}
                      style={{ background: '#d97706', borderColor: '#d97706', whiteSpace: 'nowrap' }}
                    >
                      ✓ Xác nhận mở ngày
                    </button>
                  </div>
                </div>
              )}

              {/* Locked Overlay if Day is not open */}
              <div style={{ position: 'relative' }}>
                {!isDayOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '0',
                      background: 'rgba(248,250,252,0.85)',
                      backdropFilter: 'blur(4px)',
                      zIndex: '10',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '12px',
                    }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        padding: '20px 28px',
                        borderRadius: '16px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>🔒</span>
                      <span>
                        Vui lòng <strong>Xác nhận mở ngày</strong> bên trên để xem các giao dịch và đối soát của ngày hôm nay!
                      </span>
                    </div>
                  </div>
                )}

                {/* Dashboard Stats */}
                <div className="grid-stats">
                  <div className="stat-card">
                    <div className="stat-card__label">Tổng đơn hàng</div>
                    <div className="stat-card__value">18 đơn</div>
                    <div className="stat-card__subtext">15 hoàn thành · 3 đã hủy</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__label">Doanh thu ghi nhận</div>
                    <div className="stat-card__value">{(baseCashSales + baseBankSales + 250000).toLocaleString()} đ</div>
                    <div className="stat-card__subtext">Tiền mặt + Chuyển khoản + Nợ</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__label">Thực thu hôm nay</div>
                    <div className="stat-card__value">{(baseCashSales + baseBankSales).toLocaleString()} đ</div>
                    <div className="stat-card__subtext">Tổng tiền thực tế đã thu</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card__label">Ghi nợ khách hàng</div>
                    <div className="stat-card__value" style={{ color: '#ea580c' }}>250,000 đ</div>
                    <div className="stat-card__subtext">2 đơn hàng ghi nợ</div>
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
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          ➕ Phiếu Thu/Chi
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCashDropModal(true)}
                          style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '4px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
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
                          style={{ textAlign: 'right', fontWeight: '700', fontSize: '16px', width: '140px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    </div>

                    {cashDiff !== null && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          textAlign: 'center',
                          fontWeight: '700',
                          fontSize: '14px',
                          background: cashDiff === 0 ? '#ecfdf5' : '#fef2f2',
                          color: cashDiff === 0 ? '#047857' : '#b91c1c',
                          border: `1px solid ${cashDiff === 0 ? '#a7f3d0' : '#fecaca'}`,
                        }}
                      >
                        CHÊNH LỆCH KÉT: {cashDiff === 0 ? 'Khớp (0 đ)' : `${cashDiff > 0 ? '+' : ''}${cashDiff.toLocaleString()} đ`}
                      </div>
                    )}

                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Diễn giải dòng tiền mặt tại quầy</h5>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span>Tiền mặt đầu ngày</span>
                        <strong>{Number(openingCashInput || 0).toLocaleString()} đ</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span>+ Thu bán hàng &amp; Thu khác</span>
                        <strong style={{ color: '#16a34a' }}>+ {(baseCashSales + pettyCashIncomeTotal).toLocaleString()} đ</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                        <span>− Chi lặt vặt / Hoàn trả / Rút két</span>
                        <strong style={{ color: '#dc2626' }}>- {pettyCashExpenseTotal.toLocaleString()} đ</strong>
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
                          style={{ textAlign: 'right', fontWeight: '700', fontSize: '16px', width: '140px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac' }}
                        />
                      </div>
                    </div>

                    {bankDiff !== null && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          textAlign: 'center',
                          fontWeight: '700',
                          fontSize: '14px',
                          background: bankDiff === 0 ? '#ecfdf5' : '#fef2f2',
                          color: bankDiff === 0 ? '#047857' : '#b91c1c',
                          border: `1px solid ${bankDiff === 0 ? '#a7f3d0' : '#fecaca'}`,
                        }}
                      >
                        CHÊNH LỆCH NGÂN HÀNG: {bankDiff === 0 ? 'Khớp (0 đ)' : `${bankDiff > 0 ? '+' : ''}${bankDiff.toLocaleString()} đ`}
                      </div>
                    )}

                    <div style={{ fontSize: '13px', color: '#334155' }}>
                      <h5 style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Nhật ký Webhook tự động khớp 100%</h5>
                      {webhookLogs.map((log) => (
                        <div key={log.transId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #e2e8f0', fontSize: '12.5px' }}>
                          <span>{log.time} · <strong>{log.orderCode}</strong> ({log.transId})</span>
                          <strong style={{ color: '#16a34a' }}>+ {log.amount.toLocaleString()} đ ✓</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Panel 3: TỔNG KẾT & CHỐT NGÀY */}
                  <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', border: '1px solid #e2e8f0', borderTop: '4px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)', padding: '20px', borderRadius: '12px' }}>
                    <div className="panel-title" style={{ color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>
                      TỔNG KẾT &amp; CHỐT NGÀY
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                        <span>Doanh thu Tiền mặt</span>
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>{baseCashSales.toLocaleString()} đ</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                        <span>Doanh thu Chuyển khoản</span>
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>{baseBankSales.toLocaleString()} đ</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569', marginBottom: '12px', paddingBottom: '16px', borderBottom: '1px dashed #cbd5e1' }}>
                        <span>Doanh thu Ghi nợ (Chưa thu)</span>
                        <span style={{ color: '#ea580c', fontWeight: '600' }}>250,000 đ</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Tổng Doanh Thu</span>
                        <span style={{ color: '#2563eb', fontSize: '24px', fontWeight: '800' }}>{(baseCashSales + baseBankSales + 250000).toLocaleString()} đ</span>
                      </div>
                    </div>

                    {/* Discrepancy Alert Block */}
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Trạng thái khớp sổ:</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: cashDiff === null ? '#334155' : (cashDiff === 0 && bankDiff === 0 ? '#16a34a' : '#dc2626') }}>
                        {cashDiff === null
                          ? '⚠️ Chưa nhập tiền két thực tế'
                          : (cashDiff === 0 && (bankDiff === 0 || bankDiff === null)
                              ? '✓ Đã khớp sổ hoàn toàn'
                              : `⚠️ Chênh lệch: ${(cashDiff || 0).toLocaleString()} đ`)}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        type="button"
                        onClick={() => alert('Đã lưu chốt sổ ngày thành công!')}
                        style={{ width: '100%', marginBottom: '12px', fontSize: '15px', padding: '14px', background: '#2563eb', border: 'none', color: '#fff', fontWeight: '700', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        💾 XÁC NHẬN CHỐT SỔ NGÀY
                      </button>
                      <button
                        type="button"
                        onClick={() => alert('Xuất báo cáo thành công!')}
                        style={{ width: '100%', background: '#fff', borderColor: '#cbd5e1', color: '#334155', padding: '10px', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      >
                        📥 XUẤT BÁO CÁO TỔNG HỢP
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panel 4: CHI TIẾT DÒNG TIỀN VÀ ĐƠN HÀNG */}
                <div className="panel" style={{ marginTop: '24px', borderTop: '4px solid #64748b', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: '700', color: '#0f172a', margin: 0, fontSize: '16px' }}>📋 Chi tiết giao dịch &amp; Đơn hàng</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="form-control" style={{ width: '180px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', color: '#334155', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option>Tất cả nguồn tiền</option>
                        <option>Chỉ Tiền mặt</option>
                        <option>Chỉ Chuyển khoản</option>
                      </select>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '13px', color: '#64748b' }}>
                          <th style={{ padding: '10px 12px' }}>Thời gian</th>
                          <th style={{ padding: '10px 12px' }}>Mã Đơn / Giao dịch</th>
                          <th style={{ padding: '10px 12px' }}>Loại</th>
                          <th style={{ padding: '10px 12px' }}>Nguồn tiền</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá trị</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pettyVouchers.map((v) => (
                          <tr key={v.code} style={{ borderBottom: '1px solid #f1f5f9', background: v.type === 'OUT' ? '#fef2f2' : '#f0fdf4', fontSize: '13px' }}>
                            <td style={{ padding: '10px 12px' }}>{v.time}</td>
                            <td style={{ padding: '10px 12px' }}><strong>{v.code} ({v.category})</strong></td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ background: v.type === 'OUT' ? '#ffedd5' : '#dcfce7', color: v.type === 'OUT' ? '#c2410c' : '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                                {v.type === 'OUT' ? 'Phiếu Chi' : 'Phiếu Thu'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>Tiền mặt</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: v.type === 'OUT' ? '#dc2626' : '#16a34a', fontWeight: '700' }}>
                              {v.type === 'OUT' ? '-' : '+'} {v.amount.toLocaleString()} đ
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <td style={{ padding: '10px 12px' }}>14:30 01/07</td>
                          <td style={{ padding: '10px 12px' }}><strong style={{ color: '#2563eb' }}>#DH042</strong></td>
                          <td style={{ padding: '10px 12px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Bán hàng</span></td>
                          <td style={{ padding: '10px 12px' }}>Tiền mặt</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>+ 250,000 đ</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <td style={{ padding: '10px 12px' }}>13:15 01/07</td>
                          <td style={{ padding: '10px 12px' }}><strong style={{ color: '#2563eb' }}>#DH041</strong></td>
                          <td style={{ padding: '10px 12px' }}><span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Bán hàng</span></td>
                          <td style={{ padding: '10px 12px' }}>Chuyển khoản VietQR</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>+ 50,000 đ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Anomaly Audit */}
          {activeTab === 'audit' && (
            <div className="tab-content active">
              <div className="panel" style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', color: '#334155', fontSize: '14px' }}>Bộ lọc hậu kiểm:</span>
                  <select className="form-control" style={{ width: '150px', padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <option>Hôm nay (01/07)</option>
                    <option>Hôm qua (30/06)</option>
                    <option>Tuần này</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: '700', color: '#475569', fontSize: '13px' }}>Hiển thị:</span>
                  <label style={{ fontWeight: '600', cursor: 'pointer', color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="checkbox" checked={chkUrgent} onChange={(e) => setChkUrgent(e.target.checked)} /> 🔴 Cần xử lý gấp
                  </label>
                  <label style={{ fontWeight: '600', cursor: 'pointer', color: '#ea580c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="checkbox" checked={chkWarn} onChange={(e) => setChkWarn(e.target.checked)} /> 🟠 Bất thường hệ thống
                  </label>
                  <label style={{ fontWeight: '600', cursor: 'pointer', color: '#a16207', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="checkbox" checked={chkInfo} onChange={(e) => setChkInfo(e.target.checked)} /> 🟡 Thông tin lưu ý
                  </label>
                </div>
              </div>

              {/* Anomaly Groups */}
              {chkUrgent && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626', marginBottom: '12px', borderBottom: '2px solid #fee2e2', paddingBottom: '6px' }}>
                    🔴 CẦN XỬ LÝ GẤP ({anomalies.filter((a) => !a.resolved && a.type === 'urgent').length} việc)
                  </h3>
                  {anomalies
                    .filter((a) => a.type === 'urgent')
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: item.resolved ? '#f8fafc' : '#fff',
                          border: `1px solid ${item.resolved ? '#e2e8f0' : '#fca5a5'}`,
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '16px',
                          opacity: item.resolved ? 0.6 : 1,
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>
                            {item.title} <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>{item.tag}</span>
                          </h4>
                          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 8px' }}>{item.note}</p>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Khách hàng: <strong>{item.customer}</strong> · Số tiền: <strong style={{ color: '#dc2626' }}>{item.amount.toLocaleString()} đ</strong> · Người bán: <strong>{item.seller}</strong>
                          </div>
                        </div>
                        {!item.resolved && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleResolveAnomaly(item.id)}
                              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              ✓ Đã xác nhận (Khớp)
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Order Adjustment */}
          {activeTab === 'adjust' && (
            <div className="tab-content active">
              <div className="panel" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
                  ✏️ Tìm &amp; Điều chỉnh đơn hàng đã hoàn thành
                </h3>
                <div style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập mã đơn hàng (VD: #DH035)..."
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (!searchCode) return;
                      setSelectedOrder({
                        code: searchCode.toUpperCase(),
                        changeSummary: 'Dép tổ ong: 2 -> 1 đôi',
                        diffAmount: -40000,
                      });
                    }}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Tìm đơn
                  </button>
                </div>
              </div>

              {/* Order Adjustment Form Modal / Section */}
              {selectedOrder && (
                <div className="panel" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '2px solid #3b82f6', marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e40af', marginBottom: '12px' }}>
                    Tạo phiếu điều chỉnh cho đơn {selectedOrder.code}
                  </h4>
                  <form onSubmit={handleSaveAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Lý do điều chỉnh (bắt buộc):</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="Nhập chi tiết lý do (VD: Nhập nhầm số lượng từ 2 thành 1)..."
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Hình thức hoàn tiền:</label>
                        <select
                          className="form-control"
                          value={adjRefundMethod}
                          onChange={(e) => setAdjRefundMethod(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="CASH">Tiền mặt tại két</option>
                          <option value="BANK_TRANSFER">Chuyển khoản</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Số tiền hoàn trả khách:</div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
                          {Math.abs(selectedOrder.diffAmount).toLocaleString()} đ
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(null)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Xác nhận &amp; Tự động Rollback kho
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Adjustment History Table */}
              <div className="panel" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
                  📜 Lịch sử Phiếu điều chỉnh đơn hàng (Adjustment Tickets)
                </h4>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '13px', color: '#64748b' }}>
                      <th style={{ padding: '10px 12px' }}>Mã phiếu</th>
                      <th style={{ padding: '10px 12px' }}>Đơn gốc</th>
                      <th style={{ padding: '10px 12px' }}>Thời gian</th>
                      <th style={{ padding: '10px 12px' }}>Chi tiết thay đổi</th>
                      <th style={{ padding: '10px 12px' }}>Tiền chênh lệch</th>
                      <th style={{ padding: '10px 12px' }}>Lý do</th>
                      <th style={{ padding: '10px 12px' }}>Người làm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustmentsHistory.map((adj) => (
                      <tr key={adj.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#2563eb' }}>{adj.id}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>{adj.orderCode}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{adj.time}</td>
                        <td style={{ padding: '10px 12px' }}>{adj.changeSummary}</td>
                        <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: '700' }}>
                          {adj.diffAmount.toLocaleString()} đ ({adj.refundMethod})
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{adj.reason}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{adj.createdByName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                          <option value="Chi bồi hoàn khách">Chi bồi hoàn khách hàng</option>
                          <option value="Chi mua đá/nước quầy">Chi mua đá/nước uống quầy</option>
                          <option value="Chi khác">Chi khác phát sinh</option>
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
                      ✓ Lưu phiếu &amp; Cập nhật két
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
                    ⚠️ Tiền mặt tại quầy vượt hạn mức an toàn 5.000.000đ. Vui lòng rút bớt tiền nộp về Két an toàn của Cửa hàng trưởng!
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
    </div>
  );
}
