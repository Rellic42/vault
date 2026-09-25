export const MOCK_NODES = [
  { id: 'node-01', name: 'Node 01', host: 'localhost', port: 8001, address: 'localhost:8001', status: 'Healthy' },
  { id: 'node-02', name: 'Node 02', host: 'localhost', port: 8002, address: 'localhost:8002', status: 'Healthy' },
  { id: 'node-03', name: 'Node 03', host: 'localhost', port: 8003, address: 'localhost:8003', status: 'Healthy' },
  { id: 'node-04', name: 'Node 04', host: 'localhost', port: 8004, address: 'localhost:8004', status: 'Healthy' },
  { id: 'node-05', name: 'Node 05', host: 'localhost', port: 8005, address: 'localhost:8005', status: 'Healthy' },
];

export const REPLICATION_OPTIONS = ['1x', '2x', '3x', '4x', '5x'];

export const DURABILITY_OPTIONS = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Basic redundancy',
  },
  {
    id: 'high',
    label: 'High',
    description: 'Protection against node failure',
  },
  {
    id: 'maximum',
    label: 'Maximum',
    description: 'Highest data protection',
  },
];
