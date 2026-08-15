package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import java.util.List;

/**
 * Thông báo trong ứng dụng: một bản ghi {@link Notification} (nội dung) fan-out
 * thành nhiều {@link NotificationRecipient} (trạng thái đọc của từng người).
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {

    NotificationRepository notificationRepository;
    NotificationRecipientRepository notificationRecipientRepository;
    UserRepository userRepository;

    /**
     * Gửi thông báo tới toàn bộ admin đang hoạt động. Không có admin nào thì
     * bỏ qua im lặng — thông báo là việc phụ, không được làm hỏng nghiệp vụ gọi nó.
     */
    @Transactional
    public void notifyAdmins(NotificationType type,
                             String title,
                             String message,
                             NotificationReferenceType referenceType,
                             Integer referenceId) {
        List<User> admins = userRepository.findAllActiveAdmins();
        if (admins.isEmpty()) {
            return;
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
        notificationRecipientRepository.saveAll(recipients);
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getInbox(Integer userId, int page, int size) {
        Page<NotificationRecipient> result = notificationRecipientRepository
                .findInboxByUserId(userId, PageRequest.of(Math.max(page - 1, 0), size));

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
    }

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
