import { env } from '@/config/env';

export const NOTIFICATION_EVENT_CREATED = 'notification.created';
export const NOTIFICATION_EVENT_READ = 'notification.read';

/**
 * Trạng thái của kênh. Chỉ `CLOSED` và `STOPPED` là trạng thái cuối.
 *
 *   CONNECTING → OPEN ──(đứt / im lặng quá lâu)──→ RETRYING → CONNECTING …
 *        │         └──(tab ẩn đủ lâu / pagehide)──→ PAUSED ──(tab hiện lại)──→ CONNECTING
 *        └──(401/403)──→ STOPPED
 *   close() từ bất kỳ trạng thái nào ──→ CLOSED
 */
export const STREAM_STATE = Object.freeze({
    CONNECTING: 'connecting',
    OPEN: 'open',
    RETRYING: 'retrying',
    PAUSED: 'paused',
    STOPPED: 'stopped',
    CLOSED: 'closed',
});

const FIRST_RETRY_MS = 3_000;
const MAX_RETRY_MS = 30_000;

/** Server gửi nhịp tim mỗi 25 giây; im lặng quá mức này là kết nối nửa sống. */
const IDLE_TIMEOUT_MS = 60_000;

/**
 * Tab ẩn quá lâu thì đóng kết nối để server khỏi giữ socket cho tab không ai nhìn.
 * Có độ trễ để việc chuyển tab qua lại không làm nối lại liên tục.
 */
const HIDDEN_GRACE_MS = 60_000;

/** Lý do huỷ một lần nối — đọc lại qua `signal.reason` trong catch. */
const ABORT_PAUSE = 'pause';
const ABORT_CLOSE = 'close';
const ABORT_IDLE = 'idle';

/**
 * Mở kênh thông báo realtime.
 *
 * Dùng `fetch` thay vì `EventSource` để gửi được header Authorization.
 *
 * @param {object} handlers
 * @param {Function} [handlers.onCreated]      có thông báo mới
 * @param {Function} [handlers.onRead]         một thông báo được đọc ở tab khác
 * @param {Function} [handlers.onOpen]         vừa nối (lại) thành công — sự kiện trong
 *                                             lúc mất kết nối đã bị lỡ, nên đồng bộ lại
 * @param {Function} [handlers.onStateChange]  trạng thái đổi (STREAM_STATE)
 * @returns {Function} close() — gọi khi component unmount
 */
