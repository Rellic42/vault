import { useState } from 'react';
import NodeHeader from '../components/NodeHeader';
import NodeOverview from '../components/NodeOverview';
import ObjectList from '../components/ObjectList';
import ObjectDetails from '../components/ObjectDetails';
import NodeControls from '../components/NodeControls';
import CorruptObjectModal from '../components/CorruptObjectModal';
import ConfirmationModal from '../components/ConfirmationModal';
import EventLog from '../components/EventLog';
import { useVault } from '../context/VaultContext';

const getCurrentTime = () => {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
};

export default function NodePage({
  nodeId = 'node-01',
  onSelectNode,
  onBackToDashboard,
}) {
  const {
    nodes,
    triggerNodeFailure,
    triggerNodeKill,
    triggerDataCorruption,
    restoreNode,
  } = useVault();

  const currentNode = nodes[nodeId] || nodes['node-01'];

  const [localEvents, setLocalEvents] = useState(() => currentNode.events || []);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [isKillModalOpen, setIsKillModalOpen] = useState(false);
  const [isCorruptModalOpen, setIsCorruptModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const addEvent = (message) => {
    const newEvent = {
      id: `evt-${Date.now()}-${Math.random()}`,
      time: getCurrentTime(),
      message,
    };
    setLocalEvents((prev) => [newEvent, ...prev]);
  };

  const handleSimulateFailure = () => {
    addEvent('Failure simulation triggered');
    triggerNodeFailure(nodeId);
    showNotification(`${currentNode.name} is now unavailable.`, 'error');
  };

  const handleConfirmKill = () => {
    setIsKillModalOpen(false);
    addEvent('Node process terminated (SIGKILL)');
    triggerNodeKill(nodeId);
    showNotification('Node is offline.', 'error');
  };

  const handleCorruptObject = (objId) => {
    setIsCorruptModalOpen(false);
    const targetObj = currentNode.objects.find((o) => o.id === objId);
    const objName = targetObj ? targetObj.name : objId;

    addEvent(`Data corruption simulated on ${objName} (SHA-256 mismatch)`);
    triggerDataCorruption(nodeId, objId);
    showNotification('⚠ Data corruption simulated', 'warning');
  };

  const handleRestoreNode = () => {
    addEvent('Node restored to healthy state');
    restoreNode(nodeId);
    showNotification(`${currentNode.name} restored.`, 'success');
  };

  const selectedObject = currentNode.objects.find(
    (o) => o.id === selectedObjectId
  );

  const availableNodesList = Object.values(nodes).map((n) => ({
    id: n.id,
    name: n.name,
    port: n.port,
  }));

  return (
    <div className={`node-page-wrapper state-${currentNode.status.toLowerCase()}`}>
      <div className="node-page-container">
        {notification && (
          <div
            className={`node-notification-toast toast-${notification.type}`}
            role="status"
          >
            <span className="toast-text">{notification.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => setNotification(null)}
            >
              ✕
            </button>
          </div>
        )}

        <NodeHeader
          node={currentNode}
          availableNodes={availableNodesList}
          onSelectNode={onSelectNode}
          onBackToDashboard={onBackToDashboard}
        />

        <main className="node-main-content">
          <NodeOverview node={currentNode} />

          <ObjectList
            objects={currentNode.objects}
            selectedObjectId={selectedObjectId}
            onSelectObject={(obj) => setSelectedObjectId(obj.id)}
          />

          <NodeControls
            nodeStatus={currentNode.status}
            onSimulateFailure={handleSimulateFailure}
            onOpenKillModal={() => setIsKillModalOpen(true)}
            onOpenCorruptModal={() => setIsCorruptModalOpen(true)}
            onRestoreNode={handleRestoreNode}
          />

          <EventLog events={localEvents} />
        </main>
      </div>

      {selectedObject && (
        <ObjectDetails
          object={selectedObject}
          onClose={() => setSelectedObjectId(null)}
        />
      )}

      <ConfirmationModal
        isOpen={isKillModalOpen}
        title={`Kill ${currentNode.name}?`}
        text="This will simulate complete node shutdown."
        confirmLabel="Kill Node"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={handleConfirmKill}
        onCancel={() => setIsKillModalOpen(false)}
      />

      <CorruptObjectModal
        isOpen={isCorruptModalOpen}
        objects={currentNode.objects}
        onCorrupt={handleCorruptObject}
        onClose={() => setIsCorruptModalOpen(false)}
      />
    </div>
  );
}
