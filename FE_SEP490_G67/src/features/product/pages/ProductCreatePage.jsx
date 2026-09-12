import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductCreateForm from '../components/ProductCreateForm';
import { productsApi, toUpsertPayload } from '../api';
import { categoriesApi } from '../../category/api';
import { ADD_PRODUCT_FORM_ID, PRODUCT_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/AddProduct.css';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoriesApi
      .getAllCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  const handleCancel = () => {
    navigate(PRODUCT_ROUTES.list);
  };

  const handleSubmit = async (formData) => {
    const created = await productsApi.create(toUpsertPayload(formData));
    if (formData.imageFile && created?.id) {
      try {
        await productsApi.uploadImage(created.id, formData.imageFile);
      } catch (err) {
        console.error('Lỗi tải ảnh Cloudinary:', err);
        alert('Sản phẩm đã được tạo thành công! Tuy nhiên việc tải ảnh lên Cloudinary gặp sự cố. Bạn có thể cập nhật lại ảnh trong phần chỉnh sửa sản phẩm.');
      }
    }
    navigate(PRODUCT_ROUTES.list);
  };

  return (
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main">
          <div className="dashboard-container add-product-page">
            <nav className="add-product-breadcrumb" aria-label="Breadcrumb">
              <span className="add-product-breadcrumb__muted">Sản phẩm</span>
              <span className="add-product-breadcrumb__sep">&gt;</span>
              <Link to={PRODUCT_ROUTES.list} className="add-product-breadcrumb__link">
                Danh sách sản phẩm
              </Link>
              <span className="add-product-breadcrumb__sep">&gt;</span>
              <span className="add-product-breadcrumb__current">Thêm sản phẩm mới</span>
            </nav>

            <ProductCreateForm
              formId={ADD_PRODUCT_FORM_ID}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        </main>
      </div>
  );
}
