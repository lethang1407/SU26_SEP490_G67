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

    @Transactional(propagation = Propagation.MANDATORY)
    public String generate(DocumentType type) {
        return generate(type, LocalDate.now(STORE_ZONE));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String generate(DocumentType type, LocalDate date) {
        int next = nextCounter(type, date);

        return String.format("%s-%s-%04d",
                type.getPrefix(),
                DATE_PART.format(date),
                next);
    }

    private int nextCounter(DocumentType type, LocalDate date) {
        String docType = type.name();

        DocumentSequence slot = documentSequenceRepository
                .lockSlot(docType, date)
                .orElseGet(() -> {
                    documentSequenceRepository.insertSlotIfAbsent(docType, date);
                    return documentSequenceRepository
                            .lockSlot(docType, date)
                            .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_CODE_GENERATION_FAILED));
                });

        int next = slot.getCounter() + 1;
        slot.setCounter(next);
        documentSequenceRepository.save(slot);
        return next;
    }
}
