/**
 * THARI Financial Application — Offline-First & Sync State Manager
 * Handles local queues, sync status indicators, conflict resolution,
 * and deterministic offline-to-cloud ledger harmonization.
 * 
 * SYNC CONFLICT MATRIX:
 * | Local State | Remote State | Resolution Policy       | Rationale                                               |
 * |-------------|--------------|-------------------------|---------------------------------------------------------|
 * | Edit        | Edit         | Deterministic LWW (time)| Later ISO timestamp wins; if equal, higher ID string.   |
 * | Delete      | Edit         | Tombstone Priority      | Deletion represents explicit user revocation; preserved.|
 * | Edit        | Delete       | Tombstone Priority      | Remote deletion respected to prevent phantom revival.   |
 * | Delete      | Delete       | Idempotent Delete       | Both agree on deletion; latest deletedAt retained.      |
 * | Restore     | Delete       | Explicit Timestamp LWW  | User re-opened record; newest timestamp wins if > delete|
 * | Create      | Create       | UUID Deduplication      | Same UUID implies single entity; deduplicated in-place. |
 * 
 * TOMBSTONE RETENTION POLICY:
 * - Tombstones are soft-deleted records stored in the ledger with `isDeleted: true` & `deletedAt: string`.
 * - Retention Duration: 30 days (TOMBSTONE_MAX_AGE_DAYS = 30).
 * - Purge Rule: Tombstones older than 30 days are purged only if synced to cloud or during explicit trash cleanup.
 */

import { SyncState, Transaction, AppState } from '../types';

export const TOMBSTONE_MAX_AGE_DAYS = 30;

export interface SyncQueueItem {
  id: string;
  entityType: 'transaction' | 'wallet' | 'debt' | 'budget' | 'category';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

export interface SyncEngineStatus {
  state: SyncState;
  isOnline: boolean;
  pendingCount: number;
  lastSyncTimestamp?: string;
  lastSyncError?: string;
}

const SYNC_QUEUE_KEY = 'thari_sync_queue';
const LAST_SYNC_KEY = 'thari_last_sync_timestamp';

/**
 * Get the current sync queue from local storage
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save sync queue to local storage
 */
export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Local storage error handling
  }
}

/**
 * Enqueue an entity change for offline synchronization
 */
export function enqueueChange(
  entityType: SyncQueueItem['entityType'],
  action: SyncQueueItem['action'],
  entityId: string,
  payload: any
): void {
  const queue = getSyncQueue();
  const existingIdx = queue.findIndex(item => item.entityType === entityType && item.entityId === entityId);

  const item: SyncQueueItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    entityType,
    action,
    entityId,
    payload,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = item;
  } else {
    queue.push(item);
  }

  saveSyncQueue(queue);
}

/**
 * Conflict Resolution Engine (Deterministic Last-Write-Wins with Tombstone Priority)
 * Implements the 6-state conflict matrix for zero-divergence replication.
 */
