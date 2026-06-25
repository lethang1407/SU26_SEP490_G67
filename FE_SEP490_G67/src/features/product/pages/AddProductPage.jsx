import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductCreateForm from '../components/ProductCreateForm';
import { buildCreatePayload, createProduct } from '../api';
import { ADD_PRODUCT_FORM_ID, PRODUCT_ROUTES } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

export default function AddProductPage() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleCancel = () => {
        navigate(PRODUCT_ROUTES.list);
    };

    const handleSubmit = async (formData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            await createProduct(buildCreatePayload(formData));
            navigate(PRODUCT_ROUTES.list);
        } catch (submitError) {
            setError(getApiErrorMessage(submitError, 'Không thể tạo sản phẩm. Vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container product-page product-create-page">
                        <nav className="product-breadcrumb" aria-label="Breadcrumb">
                            <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                                Sản phẩm
                            </Link>
                            <span className="product-breadcrumb__sep">&gt;</span>
                            <Link to={PRODUCT_ROUTES.list} className="product-breadcrumb__link">
                                Danh sách sản phẩm
                            </Link>
                            <span className="product-breadcrumb__sep">&gt;</span>
                            <span className="product-breadcrumb__current">Thêm sản phẩm mới</span>
                        </nav>

                        <div className="product-create-page-header">
                            <h1 className="product-create-page-header__title">Thêm sản phẩm mới</h1>
                            <div className="product-create-page-header__actions">
                                <button
                                    type="button"
                                    className="product-btn product-btn--secondary"
                                    onClick={handleCancel}
                                    disabled={isSubmitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    form={ADD_PRODUCT_FORM_ID}
                                    className="product-btn product-btn--primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <Alert variant="danger" onClose={() => setError(null)} dismissible>
                                {error}
                            </Alert>
                        )}

                        <ProductCreateForm
                            formId={ADD_PRODUCT_FORM_ID}
                            isSubmitting={isSubmitting}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}
