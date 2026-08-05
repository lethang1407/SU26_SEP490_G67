package project.be_sep490_g67.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import project.be_sep490_g67.entity.DocumentSequence;
import project.be_sep490_g67.entity.StoreConfig;
import project.be_sep490_g67.enums.DocumentType;
import project.be_sep490_g67.exception.AppException;
import project.be_sep490_g67.exception.ErrorCode;
import project.be_sep490_g67.repository.DocumentSequenceRepository;
import project.be_sep490_g67.repository.StoreConfigRepository;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentCodeServiceTest {

    private static final LocalDate DATE = LocalDate.of(2026, 8, 3);

    @Mock
    private DocumentSequenceRepository documentSequenceRepository;

    @Mock
    private StoreConfigRepository storeConfigRepository;

    @InjectMocks
    private DocumentCodeService documentCodeService;

    private DocumentSequence slot(int counter) {
        DocumentSequence sequence = new DocumentSequence();
        sequence.setId(1);
        sequence.setStoreId(1);
        sequence.setDocType(DocumentType.SALE_INVOICE.name());
        sequence.setSeqDate(DATE);
        sequence.setCounter(counter);
        return sequence;
    }

    // -------------------------------------------------------------------------
    // 1. Code format
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Formats the code as {PREFIX}-{STORE}-{yyMMdd}-{SEQ}")
    void generate_formatsCode() {
        when(documentSequenceRepository.lockSlot(1, "SALE_INVOICE", DATE))
                .thenReturn(Optional.of(slot(41)));

        String code = documentCodeService.generate(1, DocumentType.SALE_INVOICE, DATE);

        assertThat(code).isEqualTo("HD-01-260803-0042");
    }

    @Test
    @DisplayName("Each document type carries its own prefix")
    void generate_usesTypePrefix() {
        when(documentSequenceRepository.lockSlot(eq(1), anyString(), eq(DATE)))
                .thenReturn(Optional.of(slot(6)));

        assertThat(documentCodeService.generate(1, DocumentType.CREDIT_NOTE, DATE))
                .startsWith("HDT-01-260803-");
        assertThat(documentCodeService.generate(1, DocumentType.EXCHANGE_INVOICE, DATE))
                .startsWith("HDD-01-260803-");
        assertThat(documentCodeService.generate(1, DocumentType.RECONSTRUCTED_INVOICE, DATE))
                .startsWith("HDR-01-260803-");
    }

    @Test
    @DisplayName("Sequence number is zero-padded to four digits")
    void generate_padsSequence() {
        when(documentSequenceRepository.lockSlot(1, "SALE_INVOICE", DATE))
                .thenReturn(Optional.of(slot(0)));

        assertThat(documentCodeService.generate(1, DocumentType.SALE_INVOICE, DATE))
                .isEqualTo("HD-01-260803-0001");
    }

    // -------------------------------------------------------------------------
    // 2. Counter behaviour
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Increments and persists the counter it consumed")
    void generate_incrementsCounter() {
        DocumentSequence sequence = slot(7);
        when(documentSequenceRepository.lockSlot(1, "SALE_INVOICE", DATE))
                .thenReturn(Optional.of(sequence));

        documentCodeService.generate(1, DocumentType.SALE_INVOICE, DATE);

        assertThat(sequence.getCounter()).isEqualTo(8);
        verify(documentSequenceRepository).save(sequence);
    }

    // -------------------------------------------------------------------------
    // 3. First document of the day
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Creates the slot then locks it when none exists yet")
    void generate_createsSlotOnFirstUse() {
        when(documentSequenceRepository.lockSlot(1, "SALE_INVOICE", DATE))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(slot(0)));

        String code = documentCodeService.generate(1, DocumentType.SALE_INVOICE, DATE);

        assertThat(code).isEqualTo("HD-01-260803-0001");

        // The insert must land BEFORE the second lock, otherwise there is
        // nothing to lock and concurrent tills would both try to insert.
        InOrder inOrder = inOrder(documentSequenceRepository);
        inOrder.verify(documentSequenceRepository).lockSlot(1, "SALE_INVOICE", DATE);
        inOrder.verify(documentSequenceRepository).insertSlotIfAbsent(1, "SALE_INVOICE", DATE);
        inOrder.verify(documentSequenceRepository).lockSlot(1, "SALE_INVOICE", DATE);
    }

    @Test
    @DisplayName("Fails loudly if the slot is still missing after the insert")
    void generate_throwsWhenSlotCannotBeCreated() {
        when(documentSequenceRepository.lockSlot(1, "SALE_INVOICE", DATE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentCodeService.generate(1, DocumentType.SALE_INVOICE, DATE))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DOCUMENT_CODE_GENERATION_FAILED);

        verify(documentSequenceRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // 4. Store resolution
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Takes the store segment from the single store_config row")
    void generate_usesStoreConfigId() {
        StoreConfig store = new StoreConfig();
        store.setId(1);
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(store));
        when(documentSequenceRepository.lockSlot(eq(1), eq("SALE_INVOICE"), any(LocalDate.class)))
                .thenReturn(Optional.of(slot(0)));

        assertThat(documentCodeService.generate(DocumentType.SALE_INVOICE))
                .matches("HD-01-\\d{6}-0001");
    }

    @Test
    @DisplayName("Throws when there is no store config to take the store id from")
    void generate_throwsWhenStoreConfigMissing() {
        when(storeConfigRepository.findFirstByOrderByIdAsc()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> documentCodeService.generate(DocumentType.SALE_INVOICE))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.STORE_CONFIG_MISSING);
    }
}
