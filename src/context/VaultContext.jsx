import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { INITIAL_NODES } from '../data/nodeMockData';
import { INITIAL_OBJECTS, INITIAL_ACTIVITIES, api } from '../services/api';

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
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  // Helper to add activity item
  const addActivity = useCallback((type, icon, title, description, statusTag) => {
    const newAct = {
      id: `act-${Date.now()}-${Math.random()}`,
      type,
      icon,
      time: getCurrentTime(),
      title,
      description,
      statusTag,
    };
    setActivities((prev) => [newAct, ...prev]);
  }, []);

  // Sync with real backend if running
  useEffect(() => {
    let isMounted = true;

    async function syncBackend() {
      const isLive = await api.isBackendLive();
      if (!isMounted) return;
      setIsBackendConnected(isLive);

      if (isLive) {
        const liveNodes = await api.getNodes();
        const liveObjects = await api.getObjects();
        const liveActivities = await api.getActivity();

        if (liveNodes && isMounted) {
          // Compute per-node object lists from liveObjects metadata if available
          const nodeObjectMap = {};
          if (liveObjects && liveObjects.length > 0) {
            Object.keys(liveNodes).forEach((id) => {
              nodeObjectMap[id] = liveObjects
                .filter((o) => o.replicas && o.replicas.includes(id))
                .map((o) => ({
                  id: o.id,
                  name: o.name,
                  size: o.size,
                  version: o.version || 'v1',
                  checksum: o.checksum,
                  fullChecksum: o.fullChecksum,
                  lastModified: o.lastModified,
                  status: o.status,
                }));
            });
          }

          // Fetch direct disk objects for each live node as well if online
          await Promise.all(
            Object.keys(liveNodes).map(async (id) => {
              const diskObjs = await api.getNodeObjects(id);
              if (diskObjs && diskObjs.length > 0) {
                nodeObjectMap[id] = diskObjs;
              }
            })
          );

          setNodes((prev) => {
            const merged = { ...prev };
            Object.keys(liveNodes).forEach((id) => {
              const assignedObjects = nodeObjectMap[id] || (liveObjects ? (
                liveObjects
                  .filter((o) => o.replicas && o.replicas.includes(id))
                  .map((o) => ({
                    id: o.id,
                    name: o.name,
                    size: o.size,
                    version: o.version || 'v1',
                    checksum: o.checksum,
                    fullChecksum: o.fullChecksum,
                    lastModified: o.lastModified,
                    status: o.status,
                  }))
              ) : (merged[id]?.objects || []));

              merged[id] = {
                ...merged[id],
                ...liveNodes[id],
                objects: assignedObjects,
                objectsCount: assignedObjects.length,
                events: merged[id]?.events || [],
              };
            });
            return merged;
          });
        }

        if (liveObjects && liveObjects.length > 0 && isMounted) {
          setObjects(liveObjects);
        }

        if (liveActivities && liveActivities.length > 0 && isMounted) {
          setActivities(liveActivities);
        }
      }
    }

    syncBackend();
    const interval = setInterval(syncBackend, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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
      details: `${onlineCount} / ${nodeValues.length} nodes online · 1 re-replication in progress`,
    };
  } else if (failedCount > 0) {
    clusterStatus = {
      state: 'DEGRADED',
      icon: '🔴',
      label: 'Degraded',
      details: `${onlineCount} / ${nodeValues.length} nodes online · ${failedCount} node(s) offline`,
    };
  }

  // Auto Re-replication for Node Failure (Killed Node STAYS Killed)
  const autoReplicateNodeFailure = useCallback((failedNodeId) => {
    const failedNodeName = nodes[failedNodeId]?.name || failedNodeId;
    
    // Pick candidate target HEALTHY node that is not failed and doesn't hold replica
    const candidateNodes = Object.keys(nodes).filter(
      (id) => id !== failedNodeId && nodes[id].status === 'HEALTHY'
    );

    const sourceNodeId = candidateNodes[0] || 'node-03';
    const targetNodeId = candidateNodes.find((id) => id !== 'node-01' && id !== 'node-03' && id !== 'node-05') || candidateNodes[candidateNodes.length - 1] || 'node-02';
    
    const sourceNodeName = nodes[sourceNodeId]?.name || 'Node 03';
    const targetNodeName = nodes[targetNodeId]?.name || 'Node 02';

    addActivity(
      'warning',
      '⚠',
      `${failedNodeName} unavailable`,
      `Heartbeat lost. Node remains offline. Re-replicating to active nodes.`,
      'Degraded'
    );

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.replicas.includes(failedNodeId)) {
          return { ...obj, integrity: 'Repairing', status: 'Repairing' };
        }
        return obj;
      })
    );

    setTimeout(() => {
      addActivity('processing', '↻', 'Auto-replication initiated', `Cloning replica from ${sourceNodeName} → ${targetNodeName}`, 'Cloning');

      setActiveRepair({
        objectName: 'dataset.zip',
        source: sourceNodeName,
        target: targetNodeName,
        progress: 35,
      });

      setTimeout(() => {
        setActiveRepair((prev) => (prev ? { ...prev, progress: 80 } : null));
      }, 900);

      setTimeout(() => {
        setActiveRepair((prev) => (prev ? { ...prev, progress: 100 } : null));

        setTimeout(() => {
          addActivity('success', '✓', 'Auto-replication complete', `New replica of dataset.zip stored on ${targetNodeName} (${failedNodeName} remains offline)`, 'Re-replicated');

          // Update objects: replace failed node with new target node in replicas list!
          setObjects((prev) =>
            prev.map((obj) => {
              if (obj.replicas.includes(failedNodeId)) {
                const updatedReplicas = obj.replicas.filter((r) => r !== failedNodeId).concat(targetNodeId);
                return { ...obj, replicas: updatedReplicas, integrity: 'Verified', status: 'Healthy' };
              }
              return obj;
            })
          );
          // NOTE: nodes[failedNodeId] is NOT touched here; it STAYS FAILED/OFFLINE!
          setActiveRepair(null);
        }, 500);
      }, 1800);
    }, 600);
  }, [nodes, addActivity]);

  const repairDataCorruption = useCallback((corruptedNodeId, objectId) => {
    const nodeName = nodes[corruptedNodeId]?.name || corruptedNodeId;
    const targetObj = objects.find((o) => o.id === objectId) || objects[0];

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
          return { ...obj, integrity: 'Mismatch', status: 'Repairing' };
        }
        return obj;
      })
    );

    setTimeout(() => {
      addActivity('processing', '↻', 'Healthy replica selected', 'Sourced from Node 03', 'Selected');
      addActivity('processing', '↻', 'Repair started', `Overwriting corrupted payload on ${nodeName}`, 'Repairing');

      setActiveRepair({
        objectName: targetObj.name,
        source: 'Node 03',
        target: nodeName,
        progress: 50,
      });

      setTimeout(() => {
        setActiveRepair((prev) => (prev ? { ...prev, progress: 100 } : null));

        setTimeout(() => {
          addActivity('success', '✓', 'Checksum verified', `Replica integrity restored on ${nodeName}`, 'Verified');

          setObjects((prev) =>
            prev.map((obj) => {
              if (obj.id === targetObj.id) {
                return { ...obj, integrity: 'Verified', status: 'Healthy' };
              }
              return obj;
            })
          );

          setNodes((prev) => {
            const node = prev[corruptedNodeId];
            if (!node) return prev;
            return { ...prev, [corruptedNodeId]: { ...node, status: 'HEALTHY' } };
          });

          setActiveRepair(null);
        }, 500);
      }, 1500);
    }, 600);
  }, [nodes, objects, addActivity]);

  // Public Actions
  const triggerNodeFailure = useCallback(async (nodeId) => {
    setNodes((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], status: 'FAILED' },
    }));
    await api.simulateFailure(nodeId);
    autoReplicateNodeFailure(nodeId);
  }, [autoReplicateNodeFailure]);

  const triggerNodeKill = useCallback(async (nodeId) => {
    setNodes((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], status: 'OFFLINE' },
    }));
    await api.killNode(nodeId);
    autoReplicateNodeFailure(nodeId);
  }, [autoReplicateNodeFailure]);

  const triggerDataCorruption = useCallback(async (nodeId, objectId = 'obj_001') => {
    const targetObj = objects.find((o) => o.id === objectId) || objects[0];
    const filename = targetObj ? targetObj.name : 'dataset.zip';

    setNodes((prev) => {
      const node = prev[nodeId];
      if (!node) return prev;
      return { ...prev, [nodeId]: { ...node, status: 'CORRUPTED' } };
    });
    await api.corruptObject(nodeId, filename);
    repairDataCorruption(nodeId, objectId);
  }, [objects, repairDataCorruption]);

  const restoreNode = useCallback(async (nodeId) => {
    const nodeName = nodes[nodeId]?.name || nodeId;
    setNodes((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], status: 'HEALTHY' },
    }));
    await api.restoreNode(nodeId);
    addActivity('success', '✓', `${nodeName} restored`, 'Node rejoined cluster and passed health check', 'Healthy');
  }, [nodes, addActivity]);

  const storeObject = useCallback(async (file, replication, durability) => {
    const factorNum = parseInt(replication, 10) || 3;

    let rawFile = file.rawFile || file;
    if (rawFile instanceof File) {
      const backendRes = await api.uploadObject(rawFile, factorNum, durability);
      if (backendRes) {
        addActivity('success', '✓', 'Object stored on backend', `${file.name} replicated across nodes`, 'Stored');
        const liveObjects = await api.getObjects();
        if (liveObjects) setObjects(liveObjects);
        return;
      }
    }

    const allNodeIds = ['node-01', 'node-02', 'node-03', 'node-04', 'node-05'];
    const chosenReplicas = allNodeIds.slice(0, Math.min(factorNum, 5));

    const newObj = {
      id: `obj_${String(objects.length + 1).padStart(3, '0')}`,
      name: file.name || 'dataset.zip',
      size: file.size || '2.4 GB',
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

    const nodeNames = chosenReplicas.map((id) => nodes[id]?.name || id).join(', ');
    addActivity('success', '✓', 'Object uploaded', `${newObj.name} stored on ${nodeNames}`, 'Success');
    addActivity('success', '✓', 'Metadata updated', `${factorNum} replicas registered in metadata catalog`, 'Registered');
  }, [objects.length, nodes, addActivity]);

  return (
    <VaultContext.Provider
      value={{
        nodes,
        objects,
        activities,
        activeRepair,
        clusterStatus,
        isBackendConnected,
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
