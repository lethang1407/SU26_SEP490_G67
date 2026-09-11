package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import project.be_sep490_g67.service.NotificationAlertService.ScanResult;

import java.util.function.Supplier;

/**
 * Lịch chạy của ba job cảnh báo.
 */
@Component
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationScheduler {

    static final String STORE_ZONE = "Asia/Ho_Chi_Minh";

    NotificationAlertService notificationAlertService;

    /**
     * hàng đã quá hạn còn trên kệ.
     */
    @Scheduled(cron = "0 0 7 * * *", zone = STORE_ZONE)
    public void scanExpired() {
        run("EXPIRED", notificationAlertService::scanExpired);
    }

    /**
     * hàng sắp hết hạn.
     */
    @Scheduled(cron = "0 5 7 * * *", zone = STORE_ZONE)
    public void scanNearExpiry() {
        run("NEAR_EXPIRED", notificationAlertService::scanNearExpiry);
    }

    /**
     * tồn dưới định mức tối thiểu.
     */
    @Scheduled(cron = "0 10 7 * * *", zone = STORE_ZONE)
    public void scanLowStock() {
        run("LOW_STOCK", notificationAlertService::scanLowStock);
    }

    /**
     * công nợ khách hàng quá hạn.
     */
    @Scheduled(cron = "0 15 7 * * *", zone = STORE_ZONE)
    public void scanOverdueDebt() {
        run("OVERDUE_DEBT", notificationAlertService::scanOverdueDebt);
    }

    private void run(String jobName, Supplier<ScanResult> scan) {
        try {
            ScanResult result = scan.get();
            if (result.sent()) {
                log.info("Quét {}: {} đối tượng, đã gửi thông báo", jobName, result.matched());
            } else {
                log.info("Quét {}: {} đối tượng, không gửi (không có gì hoặc hôm nay đã gửi)",
                        jobName, result.matched());
            }
        } catch (Exception exception) {
            log.error("Quét {} thất bại", jobName, exception);
        }
    }
}
