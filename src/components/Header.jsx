export default function Header({ nodeCount = 5 }) {
  return (
    <header className="vault-header">
      <div className="header-brand">
        <h1 className="header-title">VAULT</h1>
        <p className="header-subtitle">Distributed Object Storage</p>
      </div>

      <div className="header-status">
        <span className="status-dot"></span>
        <span className="status-text">{nodeCount} Nodes</span>
      </div>
    </header>
  );
}
