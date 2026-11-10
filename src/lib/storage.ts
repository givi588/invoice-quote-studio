import {
  STORAGE_KEY, createExampleDocument, normalizeDraft,
  type InvoiceDraft,
} from './invoice.ts';

// Browser Storage and in-memory test doubles both implement this small contract.
export type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface DraftLoadResult {
  document: InvoiceDraft;
  blocked: boolean;
  message: string;
}

export function loadSavedDraft(storage: StorageAdapter): DraftLoadResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { document: createExampleDocument(), blocked: false, message: '' };
    return { document: normalizeDraft(JSON.parse(raw)), blocked: false, message: '' };
  } catch {
    return {
      document: createExampleDocument(),
      blocked: true,
      message: 'An existing saved draft could not be read. It has NOT been replaced. Export a copy using your browser tools before choosing to discard it.',
    };
  }
}

export function saveDraft(storage: StorageAdapter, document: InvoiceDraft): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeDraft(document)));
}

export function removeSavedDraft(storage: StorageAdapter): void {
  storage.removeItem(STORAGE_KEY);
}
