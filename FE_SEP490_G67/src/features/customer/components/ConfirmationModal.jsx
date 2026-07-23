import { Modal, Button, Spinner } from 'react-bootstrap';

export default function ConfirmationModal({
  show,
  onHide,
  onConfirm,
  title,
  body,
  confirmButtonText = 'Xác nhận',
  cancelButtonText = 'Hủy',
  confirmButtonVariant = 'danger',
  isConfirming = false,
}) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {body}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isConfirming}>
          {cancelButtonText}
        </Button>
        <Button variant={confirmButtonVariant} onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
              {' '}Đang xử lý...
            </>
          ) : (
            confirmButtonText
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}