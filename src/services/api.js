import { INITIAL_NODES } from '../data/nodeMockData';

// Initial objects state for Step 3
export const INITIAL_OBJECTS = [
  {
    id: 'obj_001',
    name: 'dataset.zip',
    size: '2.4 GB',
    version: 'v3',
    checksum: '8f23...91ac',
    fullChecksum: '8f234cb19a2e37bc91ac54b810e9f283d719',
    replicationFactor: 3,
    targetReplication: '3x',
    durability: 'High',
    replicas: ['node-01', 'node-03', 'node-05'],
    integrity: 'Verified', // 'Verified' | 'Checking' | 'Mismatch' | 'Repairing'
    status: 'Healthy', // 'Healthy' | 'Repairing' | 'Degraded'
    lastModified: '2026-09-25 14:22:10',
  },
  {
    id: 'obj_002',
    name: 'presentation.pdf',
    size: '42 MB',
    version: 'v1',
    checksum: '3e12...8b9c',
    fullChecksum: '3e129aa87f215d018b9c1044ba938210fe44',
    replicationFactor: 2,
    targetReplication: '2x',
    durability: 'Standard',
    replicas: ['node-02', 'node-04'],
    integrity: 'Verified',
    status: 'Healthy',
    lastModified: '2026-09-24 09:15:33',
  },
  {
    id: 'obj_003',
    name: 'video.mp4',
    size: '1.2 GB',
    version: 'v2',
    checksum: 'd901...57ca',
    fullChecksum: 'd90184fa93bc21e457ca38491028ba491a92',
    replicationFactor: 3,
    targetReplication: '3x',
    durability: 'Maximum',
    replicas: ['node-01', 'node-02', 'node-05'],
    integrity: 'Verified',
    status: 'Healthy',
    lastModified: '2026-09-23 20:05:44',
  },
];

export const INITIAL_ACTIVITIES = [
  {
    id: 'act-1',
    type: 'success', // 'success' | 'warning' | 'processing' | 'failure'
    icon: '✓',
    time: '02:31:12',
    title: 'Object uploaded',
    description: 'dataset.zip stored on Node 01, Node 03 and Node 05',
    statusTag: 'Success',
  },
  {
    id: 'act-2',
    type: 'success',
    icon: '✓',
    time: '02:31:15',
    title: 'Metadata updated',
    description: '3 replicas registered in metadata catalog',
    statusTag: 'Registered',
  },
  {
    id: 'act-3',
    type: 'success',
    icon: '✓',
    time: '02:32:04',
    title: 'Heartbeat received',
    description: 'Cluster health confirmed across 5 storage nodes',
    statusTag: 'Healthy',
  },
];

// Backend-ready API methods
export const api = {
  async getNodes() {
    return { ...INITIAL_NODES };
  },

  async getObjects() {
    return [...INITIAL_OBJECTS];
  },

  async getObject(id) {
    return INITIAL_OBJECTS.find((o) => o.id === id) || null;
  },

  async getMetadata(id) {
    const obj = INITIAL_OBJECTS.find((o) => o.id === id);
    if (!obj) return null;
    return {
      objectId: obj.id,
      name: obj.name,
      version: obj.version,
      size: obj.size,
      checksum: obj.checksum,
      replicationFactor: obj.replicationFactor,
      replicas: obj.replicas,
      durability: obj.durability,
      status: 'Consistent',
      lastVerified: '2 seconds ago',
    };
  },

  async getActivity() {
    return [...INITIAL_ACTIVITIES];
  },

  async getNodeStatus(nodeId) {
    return INITIAL_NODES[nodeId]?.status || 'HEALTHY';
  },

  async simulateFailure(nodeId) {
    return { success: true, nodeId, action: 'FAILED' };
  },

  async simulateCorruption(nodeId, objectId) {
    return { success: true, nodeId, objectId, action: 'CORRUPTED' };
  },

  async restoreNode(nodeId) {
    return { success: true, nodeId, action: 'RESTORED' };
  },
};
