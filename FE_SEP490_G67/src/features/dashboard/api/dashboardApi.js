import { api } from '@/lib/api-clien';

export const dashboardApi = {
  /**
   * Tổng quan bán hàng trong khoảng ngày. `totalRevenue` cộng lineTotal của mọi
   * đơn chưa huỷ, không phân biệt hình thức thanh toán — nên đơn nợ được tính
   * doanh thu ngay tại thời điểm bán, không đợi khách trả tiền.
   */
  getSalesSummary: async ({ from, to } = {}) => {
    const response = await api.get('/sales-history/summary', {
      params: {
        from: from || undefined,
        to: to || undefined,
      },
    });
    return response.result;
  },

  /**
   * Doanh thu bán hàng của một ngày, chia theo 24 khung giờ. Backend luôn trả đủ
   * 24 khung (khung không bán được gì thì revenue = 0).
   */
  getHourlyRevenue: async ({ date } = {}) => {
    const response = await api.get('/sales-history/hourly', {
      params: { date: date || undefined },
    });
    return response.result ?? [];
  },

  /**
   * Tiền thực thu trong MỘT ngày, tách theo hình thức thanh toán.
   * Cộng `paidAmount` nên đơn nợ (paidAmount = 0) không lọt vào — khác hẳn
   * `getSalesSummary`, vốn tính doanh thu ngay lúc bán.
   *
   * Lưu ý: endpoint này trả DTO trần, KHÔNG bọc trong ApiResponse như phần còn
   * lại của API, nên ở đây không đọc `.result`.
   */
  getReconciliationSummary: async ({ date } = {}) => {
    return api.get('/reconciliations/summary', {
      params: { date: date || undefined },
    });
  },
};
