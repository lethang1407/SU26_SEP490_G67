import { api } from '@/lib/api-clien';
import { importOrdersApi } from '@/features/import-order/api';
import { getSalesOrderHistory } from '@/features/pos-screen/api';

/** YYYY-MM-DD theo giờ máy (toISOString là giờ UTC nên trước 7h sáng sẽ lùi một ngày). */
export function toLocalDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const dashboardApi = {

  getSalesSummary: async ({ from, to } = {}) => {
    const response = await api.get('/sales-history/summary', {
      params: {
        from: from || undefined,
        to: to || undefined,
      },
    });
    return response.result;
  },

  getHourlyRevenue: async ({ date } = {}) => {
    const response = await api.get('/sales-history/hourly', {
      params: { date: date || undefined },
    });
    return response.result ?? [];
  },


  getReconciliationSummary: async ({ date } = {}) => {
    return api.get('/reconciliations/summary', {
      params: { date: date || undefined },
    });
  },

  /**
   * Hoạt động trong đúng ngày {@code date} (YYYY-MM-DD, giờ máy). Không truyền thì lấy mọi ngày.
   * Chỉ hiện giờ:phút nên không lọc ngày thì đơn hôm qua trông như của hôm nay.
   */
  getRecentActivities: async ({ limit = 8, date } = {}) => {
    // Lấy dư ở nhánh bán hàng vì đơn đã hủy bị loại sau khi nhận về — hủy vài đơn
    // cuối ngày mà chỉ xin đúng `limit` thì bảng sẽ ngắn đi không rõ lý do.
    const [salesResult, importResult] = await Promise.allSettled([
      getSalesOrderHistory({ page: 0, size: limit * 2, dateFrom: date, dateTo: date }),
      // Phiếu nhập lọc theo ngày nhập kho (receivedDate), không theo ngày tạo phiếu tạm.
      importOrdersApi.getImportOrders({
        page: 0,
        size: limit * 2,
        orderStatus: 'IMPORTED',
        fromDate: date || '',
        toDate: date || '',
      }),
    ]);

    // Cả hai nguồn cùng hỏng (hết hạn đăng nhập, BE chết) thì phải báo lỗi. Trả mảng
    // rỗng ở đây là khẳng định "hôm nay không có hoạt động nào" — sai và gây hiểu lầm.
    if (salesResult.status === 'rejected' && importResult.status === 'rejected') {
      throw salesResult.reason;
    }

    const activities = [];

    if (salesResult.status === 'fulfilled') {
      for (const order of salesResult.value?.content ?? []) {
        // Đơn hủy không phải tiền vào, không được đứng chung với đơn bán thật.
        if (order.orderStatus === 'CANCELLED') continue;
        activities.push({
          id: `sale-${order.id}`,
          at: order.createdAt,
          type: order.isDebt ? 'Ghi nợ' : 'Bán hàng',
          partner: order.customerName || 'Khách lẻ',
          user: order.staffName || 'N/A',
          amount: Number(order.totalAmount ?? 0),
          direction: 'in',
          // Đơn nợ vẫn là tiền vào, nhưng chưa thu được nên tô cam để phân biệt.
          tone: order.isDebt ? 'warning' : 'income',
        });
      }
    }

    if (importResult.status === 'fulfilled') {
      for (const order of importResult.value?.content ?? []) {
        activities.push({
          id: `import-${order.id}`,
          // importedAt = lúc bấm hoàn thành phiếu; receivedAt là lúc tạo phiếu tạm (có thể
          // từ hôm trước). receivedDate chỉ có ngày, new Date() hiểu là 07:00 nên để cuối.
          at: order.importedAt ?? order.receivedAt ?? order.receivedDate,
          type: 'Nhập hàng',
          partner: order.supplierName || 'N/A',
          user: order.createdByName || 'N/A',
          amount: Number(order.totalCost ?? 0),
          direction: 'out',
          tone: 'import',
        });
      }
    }

    return activities
      // Chốt lại phía client: chỉ giữ hoạt động có giờ rơi đúng vào ngày đang xem.
      .filter((activity) => !date || toLocalDateKey(activity.at) === date)
      .sort((a, b) => new Date(b.at ?? 0) - new Date(a.at ?? 0))
      .slice(0, limit);
  },
};
