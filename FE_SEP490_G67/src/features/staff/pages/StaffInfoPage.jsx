import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { STAFF_ROUTES } from '../constants';

export default function StaffInfoPage() {
    const { staffId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (staffId) {
            navigate(`${STAFF_ROUTES.list}?detailId=${staffId}`, { replace: true });
        } else {
            navigate(STAFF_ROUTES.list, { replace: true });
        }
    }, [staffId, navigate]);

    return null;
}

