import { useState, useEffect, useRef } from 'react';
import { X, ScanLine, Search, Plus, CheckCircle, AlertCircle, Package, ArrowRight } from 'lucide-react';
import { productsApi } from '../api';
import '../../../css/Product.css';

function playScanBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(success ? 1046.5 : 300, ctx.currentTime); // C6 for success
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (success ? 0.12 : 0.25));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export default function QuickBarcodeScanModal({
  isOpen,
  onClose,
  onScanNewProduct,
  onScanExistingProduct,
}) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { status: 'found'|'not_found', data: product|barcode, message: '' }
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setBarcodeInput('');
      setScanResult(null);
      setErrorMsg('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Global listener for USB scanner when this modal is open
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const code = buffer.trim() || barcodeInput.trim();
        if (code.length >= 3) {
          e.preventDefault();
          handleLookup(code);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, barcodeInput]);

  if (!isOpen) return null;

  const handleLookup = async (codeToLookup) => {
    const code = (codeToLookup || barcodeInput).trim();
    if (!code) {
      setErrorMsg('Vui lòng nhập hoặc quét mã vạch.');
      return;
    }

    setSearching(true);
    setErrorMsg('');

    try {
      const product = await productsApi.getByBarcode(code);
      if (product && product.id) {
        playScanBeep(true);
        onClose();
        onScanExistingProduct?.(product);
      } else {
        playScanBeep(true);
        onClose();
        onScanNewProduct?.(code);
      }
    } catch {
      // 404 or not found -> immediately open create modal with prefilled barcode
      playScanBeep(true);
      onClose();
      onScanNewProduct?.(code);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="pi-modal-backdrop" onClick={onClose}>
      <div className="pi-modal-dialog pi-scan-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pi-modal-header">
          <div>
            <h2 className="pi-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScanLine size={20} color="#004AC6" />
              Quét mã vạch sản phẩm
            </h2>
            <div className="pi-modal-subtitle">
              Sử dụng máy quét mã vạch cầm tay hoặc nhập mã để kiểm tra và thêm mới hàng hóa
            </div>
          </div>
          <button type="button" className="pi-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pi-modal-body" style={{ padding: '24px 28px' }}>
          {/* Scanner Visual Box */}
          <div className="pi-scanner-box">
            <div className="pi-scanner-laser-line" />
            <div className="pi-scanner-icon-wrap">
              <ScanLine size={48} className="pi-scanner-pulse-icon" />
            </div>
            <div className="pi-scanner-instruction">
              <strong>Sẵn sàng quét mã:</strong> Hướng đầu đọc máy quét vào mã vạch trên sản phẩm
            </div>
            <div className="pi-scanner-hint">
              Máy quét sẽ tự động nhận diện và điền mã vạch tức thì.
            </div>
          </div>

          {/* Manual / Scanner Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="pi-scanner-form"
          >
            <div className="pi-scanner-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="pi-scanner-input"
                placeholder="Nhập hoặc quét mã vạch (Barcode)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="pi-scanner-btn-submit"
                disabled={searching}
              >
                {searching ? 'Đang tra cứu…' : <><Search size={15} /> Kiểm tra</>}
              </button>
            </div>
          </form>

          {errorMsg && <div className="pi-unit-alert-error" style={{ marginTop: 16 }}>{errorMsg}</div>}
        </div>

        {/* Footer */}
        <div className="pi-modal-footer">
          <button
            type="button"
            className="pi-modal-btn pi-modal-btn--secondary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
