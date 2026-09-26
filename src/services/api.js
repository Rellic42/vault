import { INITIAL_NODES } from '../data/nodeMockData';

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
    integrity: 'Verified',
    status: 'Healthy',
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
    type: 'success',
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

const CONTROLLER_URL = 'http://localhost:8000';

export const NODE_URLS = {
  'node-01': 'http://localhost:8001',
  'node-02': 'http://localhost:8002',
  'node-03': 'http://localhost:8003',
  'node-04': 'http://localhost:8004',
  'node-05': 'http://localhost:8005',
};

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '0 B';
  if (typeof bytes === 'string') return bytes;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function truncateChecksum(sha) {
  if (!sha) return '8f23...91ac';
  if (sha.length <= 12) return sha;
  return `${sha.slice(0, 4)}...${sha.slice(-4)}`;
}

export const api = {
  // Check if controller is alive
  async isBackendLive() {
    try {
      const res = await fetch(`${CONTROLLER_URL}/`, { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Fetch node states from controller
  async getNodes() {
    try {
      const res = await fetch(`${CONTROLLER_URL}/nodes`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Controller offline');
      const data = await res.json();
      
      const mapped = {};
      data.nodes.forEach((n) => {
        const uppercaseStatus = (n.status || 'healthy').toUpperCase();
        mapped[n.id] = {
          id: n.id,
          name: n.id.replace('node-0', 'Node 0'),
          host: 'localhost',
          port: parseInt(n.address.split(':').pop(), 10) || 8001,
          address: n.address.replace('http://', ''),
          status: uppercaseStatus,
          storage: '32.4 GB / 100 GB',
          objectsCount: 4,
          lastHeartbeat: n.last_heartbeat ? 'Just now' : '2 seconds ago',
          objects: [],
          events: [],
        };
      });
      return mapped;
    } catch (e) {
      console.warn('Using fallback node state:', e.message);
      return { ...INITIAL_NODES };
    }
  },

  // Fetch objects list from controller metadata
  async getObjects() {
    try {
      const res = await fetch(`${CONTROLLER_URL}/objects`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Controller offline');
      const data = await res.json();

      return data.objects.map((obj) => ({
        id: obj.object_id,
        name: obj.name,
        size: formatBytes(obj.size),
        rawSize: obj.size,
        version: 'v1',
        checksum: truncateChecksum(obj.checksum),
        fullChecksum: obj.checksum,
        replicationFactor: obj.replication_factor,
        targetReplication: `${obj.replication_factor}x`,
        durability: obj.durability ? obj.durability.charAt(0).toUpperCase() + obj.durability.slice(1) : 'High',
        replicas: obj.replicas || [],
        integrity: (obj.corrupted_replicas && obj.corrupted_replicas.length > 0) ? 'Mismatch' : (obj.status === 'degraded' ? 'Repairing' : 'Verified'),
        status: obj.status === 'healthy' ? 'Healthy' : (obj.status === 'degraded' ? 'Repairing' : 'Degraded'),
        lastModified: new Date().toISOString().replace('T', ' ').substring(0, 19),
      }));
    } catch (e) {
      console.warn('Using fallback objects state:', e.message);
      return null;
    }
  },

  // Fetch activity log from controller
  async getActivity() {
    try {
      const res = await fetch(`${CONTROLLER_URL}/activities`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Controller offline');
      const data = await res.json();
      return data.activities || [];
    } catch {
      return null;
    }
  },

  // Upload file to backend controller
  async uploadObject(file, replicationFactor = 3, durability = 'high') {
    const factorNum = parseInt(replicationFactor, 10) || 3;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replication_factor', factorNum);
    formData.append('durability', durability);

    try {
      const res = await fetch(`${CONTROLLER_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
    } catch (e) {
      console.warn('Backend upload fallback:', e.message);
      return null;
    }
  },

  // Simulate Node Failure
  async simulateFailure(nodeId) {
    const url = NODE_URLS[nodeId];
    if (!url) return;
    try {
      await fetch(`${url}/simulate-failure`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to reach node endpoint:', e.message);
    }
  },

  // Kill Node
  async killNode(nodeId) {
    const url = NODE_URLS[nodeId];
    if (!url) return;
    try {
      await fetch(`${url}/kill`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to reach node endpoint:', e.message);
    }
  },

  // Corrupt Object on specific node
  async corruptObject(nodeId, filename) {
    const url = NODE_URLS[nodeId];
    if (!url) return;
    try {
      await fetch(`${url}/objects/${filename}/corrupt`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to reach node corrupt endpoint:', e.message);
    }
  },

  // Fetch stored objects for a specific node (from node server endpoint directly)
  async getNodeObjects(nodeId) {
    const url = NODE_URLS[nodeId];
    if (!url) return null;
    try {
      const res = await fetch(`${url}/objects`, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) throw new Error('Node offline');
      const data = await res.json();
      return (data.objects || []).map((obj, index) => ({
        id: `node_obj_${nodeId}_${index}_${obj.name}`,
        name: obj.name,
        size: formatBytes(obj.size),
        rawSize: obj.size,
        version: 'v1',
        checksum: '8f23...91ac',
        fullChecksum: '8f234cb19a2e37bc91ac54b810e9f283d719',
        lastModified: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'Healthy',
      }));
    } catch (e) {
      console.warn(`Could not fetch live objects for ${nodeId}:`, e.message);
      return null;
    }
  },

  // Restore Node
  async restoreNode(nodeId) {
    const url = NODE_URLS[nodeId];
    if (!url) return;
    try {
      await fetch(`${url}/restore`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to reach node restore endpoint:', e.message);
    }
  },
};
