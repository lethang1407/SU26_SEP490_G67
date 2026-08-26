/**
 * Mã BIN của các ngân hàng VietQR hỗ trợ, dùng cho ô chọn ngân hàng.
 *
 * <p>Danh sách nằm cứng trong mã nguồn thay vì gọi API danh mục của VietQR: mã BIN do NAPAS cấp
 */
export const VIETQR_BANKS = [
    {bin: '970415', name: 'VietinBank'},
    {bin: '970436', name: 'Vietcombank'},
    {bin: '970418', name: 'BIDV'},
    {bin: '970405', name: 'Agribank'},
    {bin: '970422', name: 'MB Bank'},
    {bin: '970407', name: 'Techcombank'},
    {bin: '970416', name: 'ACB'},
    {bin: '970432', name: 'VPBank'},
    {bin: '970423', name: 'TPBank'},
    {bin: '970403', name: 'Sacombank'},
    {bin: '970437', name: 'HDBank'},
    {bin: '970441', name: 'VIB'},
    {bin: '970443', name: 'SHB'},
    {bin: '970431', name: 'Eximbank'},
    {bin: '970426', name: 'MSB'},
    {bin: '970448', name: 'OCB'},
    {bin: '970429', name: 'SCB'},
    {bin: '970419', name: 'NCB'},
    {bin: '970409', name: 'BacABank'},
    {bin: '970412', name: 'PVcomBank'},
    {bin: '970427', name: 'VietABank'},
    {bin: '970440', name: 'SeABank'},
    {bin: '970425', name: 'ABBANK'},
    {bin: '970449', name: 'LPBank'},
    {bin: '970452', name: 'KienlongBank'},
    {bin: '970400', name: 'SaigonBank'},
];

/** Tên ngân hàng theo mã BIN, hoặc null nếu mã không nằm trong danh sách trên. */
export function bankNameOf(bin) {
    return VIETQR_BANKS.find((bank) => bank.bin === bin)?.name ?? null;
}
