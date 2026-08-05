const STORAGE_KEY = 'import-return-history-v1';

const SEED_RETURNS = [
    {
        id: 1,
        returnCode: 'TH-9021',
        supplierName: 'Công ty TNHH Nam Ngư',
        totalRefund: 450000,
        totalQuantity: 24,
        itemCount: 2,
        note: 'Hàng gần HSD',
        createdAt: '2026-07-20T09:15:00',
    },
    {
        id: 2,
        returnCode: 'TH-9022',
        supplierName: 'Vinamilk Distributor',
        totalRefund: 1280000,
        totalQuantity: 48,
        itemCount: 3,
        note: 'Bao bì lỗi',
        createdAt: '2026-07-18T14:40:00',
    },
    {
        id: 3,
        returnCode: 'TH-9023',
        supplierName: 'Acecook Việt Nam',
        totalRefund: 320000,
        totalQuantity: 10,
        itemCount: 1,
        note: '',
        createdAt: '2026-07-15T11:05:00',
    },
];

function readLocalHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [...SEED_RETURNS];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [...SEED_RETURNS];
    } catch {
        return [...SEED_RETURNS];
    }
}

function writeLocalHistory(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** FE mock — chưa nối BE */
export async function fetchImportReturns({ search = '', page = 0, size = 20 } = {}) {
    const all = readLocalHistory();
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
        ? all.filter(
              (item) =>
                  item.returnCode?.toLowerCase().includes(keyword) ||
                  item.supplierName?.toLowerCase().includes(keyword) ||
                  item.note?.toLowerCase().includes(keyword),
          )
        : all;

    const sorted = [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const start = page * size;
    const content = sorted.slice(start, start + size);

    return {
        content,
        page,
        size,
        totalElements: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / size) || 1),
    };
}

/** FE mock — chưa nối BE */
export async function createImportReturn(payload) {
    const history = readLocalHistory();
    const nextId = history.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const created = {
        id: nextId,
        returnCode: `TH-${9000 + nextId}`,
        supplierName: payload.supplierName || 'Nhà cung cấp',
        totalRefund: (payload.items ?? []).reduce(
            (sum, item) => sum + Number(item.quantity || 0) * Number(item.returnPrice || 0),
            0,
        ),
        totalQuantity: (payload.items ?? []).reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0,
        ),
        itemCount: payload.items?.length ?? 0,
        note: payload.note || '',
        createdAt: new Date().toISOString(),
    };
    writeLocalHistory([created, ...history]);
    return created;
}