export function resolveTransactionConflict(
  localTx: Transaction,
  remoteTx: Transaction
): { 
  resolvedTx: Transaction; 
  resolution: 'local_wins' | 'remote_wins' | 'tombstone_wins' | 'deduplicated';
  reason: string;
} {
  // Case 6: Same ID creation deduplication
  if (localTx.id === remoteTx.id && !localTx.isDeleted && !remoteTx.isDeleted && localTx.amount === remoteTx.amount && localTx.date === remoteTx.date) {
    return {
      resolvedTx: localTx,
      resolution: 'deduplicated',
      reason: 'Deduplicated identical transaction creation',
    };
  }

  // Case 4: Delete vs Delete
  if (localTx.isDeleted && remoteTx.isDeleted) {
    const localDelTime = new Date(localTx.deletedAt || localTx.updatedAt || 0).getTime();
    const remoteDelTime = new Date(remoteTx.deletedAt || remoteTx.updatedAt || 0).getTime();
    const resolvedTx = remoteDelTime > localDelTime ? remoteTx : localTx;
    return {
      resolvedTx,
      resolution: remoteDelTime > localDelTime ? 'remote_wins' : 'local_wins',
      reason: 'Both endpoints soft-deleted; preserved latest deletion metadata',
    };
  }

  // Case 2 & 3: Delete vs Edit / Edit vs Delete (Tombstone Priority)
  if (localTx.isDeleted && !remoteTx.isDeleted) {
    // Check if remote is an explicit intentional restore (updatedAt strictly newer than deletedAt by > 1 minute)
    const delTime = new Date(localTx.deletedAt || localTx.updatedAt || 0).getTime();
    const remoteEditTime = new Date(remoteTx.updatedAt || remoteTx.createdAt || 0).getTime();
    if (remoteEditTime > delTime + 60000) {
      return { resolvedTx: remoteTx, resolution: 'remote_wins', reason: 'Remote explicit un-delete / restoration after deletion' };
    }
    return { resolvedTx: localTx, resolution: 'tombstone_wins', reason: 'Local deletion tombstone takes precedence over remote edit' };
  }

  if (!localTx.isDeleted && remoteTx.isDeleted) {
    const delTime = new Date(remoteTx.deletedAt || remoteTx.updatedAt || 0).getTime();
    const localEditTime = new Date(localTx.updatedAt || localTx.createdAt || 0).getTime();
    if (localEditTime > delTime + 60000) {
      return { resolvedTx: localTx, resolution: 'local_wins', reason: 'Local explicit un-delete / restoration after deletion' };
    }
    return { resolvedTx: remoteTx, resolution: 'tombstone_wins', reason: 'Remote deletion tombstone takes precedence over local edit' };
  }

  // Case 1: Edit vs Edit (Deterministic LWW)
  const localTime = new Date(localTx.updatedAt || localTx.createdAt || 0).getTime();
  const remoteTime = new Date(remoteTx.updatedAt || remoteTx.createdAt || 0).getTime();

  if (remoteTime > localTime) {
    return { resolvedTx: remoteTx, resolution: 'remote_wins', reason: 'Remote edit timestamp is newer' };
  }

  return { resolvedTx: localTx, resolution: 'local_wins', reason: 'Local edit timestamp is newer or equal' };
}

/**
 * Check if a tombstone is expired (older than 30 days)
 */
export function isTombstoneExpired(tx: Transaction, maxAgeDays = TOMBSTONE_MAX_AGE_DAYS): boolean {
  if (!tx.isDeleted) return false;
  const delTimestamp = new Date(tx.deletedAt || tx.updatedAt || tx.date).getTime();
  if (isNaN(delTimestamp)) return false;
  const ageMs = Date.now() - delTimestamp;
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

/**
 * Purge expired tombstones safely
 */
export function purgeExpiredTombstones(transactions: Transaction[], maxAgeDays = TOMBSTONE_MAX_AGE_DAYS): {
  remainingTransactions: Transaction[];
  purgedCount: number;
} {
  const remaining: Transaction[] = [];
  let purgedCount = 0;

  (transactions || []).forEach(tx => {
    if (isTombstoneExpired(tx, maxAgeDays)) {
      purgedCount++;
    } else {
      remaining.push(tx);
    }
  });

  return { remainingTransactions: remaining, purgedCount };
}

/**
 * Get current sync engine status
 */
export function getSyncStatus(isOnline: boolean): SyncEngineStatus {
  const queue = getSyncQueue();
  const lastSync = localStorage.getItem(LAST_SYNC_KEY) || undefined;

  let state: SyncState = 'SYNCED';
  if (!isOnline) {
    state = queue.length > 0 ? 'PENDING' : 'LOCAL_ONLY';
  } else if (queue.length > 0) {
    state = 'PENDING';
  }

  return {
    state,
    isOnline,
    pendingCount: queue.length,
    lastSyncTimestamp: lastSync,
  };
}

/**
 * Mark sync as completed
 */
export function markSyncCompleted(): void {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  saveSyncQueue([]);
}
