package project.be_sep490_g67.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import project.be_sep490_g67.config.FileStorageProperties;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private final FileStorageProperties fileStorageProperties;

    public String storeProductImage(MultipartFile file) {
        validateImageFile(file);

        String extension = resolveExtension(file);
        String filename = UUID.randomUUID() + extension;
        Path productDir = resolveProductDir();

        try {
            Files.createDirectories(productDir);
            Path target = productDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/products/" + filename;
        } catch (IOException exception) {
            throw new AppException(ErrorCode.IMAGE_UPLOAD_FAILED);
        }
    }

    public void deleteStoredFile(String publicPath) {
        if (!StringUtils.hasText(publicPath) || !publicPath.startsWith("/uploads/products/")) {
            return;
        }

        String filename = publicPath.substring("/uploads/products/".length());
        Path filePath = resolveProductDir().resolve(filename).normalize();

        if (!filePath.startsWith(resolveProductDir())) {
            return;
        }

        try {
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
            // Best effort cleanup for replaced images.
        }
    }

    public void validateProductImagePath(String publicPath) {
        if (!StringUtils.hasText(publicPath)) {
            return;
        }

        if (!publicPath.startsWith("/uploads/products/")) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException(ErrorCode.IMAGE_FILE_TOO_LARGE);
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }

        String extension = resolveExtension(file);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE);
        }
    }

    private String resolveExtension(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        if (!StringUtils.hasText(originalName) || !originalName.contains(".")) {
            return ".jpg";
        }

        return originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
    }

    private Path resolveProductDir() {
        return Paths.get(fileStorageProperties.getDir(), "products")
                .toAbsolutePath()
                .normalize();
    }
}
