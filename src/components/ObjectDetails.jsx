export default function ObjectDetails({ object, onClose }) {
  if (!object) return null;

  const isCorrupted = object.status === 'Corrupted';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content object-details-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-header-title-group">
            <span className="object-icon">📦</span>
            <h3 className="modal-title">{object.name}</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close object details"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-row">
            <span className="modal-label">Object ID:</span>
            <span className="modal-mono">{object.id}</span>
          </div>

          <div className="modal-row">
            <span className="modal-label">Size:</span>
            <span className="modal-mono">{object.size}</span>
          </div>

          <div className="modal-row">
            <span className="modal-label">Version:</span>
            <span className="modal-mono">{object.version}</span>
          </div>

          <div className="modal-row">
            <span className="modal-label">Status:</span>
            <span
              className={`modal-status-badge ${
                isCorrupted ? 'corrupted' : 'healthy'
              }`}
            >
              {isCorrupted ? '🔴 Corrupted' : '🟢 Healthy'}
            </span>
          </div>

          {isCorrupted ? (
            <div className="corruption-details-box">
              <div className="modal-row">
                <span className="modal-label">Expected SHA-256:</span>
                <span className="modal-mono checksum-valid">
                  {object.checksum}
                </span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Current SHA-256:</span>
                <span className="modal-mono checksum-mismatch">
                  {object.corruptedChecksum || 'a71d...32fe'}
                </span>
              </div>
              <p className="checksum-warning">
                Checksum mismatch detected during background verification.
              </p>
            </div>
          ) : (
            <div className="modal-row">
              <span className="modal-label">Checksum (SHA-256):</span>
              <span className="modal-mono">{object.checksum}</span>
            </div>
          )}

          <div className="modal-row">
            <span className="modal-label">Last Modified:</span>
            <span className="modal-value-faint">{object.lastModified}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
