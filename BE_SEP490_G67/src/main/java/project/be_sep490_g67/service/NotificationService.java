package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import project.be_sep490_g67.dto.request.NotificationFilterRequest;
import project.be_sep490_g67.dto.response.NotificationResponse;
import project.be_sep490_g67.dto.response.PageResponse;
import project.be_sep490_g67.entity.Notification;
import project.be_sep490_g67.entity.NotificationRecipient;
import project.be_sep490_g67.entity.User;
import project.be_sep490_g67.enums.NotificationReferenceType;
import project.be_sep490_g67.enums.NotificationType;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.NotificationRecipientRepository;
import project.be_sep490_g67.repository.NotificationRepository;
import project.be_sep490_g67.repository.UserRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Thông báo trong ứng dụng: một bản ghi {@link Notification} (nội dung) fan-out
 * thành nhiều {@link NotificationRecipient} (trạng thái đọc của từng người).
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {

    /** Khoảng ngày do người dùng chọn được hiểu theo giờ cửa hàng, không phải UTC. */
    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Chỗ giữ chân cho tham số IN khi không lọc theo loại — xem searchInboxByUserId. */
    static final List<String> TYPES_PLACEHOLDER = List.of("");

    NotificationRepository notificationRepository;
    NotificationRecipientRepository notificationRecipientRepository;
    UserRepository userRepository;
    NotificationStreamHub streamHub;

    /**
     * Gửi thông báo tới admin
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyAdmins(NotificationType type,
                             String title,
                             String message,
                             NotificationReferenceType referenceType,
                             Integer referenceId) {
        publish(type, title, message, referenceType, referenceId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean notifyAdminsOnceToday(NotificationType type, String title, String message) {
        Instant startOfToday = LocalDate.now(STORE_ZONE).atStartOfDay(STORE_ZONE).toInstant();
        if (notificationRepository.existsByTypeSince(type.name(), startOfToday)) {
            return false;
        }
        return publish(type, title, message, null, null);
    }

    /** @return true nếu đã ghi được thông báo; false khi cửa hàng không có admin nào */
    private boolean publish(NotificationType type,
                            String title,
                            String message,
                            NotificationReferenceType referenceType,
                            Integer referenceId) {
        List<User> admins = userRepository.findAllActiveAdmins();
        if (admins.isEmpty()) {
            return false;
        }

        Instant now = Instant.now();

        Notification notification = new Notification();
        notification.setNotificationType(type.name());
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setReferenceType(referenceType != null ? referenceType.name() : null);
        notification.setReferenceId(referenceId);
        notification.setCreatedAt(now);
        notification.setUpdatedAt(now);
        Notification saved = notificationRepository.save(notification);

        List<NotificationRecipient> recipients = admins.stream().map(admin -> {
            NotificationRecipient recipient = new NotificationRecipient();
            recipient.setNotification(saved);
            recipient.setUser(admin);
            recipient.setIsRead(false);
            recipient.setCreatedAt(now);
            recipient.setUpdatedAt(now);
            return recipient;
        }).toList();
        List<NotificationRecipient> savedRecipients = notificationRecipientRepository.saveAll(recipients);

        // Đẩy realtime sau khi commit, không phải ngay tại đây: nếu transaction rollback
        // sau đó thì chuông đã kêu về một thông báo không tồn tại trong DB, và người dùng
        // bấm vào sẽ thấy hộp thư trống — mất niềm tin nặng hơn là chậm vài giây.
        afterCommit(() -> savedRecipients.forEach(recipient ->
                streamHub.push(recipient.getUser().getId(), toResponse(recipient))));
        return true;
    }

    /**
     * Chạy {@code action} sau khi transaction hiện tại commit; nếu không có transaction nào
     * đang mở thì chạy ngay.
     */
    private void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getInbox(Integer userId, int page, int size) {
        Page<NotificationRecipient> result = notificationRecipientRepository
                .findInboxByUserId(userId, PageRequest.of(Math.max(page - 1, 0), size));
        return toPageResponse(result);
    }

    /**
     * Hộp thư có bộ lọc.
     */
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getInbox(Integer userId,
                                                       NotificationFilterRequest filter,
                                                       int page,
                                                       int size) {
        NotificationFilterRequest applied = filter == null ? NotificationFilterRequest.empty() : filter;

        List<String> types = validateTypes(applied.getTypes());
        Instant from = startOfDay(applied.getFrom());
        Instant to = endOfDay(applied.getTo());
        if (from != null && to != null && from.isAfter(to)) {
            throw new AppException(ErrorCode.INVALID_DATE_RANGE);
        }

        boolean byType = applied.hasTypes();
        boolean byRead = applied.getIsRead() != null;

        Page<NotificationRecipient> result = notificationRecipientRepository.searchInboxByUserId(
                userId,
                byType,
                // Cờ tắt thì giá trị này không được dùng tới, nhưng IN () rỗng là SQL sai
                // nên vẫn phải truyền một danh sách khác rỗng.
                byType ? types : TYPES_PLACEHOLDER,
                byRead,
                byRead && Boolean.TRUE.equals(applied.getIsRead()),
                from,
                to,
                PageRequest.of(Math.max(page - 1, 0), size));

        return toPageResponse(result);
    }

    private List<String> validateTypes(List<String> rawTypes) {
        if (rawTypes == null || rawTypes.isEmpty()) {
            return List.of();
        }
        return rawTypes.stream().map(raw -> {
            if (raw == null || raw.isBlank()) {
                throw new AppException(ErrorCode.INVALID_NOTIFICATION_TYPE);
            }
            try {
                return NotificationType.valueOf(raw.trim().toUpperCase()).name();
            } catch (IllegalArgumentException exception) {
                throw new AppException(ErrorCode.INVALID_NOTIFICATION_TYPE);
            }
        }).toList();
    }

    private Instant startOfDay(LocalDate date) {
        return date == null ? null : date.atStartOfDay(STORE_ZONE).toInstant();
    }

    private Instant endOfDay(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay(STORE_ZONE).toInstant().minusMillis(1);
    }

    private PageResponse<NotificationResponse> toPageResponse(Page<NotificationRecipient> result) {
        return PageResponse.<NotificationResponse>builder()
                .content(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber() + 1)
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public long countUnread(Integer userId) {
        return notificationRecipientRepository.countUnreadByUserId(userId);
    }

    @Transactional
    public void markAsRead(Integer recipientId, Integer userId) {
        NotificationRecipient recipient = notificationRecipientRepository
                .findByIdAndUserId(recipientId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        recipient.setIsRead(true);
        notificationRecipientRepository.save(recipient);
        afterCommit(() -> streamHub.pushRead(userId, recipientId));
    }

    /**
     * Không đẩy SSE ở đây: câu lệnh là một update hàng loạt nên không biết id của những
     * dòng vừa đổi, mà đẩy đúng thì phải truy vấn thêm chỉ để làm mượt giao diện. Tab bấm
     * nút đã tự cập nhật; các tab khác khớp lại ở vòng polling kế tiếp.
     */
    @Transactional
    public void markAllAsRead(Integer userId) {
        notificationRecipientRepository.markAllReadByUserId(userId);
    }

    private NotificationResponse toResponse(NotificationRecipient recipient) {
        Notification notification = recipient.getNotification();
        return NotificationResponse.builder()
                .id(recipient.getId())
                .notificationType(notification.getNotificationType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .referenceType(notification.getReferenceType())
                .referenceId(notification.getReferenceId())
                .isRead(Boolean.TRUE.equals(recipient.getIsRead()))
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
