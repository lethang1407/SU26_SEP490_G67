package project.be_sep490_g67.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import project.be_sep490_g67.entity.DocumentSequence;
import project.be_sep490_g67.enums.DocumentType;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.DocumentSequenceRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentCodeService {

    static final ZoneId STORE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    static final DateTimeFormatter DATE_PART = DateTimeFormatter.ofPattern("yyMMdd");

    DocumentSequenceRepository documentSequenceRepository;
    StoreConfigRepository storeConfigRepository;


    @Transactional(propagation = Propagation.MANDATORY)
    public String generate(DocumentType type) {
        return generate(currentStoreId(), type, LocalDate.now(STORE_ZONE));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String generate(Integer storeId, DocumentType type, LocalDate date) {
        int next = nextCounter(storeId, type, date);

        return String.format("%s-%02d-%s-%04d",
                type.getPrefix(),
                storeId,
                DATE_PART.format(date),
                next);
    }

    private int nextCounter(Integer storeId, DocumentType type, LocalDate date) {
        String docType = type.name();

        DocumentSequence slot = documentSequenceRepository
                .lockSlot(storeId, docType, date)
                .orElseGet(() -> {
                    documentSequenceRepository.insertSlotIfAbsent(storeId, docType, date);
                    return documentSequenceRepository
                            .lockSlot(storeId, docType, date)
                            .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_CODE_GENERATION_FAILED));
                });

        int next = slot.getCounter() + 1;
        slot.setCounter(next);
        documentSequenceRepository.save(slot);
        return next;
    }

    private Integer currentStoreId() {
        return storeConfigRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new AppException(ErrorCode.STORE_CONFIG_MISSING))
                .getId();
    }
}
