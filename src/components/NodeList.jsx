import { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { STATUS_TYPES } from '../data/nodeMockData';

export default function NodeList({ onOpenNode }) {
  const { nodes } = useVault();
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const nodeList = Object.values(nodes);

  // Close popup with Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };
    if (selectedNodeId) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  return (
    <section className="nodes-section">
      <div className="section-header-block-row">
        <h2 className="section-title">Storage Nodes</h2>
        <span className="heartbeat-monitoring-tag">
          <span className="heartbeat-pulse-dot"></span> Cluster heartbeat: Monitoring {nodeList.length} nodes
        </span>
      </div>

      <div className="nodes-grid">
        {nodeList.map((node) => {
          const statusInfo = STATUS_TYPES[node.status] || STATUS_TYPES.HEALTHY;

          return (
            <div
              key={node.id}
              className={`node-card node-card-state-${node.status.toLowerCase()}`}
              onClick={() => setSelectedNodeId(node.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedNodeId(node.id);
                }
              }}
            >
              <div className="node-card-header">
                <span className="node-name">{node.name}</span>
                <span
                  className="node-status"
                  style={{ color: statusInfo.color }}
                >
                  <span
                    className="status-dot"
                    style={{ backgroundColor: statusInfo.color }}
                  ></span>
                  {statusInfo.display}
                </span>
              </div>
              <div className="node-address">{node.address}</div>
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <div className="modal-backdrop" onClick={() => setSelectedNodeId(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <span className="modal-title">{selectedNode.name}</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedNodeId(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-row">
                <span className="modal-label">Status:</span>
                <span className="node-status">
                  <span
                    className="status-dot"
                    style={{
                      backgroundColor:
                        (STATUS_TYPES[selectedNode.status] || STATUS_TYPES.HEALTHY)
                          .color,
                    }}
                  ></span>
                  {(STATUS_TYPES[selectedNode.status] || STATUS_TYPES.HEALTHY).display}
                </span>
              </div>

              <div className="modal-row">
                <span className="modal-label">Address:</span>
                <span className="modal-mono">{selectedNode.address}</span>
              </div>

              {onOpenNode && (
                <button
                  type="button"
                  className="open-node-btn"
                  onClick={() => {
                    const id = selectedNode.id;
                    setSelectedNodeId(null);
                    onOpenNode(id);
                  }}
                >
                  Open Node Web UI ({selectedNode.address}) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
