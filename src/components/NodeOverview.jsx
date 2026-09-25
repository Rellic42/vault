import { STATUS_TYPES } from '../data/nodeMockData';

export default function NodeOverview({ node }) {
  const statusInfo = STATUS_TYPES[node.status] || STATUS_TYPES.HEALTHY;

  return (
    <section className="node-overview-section" aria-label="Node overview">
      <div className="overview-item">
        <span className="overview-label">Status</span>
        <span className="overview-value" style={{ color: statusInfo.color }}>
          {statusInfo.display}
        </span>
      </div>

      <div className="overview-item">
        <span className="overview-label">Address</span>
        <span className="overview-value font-mono">{node.address}</span>
      </div>

      <div className="overview-item">
        <span className="overview-label">Storage</span>
        <span className="overview-value">{node.storage}</span>
      </div>

      <div className="overview-item">
        <span className="overview-label">Objects</span>
        <span className="overview-value font-mono">{node.objectsCount}</span>
      </div>

      <div className="overview-item">
        <span className="overview-label">Last Heartbeat</span>
        <span className="overview-value">
          {node.status === 'OFFLINE'
            ? 'Offline'
            : node.status === 'FAILED'
            ? 'Failed'
            : node.lastHeartbeat}
        </span>
      </div>
    </section>
  );
}
