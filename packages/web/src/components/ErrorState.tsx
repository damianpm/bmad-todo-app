interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state__title">Couldn&apos;t load your todos.</p>
      {message ? <p className="error-state__detail">{message}</p> : null}
      {onRetry ? (
        <button type="button" className="error-state__retry" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
