import { useVault } from '../context/VaultContext';

export default function SystemActivity() {
  const { activities } = useVault();

  // Show up to 8 recent activity events
  const displayedActivities = activities.slice(0, 8);

  return (
    <section className="system-activity-section">
      <div className="section-header-block">
        <h2 className="section-heading">System Activity</h2>
      </div>

      <div className="activity-timeline-list">
        {displayedActivities.map((act) => (
          <div key={act.id} className={`activity-item type-${act.type}`}>
            <div className="activity-left">
              <span className={`activity-icon-badge badge-icon-${act.type}`}>
                {act.icon}
              </span>
              <span className="activity-time font-mono">{act.time}</span>
            </div>

            <div className="activity-content">
              <div className="activity-title-row">
                <span className="activity-title">{act.title}</span>
                {act.statusTag && (
                  <span className={`activity-tag tag-type-${act.type}`}>
                    {act.statusTag}
                  </span>
                )}
              </div>
              <p className="activity-description">{act.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
