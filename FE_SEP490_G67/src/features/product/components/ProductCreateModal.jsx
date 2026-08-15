import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ProductCreateForm from './ProductCreateForm';
import { productsApi } from '../api';
import { categoriesApi } from '../../category/api';
import { ADD_PRODUCT_FORM_ID } from '../constants';
import '../../../css/AddProduct.css';

export default function ProductCreateModal({
  isOpen,
  onClose,
  onProductCreated,
}) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (isOpen) {
      categoriesApi
        .getAllCategories()
        .then((list) => setCategories(Array.isArray(list) ? list : []))
        .catch(() => setCategories([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (formData) => {
    const created = await productsApi.create(formData);
    if (formData.imageFile && created?.id) {
      try {
        await productsApi.uploadImage(created.id, formData.imageFile);
      } catch (err) {
        console.error('Lỗi upload ảnh sản phẩm:', err);
      }
    }
    onProductCreated?.(created);
    onClose?.();
  };

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div
        className="product-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="product-modal-header">
          <h2 className="product-modal-title">Thêm sản phẩm mới</h2>
          <button
            type="button"
            className="product-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </header>

        <div className="product-modal-body">
          <ProductCreateForm
            formId={ADD_PRODUCT_FORM_ID}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
