import { useVault } from '../context/VaultContext';

export default function RepairCard() {
  const { activeRepair } = useVault();

  if (!activeRepair) return null;

  return (
    <div className="repair-card-banner">
      <div className="repair-card-header">
        <span className="repair-icon">↻</span>
        <span className="repair-title">
          Repairing <strong>{activeRepair.objectName}</strong>
        </span>
        <span className="repair-nodes font-mono">
          {activeRepair.source} → {activeRepair.target}
        </span>
      </div>

      <div className="repair-progress-bar-track">
        <div
          className="repair-progress-bar-fill"
          style={{ width: `${activeRepair.progress}%` }}
        ></div>
      </div>

      <div className="repair-card-footer">
        <span className="repair-subtext">Copying replica payload...</span>
        <span className="repair-percentage font-mono">
          {activeRepair.progress}%
        </span>
      </div>
    </div>
  );
}
