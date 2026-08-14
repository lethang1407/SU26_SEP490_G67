import { Navigate, useParams } from 'react-router-dom';

export default function ExchangeOrderRedirect() {
    const { orderId } = useParams();
    return <Navigate to={`/admin/pos?return=${orderId}`} replace />;
}
