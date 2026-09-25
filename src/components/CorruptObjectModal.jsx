import { useState } from 'react';

export default function CorruptObjectModal({
  isOpen,
  objects = [],
  onCorrupt,
  onClose,
}) {
  const [selectedId, setSelectedId] = useState('');

  if (!isOpen) return null;

  const effectiveSelectedId =
    selectedId && objects.some((o) => o.id === selectedId)
      ? selectedId
      : objects[0]?.id || '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (effectiveSelectedId) {
      onCorrupt(effectiveSelectedId);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content corrupt-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3 className="modal-title">Corrupt Replica</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="corrupt-object-select" className="form-label">
                Select object:
              </label>
              <select
                id="corrupt-object-select"
                className="modal-select"
                value={effectiveSelectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {objects.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name} ({obj.size})
                  </option>
                ))}
              </select>
            </div>
            <p className="modal-notice-subtle">
              Simulates bit rot or payload alteration on this node's replica.
            </p>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-warning"
              disabled={!effectiveSelectedId}
            >
              Corrupt Object
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