export function openNotificationStream({ onCreated, onRead, onOpen, onStateChange } = {}) {
    let state = null;
    let attempt = null;
    let retryMs = FIRST_RETRY_MS;
    let retryTimer = null;
    let idleTimer = null;
    let hiddenTimer = null;

    const setState = (next) => {
        if (state === next) return;
        state = next;
        onStateChange?.(next);
    };

    const isFinal = () => state === STREAM_STATE.CLOSED || state === STREAM_STATE.STOPPED;

    const abortAttempt = (reason) => {
        if (!attempt) return;
        const current = attempt;
        attempt = null;
        current.abort(reason);
    };

    const armIdleWatchdog = (controller) => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            console.warn(`Kênh thông báo im lặng quá ${IDLE_TIMEOUT_MS / 1000} giây, nối lại.`);
            if (attempt === controller) abortAttempt(ABORT_IDLE);
        }, IDLE_TIMEOUT_MS);
    };

    const dispatch = (eventName, rawData) => {
        let payload = null;
        if (rawData) {
            try {
                payload = JSON.parse(rawData);
            } catch (error) {
                console.error('Không đọc được dữ liệu sự kiện thông báo:', error, rawData);
                return;
            }
        }
        if (eventName === NOTIFICATION_EVENT_CREATED) onCreated?.(payload);
        else if (eventName === NOTIFICATION_EVENT_READ) onRead?.(payload);
    };

    /** Tách các khung SSE trong buffer; một khung kết thúc bằng dòng trống. */
    const consumeFrames = (buffer) => {
        let rest = buffer.replace(/\r\n/g, '\n');
        let separator = rest.indexOf('\n\n');
        while (separator !== -1) {
            const frame = rest.slice(0, separator);
            rest = rest.slice(separator + 2);

            let eventName = 'message';
            const dataLines = [];
            for (const line of frame.split('\n')) {
                if (line.startsWith(':')) continue; // comment — nhịp tim
                if (line.startsWith('event:')) eventName = line.slice(6).trim();
                else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
            }
            if (dataLines.length > 0) dispatch(eventName, dataLines.join('\n'));

            separator = rest.indexOf('\n\n');
        }
        return rest;
    };

    const scheduleRetry = () => {
        setState(STREAM_STATE.RETRYING);
        clearTimeout(retryTimer);
        retryTimer = setTimeout(connect, retryMs);
        // Lùi dần để một server đang sập không phải chịu thêm một vòng nối lại mỗi 3 giây.
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    };

    async function connect() {
        if (isFinal()) return;
        if (document.visibilityState === 'hidden') {
            setState(STREAM_STATE.PAUSED);
            return;
        }

        // Không bao giờ để hai lần nối chạy song song cho cùng một kênh.
        abortAttempt(ABORT_CLOSE);
        const controller = new AbortController();
        attempt = controller;
        setState(STREAM_STATE.CONNECTING);

        try {
            const accessToken = localStorage.getItem('accessToken');
            const response = await fetch(`${env.API_URL}/notifications/stream`, {
                headers: {
                    Accept: 'text/event-stream',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                credentials: 'include',
                signal: controller.signal,
            });

            if (response.status === 401 || response.status === 403) {
                // Token hỏng thì nối lại bao nhiêu lần cũng vậy. Dừng hẳn; polling vẫn chạy.
                console.error(`Kênh thông báo bị từ chối (${response.status}), dừng nối lại.`);
                setState(STREAM_STATE.STOPPED);
                return;
            }
            if (!response.ok || !response.body) {
                throw new Error(`Máy chủ trả về ${response.status}`);
            }

            retryMs = FIRST_RETRY_MS;
            setState(STREAM_STATE.OPEN);
            onOpen?.();
            armIdleWatchdog(controller);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                // Mọi byte, kể cả nhịp tim, chứng minh kết nối còn sống.
                armIdleWatchdog(controller);
                buffer = consumeFrames(buffer + decoder.decode(value, { stream: true }));
            }
            // Server đóng luồng (khởi động lại, hết hạn 30 phút): rơi xuống nối lại.
        } catch (error) {
            const reason = controller.signal.reason;
            if (reason === ABORT_PAUSE || reason === ABORT_CLOSE) {
                console.debug('Kênh thông báo được đóng có chủ ý:', reason);
                return;
            }
            if (reason !== ABORT_IDLE) {
                console.error('Mất kênh thông báo realtime, sẽ thử nối lại:', error);
            }
        } finally {
            if (attempt === controller) {
                clearTimeout(idleTimer);
                attempt = null;
            }
        }

        if (isFinal() || state === STREAM_STATE.PAUSED) return;
        scheduleRetry();
    }

    const pause = () => {
        if (isFinal()) return;
        clearTimeout(retryTimer);
        clearTimeout(idleTimer);
        setState(STREAM_STATE.PAUSED);
        abortAttempt(ABORT_PAUSE);
    };

    const resume = () => {
        clearTimeout(hiddenTimer);
        if (state !== STREAM_STATE.PAUSED) return;
        retryMs = FIRST_RETRY_MS;
        connect();
    };

    const handleVisibilityChange = () => {
        if (isFinal()) return;
        if (document.visibilityState === 'hidden') {
            clearTimeout(hiddenTimer);
            hiddenTimer = setTimeout(pause, HIDDEN_GRACE_MS);
        } else {
            resume();
        }
    };

    // Rời trang (hoặc đưa vào bfcache): đóng ngay để server thấy socket đóng sạch.
    const handlePageHide = () => pause();
    const handlePageShow = (event) => {
        if (event.persisted) resume();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    connect();

    return function close() {
        if (state === STREAM_STATE.CLOSED) return;
        setState(STREAM_STATE.CLOSED);
        clearTimeout(retryTimer);
        clearTimeout(idleTimer);
        clearTimeout(hiddenTimer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
        abortAttempt(ABORT_CLOSE);
    };
}
