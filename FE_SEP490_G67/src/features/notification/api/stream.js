import { env } from '@/config/env';

export const NOTIFICATION_EVENT_CREATED = 'notification.created';
export const NOTIFICATION_EVENT_READ = 'notification.read';

const FIRST_RETRY_MS = 3_000;
const MAX_RETRY_MS = 30_000;

/**
 * Mở kênh thông báo realtime.
 */
export function openNotificationStream({ onCreated, onRead } = {}) {
    const controller = new AbortController();
    let closed = false;
    let retryMs = FIRST_RETRY_MS;
    let retryTimer = null;

    const dispatch = (eventName, rawData) => {
        // Nhịp tim của server là comment SSE nên không bao giờ tới đây
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
        let rest = buffer;
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

    const connect = async () => {
        if (closed) return;
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
            if (!response.ok || !response.body) {
                throw new Error(`Máy chủ trả về ${response.status}`);
            }

            // Nối được thì mới đặt lại nhịp thử: nếu đặt lại trước khi đọc, một endpoint
            // hỏng ngay lập tức sẽ bị thử lại 3 giây một lần mãi mãi.
            retryMs = FIRST_RETRY_MS;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (; ;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer = consumeFrames(buffer + decoder.decode(value, { stream: true }));
            }
        } catch (error) {
            if (closed || controller.signal.aborted) return;
            console.error('Mất kênh thông báo realtime, sẽ thử nối lại:', error);
        }

        if (closed) return;
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    };

    connect();

    return () => {
        closed = true;
        if (retryTimer) clearTimeout(retryTimer);
        controller.abort();
    };
}
