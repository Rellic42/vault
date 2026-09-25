export default function NodeControls({
  nodeStatus,
  onSimulateFailure,
  onOpenKillModal,
  onOpenCorruptModal,
  onRestoreNode,
}) {
  const isFailed = nodeStatus === 'FAILED';
  const isOffline = nodeStatus === 'OFFLINE';

  return (
    <section className="node-controls-section">
      <div className="section-header-block">
        <h2 className="section-heading">Node Controls</h2>
        <p className="section-subheading">
          Simulation controls for testing Vault resilience.
        </p>
      </div>

      <div className="controls-button-group">
        <button
          type="button"
          className="control-btn btn-failure"
          onClick={onSimulateFailure}
          disabled={isFailed || isOffline}
          title="Simulate network partition or node failure"
        >
          Simulate Failure
        </button>

        <button
          type="button"
          className="control-btn btn-kill"
          onClick={onOpenKillModal}
          disabled={isOffline}
          title="Simulate complete node shutdown"
        >
          Kill Node
        </button>

        <button
          type="button"
          className="control-btn btn-corrupt"
          onClick={onOpenCorruptModal}
          disabled={isFailed || isOffline}
          title="Simulate bit rot or silent data corruption"
        >
          Corrupt Data
        </button>

        <button
          type="button"
          className="control-btn btn-restore"
          onClick={onRestoreNode}
          title="Restore node and replicas to healthy state"
        >
          Restore Node
        </button>
      </div>
    </section>
  );
}
