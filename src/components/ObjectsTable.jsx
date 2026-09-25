import { useVault } from '../context/VaultContext';

export default function ObjectsTable({ onSelectObject }) {
  const { objects, nodes } = useVault();

  return (
    <section className="objects-table-section">
      <div className="section-header-block">
        <h2 className="section-heading">Objects</h2>
      </div>

      <div className="table-responsive-wrapper">
        <table className="objects-table">
          <thead>
            <tr>
              <th>Object</th>
              <th>Replication</th>
              <th>Replicas</th>
              <th>Integrity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {objects.map((obj) => {
              const formattedReplicas = obj.replicas
                .map((id) => nodes[id]?.name || id)
                .join(' · ');

              const isRepairing = obj.integrity === 'Repairing' || obj.status === 'Repairing';
              const isMismatch = obj.integrity === 'Mismatch';

              return (
                <tr
                  key={obj.id}
                  onClick={() => onSelectObject(obj)}
                  className="objects-table-row"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectObject(obj);
                    }
                  }}
                >
                  <td className="col-object">
                    <span className="obj-icon">📦</span>
                    <div className="obj-name-group">
                      <span className="obj-name">{obj.name}</span>
                      <span className="obj-size font-mono">{obj.size}</span>
                    </div>
                  </td>

                  <td className="col-replication font-mono">
                    {obj.replicas.length} / {obj.replicationFactor}
                  </td>

                  <td className="col-replicas font-mono">
                    {formattedReplicas || 'None'}
                  </td>

                  <td className="col-integrity">
                    {isRepairing ? (
                      <span className="integrity-tag tag-repairing">↻ Repairing</span>
                    ) : isMismatch ? (
                      <span className="integrity-tag tag-mismatch">⚠ Mismatch</span>
                    ) : (
                      <span className="integrity-tag tag-verified">✓ Verified</span>
                    )}
                  </td>

                  <td className="col-status">
                    <span
                      className={`status-badge-compact badge-${obj.status.toLowerCase()}`}
                    >
                      {obj.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
