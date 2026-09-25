import { STATUS_TYPES } from '../data/nodeMockData';

export default function NodeHeader({
  node,
  availableNodes = [],
  onSelectNode,
  onBackToDashboard,
}) {
  const statusInfo = STATUS_TYPES[node.status] || STATUS_TYPES.HEALTHY;

  return (
    <header className="node-header">
      <div className="node-header-left">
        <div className="node-brand">
          <span className="node-brand-tag">VAULT NODE</span>
          {onBackToDashboard && (
            <button
              type="button"
              className="back-to-vault-btn"
              onClick={onBackToDashboard}
              title="Return to Vault Main Dashboard"
            >
              ← Main Dashboard
            </button>
          )}
        </div>

        <div className="node-title-group">
          {availableNodes.length > 1 ? (
            <div className="node-selector-wrapper">
              <select
                className="node-select-dropdown"
                value={node.id}
                onChange={(e) => onSelectNode && onSelectNode(e.target.value)}
                aria-label="Select storage node"
              >
                {availableNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} (:{n.port})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <h1 className="node-title">{node.name}</h1>
          )}
          <span className="node-address-mono">http://{node.address}</span>
        </div>
      </div>

      <div className="node-header-right">
        <div className={`node-status-pill ${statusInfo.badgeClass}`}>
          <span
            className="node-status-dot"
            style={{ backgroundColor: statusInfo.color }}
          ></span>
          <span className="node-status-label">{statusInfo.label}</span>
        </div>
      </div>
    </header>
  );
}
