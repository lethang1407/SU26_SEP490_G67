package project.be_sep490_g67.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@Slf4j
public class PayosRateLimitService {

    private final double permitsPerSecond;
    private final double burst;
    private double available;
    private long lastRefillNanos;

    public PayosRateLimitService(
            @Value("${payos.rate-limit.permits-per-second:5}") double permitsPerSecond,
            @Value("${payos.rate-limit.burst:10}") double burst) {
        this.permitsPerSecond = permitsPerSecond > 0 ? permitsPerSecond : 5;
        this.burst = burst > 0 ? burst : 10;
        this.available = this.burst;
        this.lastRefillNanos = System.nanoTime();
    }

    public boolean tryAcquire() {
        return acquire(Duration.ZERO);
    }

    // return {@code false} nếu phải chờ lâu hơn {@code maxWait}
    public boolean acquire(Duration maxWait) {
        long sleepNanos;

        synchronized (this) {
            refill();

            if (available >= 1) {
                available -= 1;
                return true;
            }

            double deficit = 1 - available;
            sleepNanos = (long) (deficit / permitsPerSecond * 1_000_000_000L);
            if (sleepNanos > maxWait.toNanos()) {
                return false;
            }
            available -= 1;
        }

        // Ngủ NGOÀI khối đồng bộ, nếu không thì chính người đang chờ lại chặn người
        // khác đọc số dư.
        try {
            Thread.sleep(sleepNanos / 1_000_000L, (int) (sleepNanos % 1_000_000L));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
        return true;
    }

    public synchronized void penalize(Duration coolDown) {
        refill();
        double debt = -permitsPerSecond * coolDown.toMillis() / 1000.0;
        if (debt < available) {
            available = debt;
        }
        log.warn("PayOS trả 429 — tạm dừng gọi ra trong {}ms", coolDown.toMillis());
    }

    /**
     * Số suất còn lại; âm nghĩa là đang có người xếp hàng. Dùng cho log và test.
     */
    public synchronized double availablePermits() {
        refill();
        return available;
    }

    private void refill() {
        long now = System.nanoTime();
        double elapsedSeconds = (now - lastRefillNanos) / 1_000_000_000.0;
        lastRefillNanos = now;
        available = Math.min(burst, available + elapsedSeconds * permitsPerSecond);
    }
}
