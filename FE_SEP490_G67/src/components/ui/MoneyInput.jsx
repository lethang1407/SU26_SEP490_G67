import React, { useMemo } from 'react';

/**
 * MoneyInput: Ô nhập tiền tệ tự động định dạng phân cách hàng nghìn (chuẩn vi-VN với dấu chấm .)
 * - Tự động định dạng khi người dùng gõ số: 100000 -> 100.000, 1001101 -> 1.001.101
 * - Hỗ trợ gõ hoặc dán số có dấu chấm, phẩy, khoảng trắng
 * - Giữ vị trí con trỏ (cursor) chuẩn xác, không nhảy về cuối khi tự động thêm dấu phân cách
 * - Xóa hết -> trở về ô trống sạch sẽ mà không bị kẹt số 0
 */
export default function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  className = 'pi-edit-input',
  style = {},
  disabled = false,
  required = false,
  allowEmpty = true,
  ...rest
}) {
  const displayValue = useMemo(() => {
    if (value === '' || value === null || value === undefined) return '';
    const num = Number(value);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('vi-VN').format(num);
  }, [value]);

  const handleChange = (e) => {
    const input = e.target;
    const raw = input.value;
    const cursorPos = input.selectionStart || 0;

    // Đếm số lượng chữ số nằm trước con trỏ hiện tại
    const digitsBefore = raw.slice(0, cursorPos).replace(/\D/g, '').length;

    // Loại bỏ tất cả ký tự không phải chữ số
    const digitsOnly = raw.replace(/\D/g, '');

    const nextVal = digitsOnly === '' ? (allowEmpty ? '' : 0) : Number(digitsOnly);
    onChange?.(nextVal);

    // Cập nhật vị trí con trỏ sau khi React re-render chuỗi định dạng mới
    requestAnimationFrame(() => {
      if (!input) return;
      const formatted = digitsOnly === '' ? '' : new Intl.NumberFormat('vi-VN').format(Number(digitsOnly));
      let newCursorPos = 0;
      let counted = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          counted++;
        }
        if (counted === digitsBefore) {
          newCursorPos = i + 1;
          break;
        }
      }
      if (counted < digitsBefore) {
        newCursorPos = formatted.length;
      }
      input.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      const input = e.target;
      const cursorPos = input.selectionStart;
      const selEnd = input.selectionEnd;

      // Nếu không có vùng chọn văn bản và con trỏ ngay sau dấu phân cách (. hoặc ,)
      if (cursorPos === selEnd && cursorPos > 0) {
        const charBefore = input.value[cursorPos - 1];
        if (charBefore === '.' || charBefore === ',') {
          e.preventDefault();
          // Xóa chữ số nằm ngay trước dấu phân cách
          const raw = input.value;
          const newRaw = raw.slice(0, cursorPos - 2) + raw.slice(cursorPos);
          const digitsOnly = newRaw.replace(/\D/g, '');
          const nextVal = digitsOnly === '' ? (allowEmpty ? '' : 0) : Number(digitsOnly);
          onChange?.(nextVal);

          requestAnimationFrame(() => {
            const digitsBefore = raw.slice(0, cursorPos - 2).replace(/\D/g, '').length;
            const formatted = digitsOnly === '' ? '' : new Intl.NumberFormat('vi-VN').format(Number(digitsOnly));
            let newCursorPos = 0;
            let counted = 0;
            for (let i = 0; i < formatted.length; i++) {
              if (/\d/.test(formatted[i])) counted++;
              if (counted === digitsBefore) {
                newCursorPos = i + 1;
                break;
              }
            }
            input.setSelectionRange(newCursorPos, newCursorPos);
          });
        }
      }
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      style={style}
      {...rest}
    />
  );
}
