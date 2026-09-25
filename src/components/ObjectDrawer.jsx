import { useState } from 'react';
import { useVault } from '../context/VaultContext';

export default function ObjectDrawer({ object, onClose }) {
  const { nodes } = useVault();
  const [showRawMetadata, setShowRawMetadata] = useState(false);

  if (!object) return null;

  const isConsistent = object.status === 'Healthy';

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="object-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-icon">📦</span>
            <h3 className="drawer-title">{object.name}</h3>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-stat-grid">
            <div className="drawer-stat-item">
              <span className="stat-label">Size</span>
              <span className="stat-value font-mono">{object.size}</span>
            </div>

            <div className="drawer-stat-item">
              <span className="stat-label">Version</span>
              <span className="stat-value font-mono">{object.version}</span>
            </div>

            <div className="drawer-stat-item">
              <span className="stat-label">Replication</span>
              <span className="stat-value font-mono">
                {object.replicas.length} / {object.replicationFactor}
              </span>
            </div>

            <div className="drawer-stat-item">
              <span className="stat-label">Durability</span>
              <span className="stat-value">{object.durability}</span>
            </div>
          </div>

          <div className="drawer-section">
            <span className="drawer-section-label">Checksum (SHA-256)</span>
            <span className="drawer-mono-box font-mono">{object.checksum}</span>
          </div>

          <div className="drawer-section">
            <span className="drawer-section-label">Replicas</span>
            <div className="replica-nodes-list">
              {object.replicas.map((nodeId) => {
                const node = nodes[nodeId];
                const nodeName = node ? node.name : nodeId;
                const isNodeHealthy = node ? node.status === 'HEALTHY' : true;

                return (
                  <div key={nodeId} className="replica-node-row">
                    <span className="replica-node-name">{nodeName}</span>
                    <span
                      className={`replica-check ${
                        isNodeHealthy ? 'check-ok' : 'check-fail'
                      }`}
                    >
                      {isNodeHealthy ? '✓' : '✕'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="drawer-section">
            <span className="drawer-section-label">Metadata Status</span>
            <div className="metadata-status-pill">
              <span className="status-check-icon">
                {isConsistent ? '✓' : '⚠'}
              </span>
              <span>{isConsistent ? 'Consistent' : 'Updating catalog...'}</span>
            </div>
          </div>

          {/* Expandable Metadata Section */}
          <div className="drawer-section metadata-expandable">
            <button
              type="button"
              className="metadata-toggle-btn"
              onClick={() => setShowRawMetadata(!showRawMetadata)}
            >
              <span>{showRawMetadata ? '▼ Hide Metadata' : '▶ Expand Metadata Catalog'}</span>
            </button>

            {showRawMetadata && (
              <div className="raw-metadata-box font-mono">
                <div className="meta-row">
                  <span className="meta-k">Object ID:</span>
                  <span className="meta-v">{object.id}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-k">Version:</span>
                  <span className="meta-v">{object.version}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-k">Size:</span>
                  <span className="meta-v">{object.size}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-k">Checksum:</span>
                  <span className="meta-v">{object.checksum}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-k">Replication Factor:</span>
                  <span className="meta-v">{object.replicationFactor}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-k">Replicas:</span>
                  <span className="meta-v">
                    {object.replicas.map((r) => nodes[r]?.name || r).join(', ')}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-k">Status:</span>
                  <span className="meta-v">
                    {isConsistent ? 'Consistent' : 'Updating'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
