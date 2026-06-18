import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductEditForm from '../components/ProductEditForm';
import { MOCK_PRODUCTS } from '../api/productMockData';
import { getProductEditById } from '../api/mockProductDetails';
import { EDIT_PRODUCT_FORM_ID, PRODUCT_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

export default function EditProductPage() {
    const { productId } = useParams();
    const navigate = useNavigate();

    const product = useMemo(
        () => getProductEditById(productId, MOCK_PRODUCTS),
        [productId],
    );

    const handleBack = () => {
        navigate(PRODUCT_ROUTES.detail(productId));
    };

    const handleSubmit = (formData) => {
        // TODO: gọi API cập nhật sản phẩm
        console.log('Update product:', { productId, ...formData });
        navigate(PRODUCT_ROUTES.detail(productId));
    };

    if (!product) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container product-page">
                            <div className="product-table-card product-table-card--empty">
                                <p>Không tìm thấy sản phẩm.</p>
                                <Link to={PRODUCT_ROUTES.list} className="product-detail-back-link">
                                    Quay lại danh sách
                                </Link>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container product-page product-edit-page">
                        <nav className="product-breadcrumb" aria-label="Breadcrumb">
                            <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                                Sản phẩm
                            </Link>
                            <span className="product-breadcrumb__sep">&gt;</span>
                            <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                                Danh sách sản phẩm
                            </Link>
                            <span className="product-breadcrumb__sep">&gt;</span>
                            <span className="product-breadcrumb__current">Chỉnh sửa sản phẩm</span>
                        </nav>

                        <div className="product-create-page-header">
                            <h1 className="product-create-page-header__title">
                                Chỉnh sửa sản phẩm: {product.name}
                            </h1>
                            <div className="product-create-page-header__actions">
                                <button
                                    type="button"
                                    className="product-btn product-btn--secondary"
                                    onClick={handleBack}
                                >
                                    Quay lại
                                </button>
                                <button
                                    type="submit"
                                    form={EDIT_PRODUCT_FORM_ID}
                                    className="product-btn product-btn--primary"
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>

                        <ProductEditForm
                            key={productId}
                            formId={EDIT_PRODUCT_FORM_ID}
                            product={product}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
