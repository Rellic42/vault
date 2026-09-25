import { REPLICATION_OPTIONS } from '../data/mockData';

export default function ReplicationSelector({ value, onChange }) {
  return (
    <div className="config-group">
      <label className="config-label">Replication</label>
      <div className="replication-options">
        {REPLICATION_OPTIONS.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`replication-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <p className="config-explanation">Number of copies stored across nodes.</p>
    </div>
  );
}
