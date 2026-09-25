export default function EventLog({ events = [] }) {
  // Show at most 5 events
  const displayedEvents = events.slice(0, 5);

  return (
    <section className="event-log-section">
      <h3 className="event-log-heading">Recent Events</h3>
      <div className="event-log-list">
        {displayedEvents.map((evt) => (
          <div key={evt.id} className="event-log-row">
            <span className="event-time font-mono">{evt.time}</span>
            <span className="event-message">{evt.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
