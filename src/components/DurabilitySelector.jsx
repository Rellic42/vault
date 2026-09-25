import { DURABILITY_OPTIONS } from '../data/mockData';

export default function DurabilitySelector({ value, onChange }) {
  const currentOption = DURABILITY_OPTIONS.find((opt) => opt.id === value) || DURABILITY_OPTIONS[1];

  return (
    <div className="config-group">
      <label className="config-label">Durability</label>
      <div className="durability-options">
        {DURABILITY_OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`durability-btn ${isSelected ? 'active' : ''}`}
              onClick={() => onChange(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="config-explanation">{currentOption.description}</p>
    </div>
  );
}
