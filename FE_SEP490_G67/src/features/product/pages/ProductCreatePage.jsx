import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductCreateForm from '../components/ProductCreateForm';
import { productsApi } from '../api';
import { categoriesApi } from '../../category/api';
import { ADD_PRODUCT_FORM_ID, PRODUCT_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/AddProduct.css';

function toUpsertPayload(formData) {
  return {
    name: formData.name,
    sku: formData.sku || null,
    barcode: formData.barcode || null,
    categoryId: Number(formData.categoryId),
    brand: formData.brand || null,
    description: formData.description || null,
    status: formData.isActive ? 'active' : 'inactive',
    costPrice: formData.costPrice,
    sellingPrice: formData.sellingPrice,
    vatPercent: formData.vatPercent,
    units: [
      {
        name: 'sp',
        unitBase: 1,
        sellingPrice: formData.sellingPrice,
        isBase: true,
      },
    ],
    attributes: (formData.attributes || [])
      .filter((a) => a.name?.trim() && a.value?.trim())
      .map((a) => ({ name: a.name.trim(), value: a.value.trim() })),
  };
}

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
        console.error(err);
        alert('Đã tạo sản phẩm nhưng tải ảnh thất bại. Có thể thêm ảnh khi chỉnh sửa.');
      }
    }
    navigate(PRODUCT_ROUTES.list);
  };

  return (
    <div className="admin-layout">
      <SideBar />
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
    </div>
  );
}
