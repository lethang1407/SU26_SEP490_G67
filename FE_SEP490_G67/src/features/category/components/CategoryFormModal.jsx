import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

export default function CategoryFormModal({
  open,
  mode = 'create',
  initialData = null,
  onClose,
  onSubmit,
}) {
  const nameId = useId();
  const descId = useId();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
    setErrors({});
    setSaving(false);
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Vui lòng nhập tên danh mục.';
    if (name.trim().length > 100) next.name = 'Tên tối đa 100 ký tự.';
    if (description.length > 500) next.description = 'Mô tả tối đa 500 ký tự.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await onSubmit?.({
        name: name.trim(),
        description: description.trim() || null,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Không lưu được danh mục.';
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cat-overlay" role="presentation" onClick={() => !saving && onClose?.()}>
      <div
        className="cat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cat-modal__head">
          <div>
            <div className="cat-modal__kicker">{isEdit ? 'CHỈNH SỬA' : 'THÊM MỚI'}</div>
            <h2 id="cat-modal-title" className="cat-modal__title">
              {isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
            </h2>
          </div>
          <button
            type="button"
            className="cat-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        <form className="cat-modal__form" onSubmit={handleSubmit} noValidate>
          <div className="cat-modal__body">
            <div className="cat-field">
              <label className="cat-field__label" htmlFor={nameId}>
                Tên danh mục <span className="cat-field__req">*</span>
              </label>
              <input
                id={nameId}
                className={`cat-field__input${errors.name ? ' is-error' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: null, submit: null }));
                }}
                autoFocus
                maxLength={100}
                placeholder="VD: Gia vị"
              />
              {errors.name ? <p className="cat-field__error">{errors.name}</p> : null}
            </div>

            <div className="cat-field">
              <label className="cat-field__label" htmlFor={descId}>
                Mô tả <span className="cat-field__hint">(tuỳ chọn)</span>
              </label>
              <textarea
                id={descId}
                className={`cat-field__textarea${errors.description ? ' is-error' : ''}`}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((prev) => ({ ...prev, description: null, submit: null }));
                }}
                rows={4}
                maxLength={500}
                placeholder="Mô tả ngắn giúp nhân viên nhận biết nhóm hàng"
              />
              {errors.description ? (
                <p className="cat-field__error">{errors.description}</p>
              ) : null}
            </div>

            {errors.submit ? <p className="cat-field__error">{errors.submit}</p> : null}
          </div>

          <footer className="cat-modal__foot">
            <button
              type="button"
              className="cat-btn cat-btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button type="submit" className="cat-btn cat-btn--primary" disabled={saving}>
              {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm danh mục'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
