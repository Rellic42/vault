import { useVault } from '../context/VaultContext';

export default function ClusterStatus() {
  const { clusterStatus, triggerNodeFailure, nodes } = useVault();

  // Find a healthy node to fail for the quick demo button
  const healthyNodeId = Object.keys(nodes).find(
    (id) => nodes[id].status === 'HEALTHY'
  );

  return (
    <div className="cluster-status-card">
      <div className="cluster-status-main">
        <span className="cluster-label">Cluster</span>
        <div className="cluster-indicator-group">
          <span className="cluster-icon" aria-hidden="true">
            {clusterStatus.icon}
          </span>
          <span className={`cluster-state-text state-${clusterStatus.state.toLowerCase()}`}>
            {clusterStatus.label}
          </span>
        </div>
        <span className="cluster-details">{clusterStatus.details}</span>
      </div>

      {healthyNodeId && (
        <div className="cluster-demo-control">
          <button
            type="button"
            className="demo-trigger-btn"
            onClick={() => triggerNodeFailure(healthyNodeId)}
            title="Simulate node failure to demonstrate Vault auto-repair"
          >
            ⚡ Test Auto-Repair ({nodes[healthyNodeId]?.name})
          </button>
        </div>
      )}
    </div>
  );
}
