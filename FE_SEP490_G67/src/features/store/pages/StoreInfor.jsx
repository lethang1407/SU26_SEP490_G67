import { useState, useEffect } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import Header from '../../../components/ui/header-footer/Header';
import { getStoreInfor } from '../api';
import StoreForm from '../components/StoreForm';

function StoreInfo() {
    const [storeData, setStoreData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        setIsLoading(true);
        getStoreInfor()
            .then((data) => {
                setStoreData(data);
            })
            .catch((error) => {
                setError('Không thể tải thông tin cửa hàng. Vui lòng thử lại.');
                console.error('Lỗi khi lấy dữ liệu cửa hàng:', error);
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleUpdateSuccess = (updatedData, message) => {
        setStoreData(updatedData);
        setSuccessMessage(message || 'N/A');
    };

    return (
        <div className="admin-content">
            
                <Header />
                <main className="admin-main">
                    <div className="dashboard-container">
                        {successMessage && (
                            <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
                                {successMessage}
                            </Alert>
                        )}
                        {isLoading ? (
                            <div className="text-center p-5">
                                <Spinner animation="border" role="status">
                                    <span className="visually-hidden">Đang tải...</span>
                                </Spinner>
                            </div>
                        ) : error ? (
                            <Alert variant="danger">{error}</Alert>
                        ) : (
                            storeData && <StoreForm initialData={storeData} onUpdateSuccess={handleUpdateSuccess} />
                        )}
                    </div>
                </main>
            </div>
    );
}

export default StoreInfo;