import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { db, type SyncItem } from '../../services/offline/db';
import { recoverAsDraft } from '../../services/offline/recovery';
import { deleteRejected, retryItem } from '../../services/offline/syncManager';
import type { ScanCreate } from '../../types/api';
import { formatDateTime } from '../../utils/datetime';
import { readableField } from './readableField';

interface Row {
  id: number;
  item: SyncItem;
  body: ScanCreate | null;
}

// Reads the queue from IndexedDB every few seconds. Accepted (SENT) records are not shown.
function useQueueRows(): Row[] {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const items = (await db.sync_queue.toArray()).filter(
        (i): i is SyncItem & { id: number } => i.id !== undefined && i.status !== 'SENT',
      );
      const scans = await db.scans.bulkGet(items.map((i) => i.scanId));
      const next: Row[] = items.map((item, index) => ({ id: item.id, item, body: scans[index]?.body ?? null }));
      if (alive) setRows(next);
    };
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return rows;
}

function statusText(item: SyncItem): string {
  if (item.status === 'REJECTED') {
    switch (item.rejection?.kind) {
      case 'validation':
        return 'Not sent: some values need correction.';
      case 'conflict':
        return 'Not stored again: this scan ID was already saved with different values.';
      case 'local':
        return 'Not sent: the copy kept on this device is incomplete.';
      default:
        return `Not sent: the server refused it${item.rejection ? ` (HTTP ${item.rejection.statusCode})` : ''}.`;
    }
  }
  if (item.autoRetryPaused) return 'Paused after repeated failed attempts. The scan is kept on this device.';
  if (item.status === 'PENDING') return 'Waiting to send.';
  return 'Waiting to retry: the server or connection was unavailable. The scan is kept on this device.';
}

export function SyncPage() {
  const rows = useQueueRows();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshScreens = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['scans'] });
    void queryClient.invalidateQueries({ queryKey: ['scan'] });
    void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    void queryClient.invalidateQueries({ queryKey: ['measurements'] });
  };

  const act = async (id: number, action: () => Promise<void>) => {
    setBusyId(id);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'The action could not be completed. Nothing was deleted.');
    } finally {
      setBusyId(null);
    }
  };

  const onRetry = (id: number) =>
    act(id, async () => {
      const sent = await retryItem(id);
      if (sent > 0) refreshScreens();
    });

  const onEdit = (id: number) =>
    act(id, async () => {
      await recoverAsDraft(id);
      navigate('/scan');
    });

  const onDelete = (id: number) =>
    act(id, async () => {
      const removed = await deleteRejected(id);
      if (!removed) throw new Error('This record can no longer be deleted.');
      setConfirmId(null);
    });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Sync status</h1>
        <p className="text-sm text-text-secondary">
          Scans that are waiting to be sent or that the server did not accept. They stay on this device until they are sent
          or you delete them.
        </p>
      </header>

      {message ? (
        <p role="alert" className="text-sm text-accent-crimson">
          {message}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">Nothing is waiting. Every scan on this device has been accepted by the server.</p>
        </Card>
      ) : (
        rows.map(({ id, item, body }) => {
          const isRejected = item.status === 'REJECTED';
          const canRetry = !isRejected;
          const canEdit = isRejected && item.rejection?.kind === 'validation';
          const canDelete = isRejected;
          const busy = busyId === id;
          return (
            <Card key={id}>
              <p className="font-mono text-xs text-text-secondary">
                Scan {item.scanId.slice(0, 8)} · scan time {formatDateTime(body?.as_of ?? item.createdAt)}
              </p>
              <p className="mt-2 text-sm font-medium">{statusText(item)}</p>

              {item.rejection && item.rejection.details.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                  {item.rejection.details.map((d, i) => (
                    <li key={i}>
                      {readableField(d.field, body ?? undefined)}: {d.message}
                    </li>
                  ))}
                </ul>
              ) : null}

              {!isRejected && item.lastError ? (
                <p className="mt-2 text-xs text-text-secondary">Last error: {item.lastError}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {canRetry ? (
                  <Button variant="secondary" loading={busy} onClick={() => void onRetry(id)}>
                    Retry now
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button variant="primary" loading={busy} onClick={() => void onEdit(id)}>
                    Edit and resubmit
                  </Button>
                ) : null}
                {canDelete && confirmId !== id ? (
                  <Button variant="ghost" onClick={() => setConfirmId(id)}>
                    Delete
                  </Button>
                ) : null}
                {confirmId === id ? (
                  <>
                    <p className="w-full text-xs text-accent-amber">This removes the record from this device. It cannot be undone.</p>
                    <Button variant="destructive" loading={busy} onClick={() => void onDelete(id)}>
                      Confirm delete
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : null}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
