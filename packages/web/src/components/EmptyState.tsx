export function EmptyState() {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state__title">Nothing here yet.</p>
      <p className="empty-state__hint">Add your first task above.</p>
    </div>
  );
}
