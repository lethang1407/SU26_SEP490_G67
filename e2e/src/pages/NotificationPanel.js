import { expect } from '@playwright/test';

/**
 * Chuông thông báo trên `AdminHeader` — có ở mọi màn hình dùng AdminLayout
 * (KHÔNG có trên màn hình POS, vì POS dùng header riêng).
 *
 * Panel lọc bằng dãy chip; chip đang chọn mang class `notification-chip--active`.
 * Bấm vào một thông báo vừa đánh dấu đã đọc vừa điều hướng sang màn hình liên
 * quan (`notificationRoute.js`), nên ca nào chỉ muốn kiểm đánh dấu đã đọc thì
 * phải tính trước việc trang sẽ đổi.
 */
export class NotificationPanel {
    constructor(page) {
        this.page = page;

        this.bell = page.getByRole('button', { name: 'Thông báo' });
        this.badge = page.locator('.notification-badge');
        this.panel = page.locator('.notification-panel');
        this.header = page.locator('.notification-panel__title');
        this.markAllButton = page.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' });
        this.chips = page.locator('.notification-chip');
        this.items = page.locator('.notification-item');
        this.unreadItems = page.locator('.notification-item--unread');
        this.empty = page.locator('.notification-panel__empty');
        this.loadMore = page.getByRole('button', { name: /Xem thêm|Đang tải/ });
    }

    /**
     * Chờ panel nạp xong.
     *
     * Không chờ chữ "Đang tải..." biến mất: chuỗi đó xuất hiện ở HAI chỗ — ô
     * trạng thái rỗng khi đang tải trang đầu, VÀ nhãn của nút "Xem thêm" khi
     * đang tải trang tiếp. Chờ nó biến mất có thể treo 20 giây vì một nút hoàn
     * toàn bình thường. Chờ thứ thật sự cho biết đã xong: có mục, hoặc có thông
     * điệp rỗng, hoặc có lỗi tải.
     */
    async waitForLoaded() {
        await expect(
            this.items.first().or(this.empty.first()),
        ).toBeVisible({ timeout: 20_000 });
    }

    async open() {
        await this.bell.click();
        await expect(this.panel).toBeVisible();
        await this.waitForLoaded();
    }

    async close() {
        await this.bell.click();
        await expect(this.panel).toBeHidden();
    }

    /** Số trên huy hiệu; 0 khi huy hiệu không hiện. */
    async unreadCount() {
        if (await this.badge.count() === 0) return 0;
        const text = await this.badge.innerText();
        // Huy hiệu hiển thị "99+" khi vượt ngưỡng.
        return Number(text.replace(/[^\d]/g, '')) || 0;
    }

    chip(label) {
        return this.chips.filter({ hasText: new RegExp(`^${label}$`) }).first();
    }

    async applyFilter(label) {
        await this.chip(label).click();
        await expect(this.chip(label)).toHaveClass(/notification-chip--active/);
        await this.waitForLoaded();
    }

    item(text) {
        return this.items.filter({ hasText: text }).first();
    }

    async markAllRead() {
        await this.markAllButton.click();
        await expect(this.markAllButton).toBeHidden({ timeout: 20_000 });
    }
}
