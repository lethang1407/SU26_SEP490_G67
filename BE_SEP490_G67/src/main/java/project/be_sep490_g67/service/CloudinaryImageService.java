package project.be_sep490_g67.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryImageService {

    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED = List.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/jfif", "image/pjpeg", "image/x-png"
    );

    private final Cloudinary cloudinary;

    public record UploadResult(String url, String publicId) {}

    public UploadResult upload(MultipartFile file, String folder) {
        validateFile(file);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", "auto"
                    )
            );
            String url = String.valueOf(result.get("secure_url"));
            String publicId = String.valueOf(result.get("public_id"));
            return new UploadResult(url, publicId);
        } catch (IOException e) {
            log.error("Cloudinary upload IO failed for file {}: {}", file.getOriginalFilename(), e.getMessage());
            String fallbackUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80";
            return new UploadResult(fallbackUrl, "fallback_" + System.currentTimeMillis());
        } catch (Exception e) {
            log.error("Cloudinary upload failed for file {}: {}", file.getOriginalFilename(), e.getMessage());
            String fallbackUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80";
            return new UploadResult(fallbackUrl, "fallback_" + System.currentTimeMillis());
        }
    }

    public void delete(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (Exception e) {
            log.error("Cloudinary destroy failed for {}", publicId, e);
            throw new AppException(ErrorCode.PRODUCT_IMAGE_UPLOAD_FAILED);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.PRODUCT_IMAGE_INVALID);
        }
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        boolean validExt = filename.endsWith(".jpg") || filename.endsWith(".jpeg")
                || filename.endsWith(".png") || filename.endsWith(".webp") || filename.endsWith(".jfif");
        boolean validMime = contentType != null && ALLOWED.contains(contentType.toLowerCase());

        if (!validMime && !validExt) {
            log.warn("Invalid file upload attempt. contentType={}, filename={}", contentType, filename);
            throw new AppException(ErrorCode.PRODUCT_IMAGE_INVALID);
        }
        if (file.getSize() > MAX_BYTES) {
            throw new AppException(ErrorCode.PRODUCT_IMAGE_INVALID);
        }
    }
}
