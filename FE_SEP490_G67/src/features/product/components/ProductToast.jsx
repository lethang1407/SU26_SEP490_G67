import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import '../../../css/Product.css';

const EXIT_DURATION_MS = 250;

/**
 * Modern KiotViet / E-commerce style Floating Toast Notification
 * Fixed at bottom-right of viewport with high z-index (100000) so it's always
 * visible over modals, forms, and pages without requiring user to scroll up.
 */
export default function ProductToast({
  message,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  duration = 4000,
  onClose,
}) {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, EXIT_DURATION_MS);
  }, [onClose]);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    setIsExiting(false);

    if (duration > 0) {
      const timer = setTimeout(handleDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, handleDismiss]);

  if (!visible || !message) return null;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={19} className="pi-toast-icon pi-toast-icon--success" />;
      case 'error':
        return <AlertCircle size={19} className="pi-toast-icon pi-toast-icon--error" />;
      case 'warning':
        return <AlertTriangle size={19} className="pi-toast-icon pi-toast-icon--warning" />;
      default:
        return <Info size={19} className="pi-toast-icon pi-toast-icon--info" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'success':
        return 'Thành công';
      case 'error':
        return 'Thông báo lỗi';
      case 'warning':
        return 'Cảnh báo';
      default:
        return 'Thông báo';
    }
  };

  // Support multiline message (split by newline)
  const lines = typeof message === 'string' ? message.split('\n').filter(Boolean) : [String(message)];

  return (
    <div
      className={`pi-toast-item pi-toast-item--${type} ${isExiting ? 'pi-toast-item--exit' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="pi-toast-icon-wrap">
        {renderIcon()}
      </div>

      <div className="pi-toast-content">
        <div className="pi-toast-title">{getTitle()}</div>
        <div className="pi-toast-message">
          {lines.length === 1 ? (
            lines[0]
          ) : (
            <ul className="pi-toast-list">
              {lines.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        type="button"
        className="pi-toast-close"
        onClick={handleDismiss}
        aria-label="Đóng thông báo"
      >
        <X size={15} />
      </button>
    </div>
  );
}

/**
 * Container wrapper that renders multiple or single toast in bottom-right corner.
 */
export function ProductToastContainer({ children }) {
  if (!children) return null;
  return (
    <div className="pi-toast-container" aria-live="polite">
      {children}
    </div>
  );
}
