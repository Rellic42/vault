import { createContext, useContext, useState, useCallback } from 'react';
import { INITIAL_NODES } from '../data/nodeMockData';
import { INITIAL_OBJECTS, INITIAL_ACTIVITIES } from '../services/api';

const VaultContext = createContext();

const getCurrentTime = () => {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
};

export function VaultProvider({ children }) {
  const [nodes, setNodes] = useState({ ...INITIAL_NODES });
  const [objects, setObjects] = useState([...INITIAL_OBJECTS]);
  const [activities, setActivities] = useState([...INITIAL_ACTIVITIES]);
  const [activeRepair, setActiveRepair] = useState(null);

  // Helper to add activity item to top of list
  const addActivity = useCallback((type, icon, title, description, statusTag) => {
    const newAct = {
      id: `act-${Date.now()}-${Math.random()}`,
      type, // 'success' | 'warning' | 'processing' | 'failure'
      icon,
      time: getCurrentTime(),
      title,
      description,
      statusTag,
    };
    setActivities((prev) => [newAct, ...prev]);
  }, []);

  // Compute cluster status
  const nodeValues = Object.values(nodes);
  const onlineCount = nodeValues.filter((n) => n.status === 'HEALTHY').length;
  const failedCount = nodeValues.filter((n) => n.status === 'FAILED' || n.status === 'OFFLINE').length;
  const isRepairing = Boolean(activeRepair);

  let clusterStatus = {
    state: 'HEALTHY',
    icon: '🟢',
    label: 'Healthy',
    details: `${onlineCount} / ${nodeValues.length} nodes online`,
  };

  if (isRepairing) {
    clusterStatus = {
      state: 'RECOVERING',
      icon: '🟡',
      label: 'Recovering',
      details: `${onlineCount} / ${nodeValues.length} nodes online · 1 repair in progress`,
    };
  } else if (failedCount > 0) {
    clusterStatus = {
      state: 'DEGRADED',
      icon: '🔴',
      label: 'Degraded',
      details: `${onlineCount} / ${nodeValues.length} nodes online · ${failedCount} node(s) unavailable`,
    };
  }

  // Auto-repair workflow when a node fails
  const repairNodeFailure = useCallback((failedNodeId) => {
    const failedNodeName = nodes[failedNodeId]?.name || failedNodeId;
    const availableNodes = Object.keys(nodes).filter(
      (id) => id !== failedNodeId && nodes[id].status === 'HEALTHY'
    );

    // Pick target healthy node not already holding the replica
    const sourceNodeId = availableNodes[0] || 'node-01';
    const targetNodeId = availableNodes[availableNodes.length - 1] || 'node-04';
    const sourceNodeName = nodes[sourceNodeId]?.name || 'Node 01';
    const targetNodeName = nodes[targetNodeId]?.name || 'Node 04';

    // Step 1: Log failure detection
    addActivity(
      'warning',
      '⚠',
      `${failedNodeName} unavailable`,
      'Replica count dropped from 3 → 2',
      'Degraded'
    );

    // Update object statuses to Repairing
    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.replicas.includes(failedNodeId)) {
          return {
            ...obj,
            integrity: 'Repairing',
            status: 'Repairing',
          };
        }
        return obj;
      })
    );

    // Step 2: Repair started
    setTimeout(() => {
      addActivity(
        'processing',
        '↻',
        'Repair started',
        `Using ${sourceNodeName} as source`,
        'Active'
      );

      addActivity(
        'processing',
        '↻',
        'Copying replica',
        `${sourceNodeName} → ${targetNodeName}`,
        'Transferring'
      );

      setActiveRepair({
        objectName: 'dataset.zip',
        source: sourceNodeName,
        target: targetNodeName,
        progress: 25,
      });

      // Progress animation
      setTimeout(() => {
        setActiveRepair((prev) => prev ? { ...prev, progress: 65 } : null);
      }, 1000);

      setTimeout(() => {
        setActiveRepair((prev) => prev ? { ...prev, progress: 100 } : null);

        // Step 3: Repair completed & Checksum verified
        setTimeout(() => {
          addActivity(
            'success',
            '✓',
            'Repair completed',
            `dataset.zip restored on ${targetNodeName}`,
            'Restored'
          );

          addActivity(
            'success',
            '✓',
            'Checksum verified',
            'Replica integrity confirmed (SHA-256 8f23...91ac)',
            'Verified'
          );

          // Update objects state back to healthy with new replica
          setObjects((prev) =>
            prev.map((obj) => {
              if (obj.replicas.includes(failedNodeId)) {
                const newReplicas = obj.replicas
                  .filter((r) => r !== failedNodeId)
                  .concat(targetNodeId);
                return {
                  ...obj,
                  replicas: newReplicas,
                  integrity: 'Verified',
                  status: 'Healthy',
                };
              }
              return obj;
            })
          );

          setActiveRepair(null);
        }, 600);
      }, 2000);
    }, 800);
  }, [nodes, addActivity]);

  // Auto-repair workflow when data corruption happens
  const repairDataCorruption = useCallback((corruptedNodeId, objectId) => {
    const nodeName = nodes[corruptedNodeId]?.name || corruptedNodeId;
    const targetObj = objects.find((o) => o.id === objectId) || objects[0];

    // Step 1: Detect corruption
    addActivity(
      'warning',
      '⚠',
      'Data integrity issue detected',
      `Checksum mismatch on ${nodeName} (Expected: 8f23...91ac, Received: a71d...32fe)`,
      'Mismatch'
    );

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id === targetObj.id) {
          return {
            ...obj,
            integrity: 'Mismatch',
            status: 'Repairing',
          };
        }
        return obj;
      })
    );

    // Step 2: Auto Repair
    setTimeout(() => {
      addActivity(
        'processing',
        '↻',
        'Healthy replica selected',
        'Sourced from Node 01',
        'Selected'
      );

      addActivity(
        'processing',
        '↻',
        'Repair started',
        `Overwriting corrupted payload on ${nodeName}`,
        'Repairing'
      );

      setActiveRepair({
        objectName: targetObj.name,
        source: 'Node 01',
        target: nodeName,
        progress: 40,
      });

      setTimeout(() => {
        setActiveRepair((prev) => prev ? { ...prev, progress: 100 } : null);

        setTimeout(() => {
          addActivity(
            'success',
            '✓',
            'Checksum verified',
            `Replica integrity confirmed on ${nodeName}`,
            'Verified'
          );

          setObjects((prev) =>
            prev.map((obj) => {
              if (obj.id === targetObj.id) {
                return {
                  ...obj,
                  integrity: 'Verified',
                  status: 'Healthy',
                };
              }
              return obj;
            })
          );

          // Revert node status back to Healthy
          setNodes((prev) => ({
            ...prev,
            [corruptedNodeId]: {
              ...prev[corruptedNodeId],
              status: 'HEALTHY',
              objects: prev[corruptedNodeId].objects.map((o) => ({
                ...o,
                status: 'Healthy',
              })),
            },
          }));

          setActiveRepair(null);
        }, 600);
      }, 1800);
    }, 800);
  }, [nodes, objects, addActivity]);

  // Actions from Node UI or Demo Trigger
  const triggerNodeFailure = useCallback((nodeId) => {
    setNodes((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        status: 'FAILED',
      },
    }));
    repairNodeFailure(nodeId);
  }, [repairNodeFailure]);

  const triggerNodeKill = useCallback((nodeId) => {
    setNodes((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        status: 'OFFLINE',
      },
    }));
    repairNodeFailure(nodeId);
  }, [repairNodeFailure]);

  const triggerDataCorruption = useCallback((nodeId, objectId = 'obj_001') => {
    setNodes((prev) => {
      const node = prev[nodeId];
      if (!node) return prev;
      const updatedObjs = node.objects.map((o) =>
        o.id === objectId ? { ...o, status: 'Corrupted' } : o
      );
      return {
        ...prev,
        [nodeId]: {
          ...node,
          status: 'CORRUPTED',
          objects: updatedObjs,
        },
      };
    });
    repairDataCorruption(nodeId, objectId);
  }, [repairDataCorruption]);

  const restoreNode = useCallback((nodeId) => {
    const nodeName = nodes[nodeId]?.name || nodeId;
    setNodes((prev) => {
      const node = prev[nodeId];
      if (!node) return prev;
      const cleanObjs = node.objects.map((o) => ({ ...o, status: 'Healthy' }));
      return {
        ...prev,
        [nodeId]: {
          ...node,
          status: 'HEALTHY',
          objects: cleanObjs,
        },
      };
    });
    addActivity(
      'success',
      '✓',
      `${nodeName} restored`,
      'Node rejoined cluster and passed heartbeat check',
      'Healthy'
    );
  }, [nodes, addActivity]);

  // Store new object action from Step 1 upload
  const storeObject = useCallback((file, replication, durability) => {
    const factorNum = parseInt(replication, 10) || 3;
    const allNodeIds = ['node-01', 'node-02', 'node-03', 'node-04', 'node-05'];
    const chosenReplicas = allNodeIds.slice(0, Math.min(factorNum, 5));

    const newObj = {
      id: `obj_${String(objects.length + 1).padStart(3, '0')}`,
      name: file.name || 'new_dataset.zip',
      size: file.size || '1.5 GB',
      version: 'v1',
      checksum: 'e71b...09fa',
      fullChecksum: 'e71b9042a188f01b3829c9102834b921',
      replicationFactor: factorNum,
      targetReplication: `${factorNum}x`,
      durability: durability ? durability.charAt(0).toUpperCase() + durability.slice(1) : 'High',
      replicas: chosenReplicas,
      integrity: 'Verified',
      status: 'Healthy',
      lastModified: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setObjects((prev) => [newObj, ...prev]);

    const nodeNames = chosenReplicas
      .map((id) => nodes[id]?.name || id)
      .join(', ');

    addActivity(
      'success',
      '✓',
      'Object uploaded',
      `${newObj.name} stored on ${nodeNames}`,
      'Success'
    );

    addActivity(
      'success',
      '✓',
      'Metadata updated',
      `${factorNum} replicas registered in metadata catalog`,
      'Registered'
    );
  }, [objects.length, nodes, addActivity]);

  return (
    <VaultContext.Provider
      value={{
        nodes,
        objects,
        activities,
        activeRepair,
        clusterStatus,
        storeObject,
        triggerNodeFailure,
        triggerNodeKill,
        triggerDataCorruption,
        restoreNode,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
