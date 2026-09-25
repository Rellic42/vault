export default function ObjectList({ objects = [], onSelectObject, selectedObjectId }) {
  return (
    <section className="objects-section">
      <div className="section-header-row">
        <h2 className="section-heading">Stored Objects</h2>
        <span className="folder-crumb">📁 objects/</span>
      </div>

      <div className="objects-list">
        {objects.map((obj) => {
          const isSelected = selectedObjectId === obj.id;
          const isCorrupted = obj.status === 'Corrupted';

          return (
            <div
              key={obj.id}
              className={`object-row ${isSelected ? 'selected' : ''} ${
                isCorrupted ? 'corrupted' : ''
              }`}
              onClick={() => onSelectObject(obj)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectObject(obj);
                }
              }}
            >
              <div className="object-main-info">
                <span className="object-icon" aria-hidden="true">
                  📦
                </span>
                <div className="object-name-group">
                  <span className="object-name">{obj.name}</span>
                  <span className="object-id-tag font-mono">{obj.id}</span>
                </div>
              </div>

              <div className="object-meta-info">
                {isCorrupted && (
                  <span className="object-corrupt-badge">🔴 Corrupted</span>
                )}
                <span className="object-size font-mono">{obj.size}</span>
                <span className="object-date">{obj.lastModified}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
