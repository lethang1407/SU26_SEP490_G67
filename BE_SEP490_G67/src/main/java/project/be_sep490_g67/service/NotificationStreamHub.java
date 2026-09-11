package project.be_sep490_g67.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Kênh đẩy realtime cho chuông thông báo (Sheet 8).
 *
 * <p>Giữ các kết nối SSE đang mở, theo từng người dùng, để khi có thông báo mới thì
 * chuông sáng lên ngay thay vì chờ vòng polling 60 giây kế tiếp.
 */
@Component
@Slf4j
public class NotificationStreamHub {

    /** Sự kiện có thông báo mới — FE tăng badge và chèn dòng vào panel. */
    public static final String EVENT_CREATED = "notification.created";

    public static final String EVENT_READ = "notification.read";

    public static final long TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    public static final long HEARTBEAT_MS = 25_000L;

    private final Map<Integer, Collection<SseEmitter>> connections = new ConcurrentHashMap<>();

    /**
     * Mở một kết nối mới cho người dùng.
     */
    public SseEmitter subscribe(Integer userId) {
        return register(userId, new SseEmitter(TIMEOUT_MS));
    }

    public SseEmitter register(Integer userId, SseEmitter emitter) {
        connections.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);

        // Cả ba callback đều phải dọn: thiếu một cái là rò rỉ bộ nhớ chậm, mỗi ngày
        // một ít, và chỉ lộ ra sau nhiều tuần chạy.
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(throwable -> remove(userId, emitter));
        return emitter;
    }

    /**
     * Đẩy một thông báo mới tới mọi tab của một người.
     */
    public void push(Integer userId, Object payload) {
        send(userId, SseEmitter.event().name(EVENT_CREATED).data(payload));
    }

    /**
     * Đẩy tin "dòng thông báo này đã được đọc" để các tab còn lại đồng bộ badge.
     */
    public void pushRead(Integer userId, Integer recipientId) {
        send(userId, SseEmitter.event().name(EVENT_READ).data(Map.of("recipientId", recipientId)));
    }

    /**
     * Nhịp tim giữ kết nối sống.
     */
    @Scheduled(fixedRate = HEARTBEAT_MS)
    public void heartbeat() {
        connections.forEach((userId, emitters) ->
                deliver(userId, emitters, SseEmitter.event().comment("ping")));
    }

    /** Số kết nối đang mở của một người — dùng cho test và cho log vận hành. */
    public int connectionCount(Integer userId) {
        Collection<SseEmitter> emitters = connections.get(userId);
        return emitters == null ? 0 : emitters.size();
    }

    private void send(Integer userId, SseEmitter.SseEventBuilder event) {
        Collection<SseEmitter> emitters = connections.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        deliver(userId, emitters, event);
    }

    private void deliver(Integer userId, Collection<SseEmitter> emitters, SseEmitter.SseEventBuilder event) {
        for (SseEmitter emitter : List.copyOf(emitters)) {
            try {
                emitter.send(event);
            } catch (IOException | RuntimeException exception) {
                // Kết nối chết chỉ lộ ra lúc ghi.
                log.warn("Gỡ kết nối thông báo hỏng của người dùng {}: {}",
                        userId, exception.getMessage());
                remove(userId, emitter);
            }
        }
    }

    private void remove(Integer userId, SseEmitter emitter) {
        connections.computeIfPresent(userId, (key, emitters) -> {
            emitters.remove(emitter);
            // Trả về null để xoá hẳn khoá: giữ lại danh sách rỗng thì map phình theo
            // tổng số người từng đăng nhập, không bao giờ co lại.
            return emitters.isEmpty() ? null : emitters;
        });
    }
}
