import './CustomDialog.css'

type CustomDialogProps = {
  title: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function CustomDialog({
  title,
  message,
  type,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  showCancel = false,
  onConfirm,
  onCancel,
}: CustomDialogProps) {
  const icons = {
    success: '✓',
    warning: '!',
    error: '×',
    info: 'i',
  }

  return (
    <div className="custom-dialog-overlay">
      <div className="custom-dialog">
        <div className={`custom-dialog-icon ${type}`}>
          {icons[type]}
        </div>

        <h2>{title}</h2>
        <p>{message}</p>

        <div className="custom-dialog-actions">
          {showCancel && (
            <button
              className="custom-dialog-cancel"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}

          <button
            className={`custom-dialog-confirm ${type}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomDialog