function toTelHref(phoneNumber) {
    const digits = String(phoneNumber).replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
}

export default function SupplierPhoneCell({ phoneNumber, stopRowClick = false }) {
    if (!phoneNumber) {
        return <span className="supplier-phone supplier-phone--empty">—</span>;
    }

    const telHref = toTelHref(phoneNumber);

    const stopIfNeeded = (event) => {
        if (stopRowClick) {
            event.stopPropagation();
        }
    };

    return (
        <span className="supplier-phone" onClick={stopIfNeeded}>
            {telHref ? (
                <a
                    href={telHref}
                    className="supplier-phone__link"
                    onClick={stopIfNeeded}
                    title="Gọi điện"
                    aria-label={`Gọi ${phoneNumber}`}
                >
                    {phoneNumber}
                </a>
            ) : (
                <span className="supplier-phone__text">{phoneNumber}</span>
            )}
        </span>
    );
}
