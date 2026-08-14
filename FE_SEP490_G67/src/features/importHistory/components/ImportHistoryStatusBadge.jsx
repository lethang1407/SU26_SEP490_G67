import { IMPORT_STATUS_META } from '../constants';

export default function ImportHistoryStatusBadge({ status }) {
  const meta = IMPORT_STATUS_META[status] || {
    label: status || '—',
    className: 'pending',
  };

  return (
    <span className={`ih-status ih-status--${meta.className}`}>{meta.label}</span>
  );
}
