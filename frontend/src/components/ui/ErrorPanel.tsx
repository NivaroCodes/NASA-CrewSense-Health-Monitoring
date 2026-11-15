import { ApiError } from '../../services/api/client';
import { Button } from './Button';
import { Card } from './Card';

// Error text distinguishes "the server could not be reached" from "the server rejected the request".
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkFailure) return 'The backend could not be reached. Check that it is running.';
    return `${error.message} (${error.code}, status ${error.status})`;
  }
  return 'An unexpected error occurred.';
}

export function ErrorPanel({ title, error, onRetry }: { title: string; error: unknown; onRetry?: () => void }) {
  return (
    <Card>
      <p className="text-sm font-semibold">{title}</p>
      <p role="alert" className="mt-1 text-sm text-text-secondary">
        {describeError(error)}
      </p>
      {onRetry ? (
        <div className="mt-3">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
