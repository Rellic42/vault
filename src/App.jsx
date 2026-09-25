import { useState, useEffect } from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import Header from './components/Header';
import ClusterStatus from './components/ClusterStatus';
import RepairCard from './components/RepairCard';
import UploadBox from './components/UploadBox';
import ReplicationSelector from './components/ReplicationSelector';
import DurabilitySelector from './components/DurabilitySelector';
import NodeList from './components/NodeList';
import ObjectsTable from './components/ObjectsTable';
import ObjectDrawer from './components/ObjectDrawer';
import SystemActivity from './components/SystemActivity';
import NodePage from './pages/NodePage';
import './App.css';

function MainDashboard({ onOpenNode }) {
  const { storeObject } = useVault();
  const [file, setFile] = useState({
    name: 'dataset.zip',
    size: '2.4 GB',
  });
  const [replication, setReplication] = useState('3x');
  const [durability, setDurability] = useState('high');
  const [selectedDrawerObject, setSelectedDrawerObject] = useState(null);
  const [notification, setNotification] = useState(null);

  const handleStore = () => {
    storeObject(file, replication, durability);
    setNotification('Demo upload complete · Replicas created');
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <div className="vault-app">
      <Header nodeCount={5} />

      <main className="vault-main">
        <ClusterStatus />

        <RepairCard />

        <section className="store-panel">
          <UploadBox file={file} onFileSelect={setFile} />

          <div className="configuration-panel">
            <ReplicationSelector
              value={replication}
              onChange={setReplication}
            />

            <DurabilitySelector
              value={durability}
              onChange={setDurability}
            />

            <div className="action-area">
              <button
                type="button"
                className="store-btn"
                onClick={handleStore}
              >
                Store Object
              </button>

              {notification && (
                <div className="success-badge">
                  <span className="success-icon">✓</span>
                  <span>{notification}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <NodeList onOpenNode={onOpenNode} />

        <ObjectsTable onSelectObject={(obj) => setSelectedDrawerObject(obj)} />

        <SystemActivity />
      </main>

      {selectedDrawerObject && (
        <ObjectDrawer
          object={selectedDrawerObject}
          onClose={() => setSelectedDrawerObject(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return { view: 'dashboard', nodeId: 'node-01' };
    }
    const params = new URLSearchParams(window.location.search);
    const nodeParam = params.get('node');
    const viewParam = params.get('view');

    if (nodeParam) {
      return { view: 'node', nodeId: nodeParam };
    }
    if (viewParam === 'node') {
      return { view: 'node', nodeId: 'node-01' };
    }
    return { view: 'dashboard', nodeId: 'node-01' };
  };

  const [current, setCurrent] = useState(getInitialState);

  useEffect(() => {
    const handlePopState = () => {
      setCurrent(getInitialState());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToNode = (id) => {
    const url = new URL(window.location.href);
    url.searchParams.set('node', id);
    url.searchParams.delete('view');
    window.history.pushState({}, '', url);
    setCurrent({ view: 'node', nodeId: id });
  };

  const navigateToDashboard = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('node');
    url.searchParams.set('view', 'dashboard');
    window.history.pushState({}, '', url);
    setCurrent({ view: 'dashboard', nodeId: 'node-01' });
  };

  return (
    <VaultProvider>
      {current.view === 'node' ? (
        <NodePage
          nodeId={current.nodeId}
          onSelectNode={navigateToNode}
          onBackToDashboard={navigateToDashboard}
        />
      ) : (
        <MainDashboard onOpenNode={navigateToNode} />
      )}
    </VaultProvider>
  );
}
