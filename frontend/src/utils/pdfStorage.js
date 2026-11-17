/**
 * Client-Side Persistence Engine using Browser IndexedDB
 * 
 * Stores batch metadata, individual card PDFs, and batch ZIPs directly
 * in the user's browser. Persists indefinitely without using any server disk.
 */

const DB_NAME = 'BadsaraWeddingStudioDB';
const DB_VERSION = 1;
const STORE_BATCHES = 'batches';
const STORE_FILES = 'files';

let dbPromise = null;

export function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Batches store: stores batch objects
      if (!db.objectStoreNames.contains(STORE_BATCHES)) {
        const batchStore = db.createObjectStore(STORE_BATCHES, { keyPath: 'id' });
        batchStore.createIndex('project_id', 'project_id', { unique: false });
        batchStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Files store: stores binary PDF and ZIP blobs
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        const fileStore = db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        fileStore.createIndex('batch_id', 'batch_id', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

/**
 * Save or update a batch record in IndexedDB
 */
export async function saveBatchToStorage(batch) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BATCHES, 'readwrite');
      const store = tx.objectStore(STORE_BATCHES);
      store.put(batch);
      tx.oncomplete = () => resolve(batch);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[pdfStorage] saveBatchToStorage error:', err);
  }
}

/**
 * Retrieve all cached batches for a specific project
 */
export async function getBatchesFromStorage(projectId) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BATCHES, 'readonly');
      const store = tx.objectStore(STORE_BATCHES);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result || [];
        const filtered = projectId ? all.filter((b) => b.project === projectId || b.project_id === projectId) : all;
        // Sort newest first
        filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[pdfStorage] getBatchesFromStorage error:', err);
    return [];
  }
}

/**
 * Save a binary file (PDF or ZIP Blob) into IndexedDB
 */
export async function saveFileToStorage(fileKey, batchId, blob, filename, mimeType) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const record = {
        id: fileKey,
        batch_id: batchId,
        blob,
        filename: filename || fileKey,
        mimeType: mimeType || blob.type || 'application/octet-stream',
        size: blob.size,
        timestamp: Date.now(),
      };
      store.put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[pdfStorage] saveFileToStorage error:', err);
  }
}

/**
 * Get a cached file record by key
 */
export async function getFileFromStorage(fileKey) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(fileKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[pdfStorage] getFileFromStorage error:', err);
    return null;
  }
}

/**
 * Delete a batch and all associated cached files from IndexedDB
 */
export async function deleteBatchFromStorage(batchId) {
  try {
    const db = await openDatabase();
    // 1. Delete batch entry
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BATCHES, 'readwrite');
      tx.objectStore(STORE_BATCHES).delete(batchId);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    // 2. Delete all files matching this batch_id
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const index = store.index('batch_id');
    const req = index.getAllKeys(batchId);

    req.onsuccess = () => {
      const keys = req.result || [];
      for (const k of keys) {
        store.delete(k);
      }
    };
  } catch (err) {
    console.warn('[pdfStorage] deleteBatchFromStorage error:', err);
  }
}

/**
 * Delete an individual card from storage and update batch
 */
export async function deleteCardFromStorage(cardId, batchId) {
  try {
    const db = await openDatabase();
    // 1. Delete card file
    const txFile = db.transaction(STORE_FILES, 'readwrite');
    txFile.objectStore(STORE_FILES).delete(`card_${cardId}`);

    // 2. Update cached batch cards list if present
    if (batchId) {
      const txBatch = db.transaction(STORE_BATCHES, 'readwrite');
      const store = txBatch.objectStore(STORE_BATCHES);
      const getReq = store.get(batchId);
      getReq.onsuccess = () => {
        const batch = getReq.result;
        if (batch && Array.isArray(batch.cards)) {
          batch.cards = batch.cards.filter((c) => c.id !== cardId);
          batch.total_guests = batch.cards.length;
          batch.processed_guests = batch.cards.length;
          store.put(batch);
        }
      };
    }
  } catch (err) {
    console.warn('[pdfStorage] deleteCardFromStorage error:', err);
  }
}

/**
 * Background worker to fetch and cache all completed PDFs and ZIP for a batch
 */
export async function cacheBatchArtifacts(batch, formatMediaUrl) {
  if (!batch || batch.status !== 'COMPLETED') return;

  try {
    // 1. Cache Batch ZIP if available
    if (batch.zip_url) {
      const zipKey = `zip_${batch.id}`;
      const existingZip = await getFileFromStorage(zipKey);
      if (!existingZip) {
        const fullZipUrl = formatMediaUrl(batch.zip_url);
        try {
          const res = await fetch(fullZipUrl);
          if (res.ok) {
            const blob = await res.blob();
            const cleanName = (batch.batch_name || 'Cards').replace(/\s+/g, '_');
            await saveFileToStorage(
              zipKey,
              batch.id,
              blob,
              `Batch_${batch.batch_number}_${cleanName}.zip`,
              'application/zip'
            );
          }
        } catch (e) {
          console.warn('[pdfStorage] Failed to cache ZIP:', e);
        }
      }
    }

    // 2. Cache Individual Card PDFs
    if (Array.isArray(batch.cards)) {
      for (const card of batch.cards) {
        if (!card.download_url) continue;
        const cardKey = `card_${card.id}`;
        const existingCard = await getFileFromStorage(cardKey);
        if (!existingCard) {
          const fullCardUrl = formatMediaUrl(card.download_url);
          try {
            const res = await fetch(fullCardUrl);
            if (res.ok) {
              const blob = await res.blob();
              const safeName = (card.guest_name || 'Card').replace(/[\s\/\\]+/g, '_');
              await saveFileToStorage(
                cardKey,
                batch.id,
                blob,
                `${String(card.card_number || 1).padStart(3, '0')}_${safeName}.pdf`,
                'application/pdf'
              );
            }
          } catch (e) {
            console.warn(`[pdfStorage] Failed to cache card ${card.id}:`, e);
          }
        }
      }
    }

    // 3. Mark batch as cached and save
    const updatedBatch = { ...batch, is_cached_locally: true };
    await saveBatchToStorage(updatedBatch);
  } catch (err) {
    console.warn('[pdfStorage] cacheBatchArtifacts error:', err);
  }
}

/**
 * Triggers a browser file download from a Blob
 */
export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename || 'download.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Opens a PDF Blob in a new browser tab for viewing or printing
 */
export function openBlobInTab(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

/**
 * Download or View a Card PDF from Cache (with network fallback)
 */
export async function downloadOrViewCard(card, fallbackUrl, mode = 'open') {
  const cardKey = `card_${card.id}`;
  const safeName = `${String(card.card_number || 1).padStart(3, '0')}_${(card.guest_name || 'Card').replace(/[\s\/\\]+/g, '_')}.pdf`;

  // 1. Try from IndexedDB Cache first
  const cached = await getFileFromStorage(cardKey);
  if (cached && cached.blob) {
    if (mode === 'download') {
      triggerBlobDownload(cached.blob, safeName);
    } else {
      openBlobInTab(cached.blob);
    }
    return;
  }

  // 2. If not cached, fetch from network, cache it, and open/download
  if (fallbackUrl) {
    try {
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        const blob = await res.blob();
        // Save to cache for next time
        saveFileToStorage(cardKey, card.batch || card.batch_id, blob, safeName, 'application/pdf');
        if (mode === 'download') {
          triggerBlobDownload(blob, safeName);
        } else {
          openBlobInTab(blob);
        }
        return;
      }
    } catch (e) {
      console.warn('[pdfStorage] Network fetch failed, falling back to direct URL link:', e);
    }

    // Direct window.open fallback
    window.open(fallbackUrl, '_blank');
  }
}

/**
 * Download Batch ZIP Archive from Cache (with network fallback)
 */
export async function downloadBatchZipArchive(batch, fallbackUrl) {
  const zipKey = `zip_${batch.id}`;
  const cleanName = (batch.batch_name || 'Cards').replace(/\s+/g, '_');
  const filename = `Batch_${batch.batch_number}_${cleanName}.zip`;

  // 1. Try from IndexedDB Cache first
  const cached = await getFileFromStorage(zipKey);
  if (cached && cached.blob) {
    triggerBlobDownload(cached.blob, filename);
    return;
  }

  // 2. Fetch from network, cache it, and download
  if (fallbackUrl) {
    try {
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        const blob = await res.blob();
        saveFileToStorage(zipKey, batch.id, blob, filename, 'application/zip');
        triggerBlobDownload(blob, filename);
        return;
      }
    } catch (e) {
      console.warn('[pdfStorage] Network ZIP fetch failed, falling back to direct link:', e);
    }

    // Direct link fallback
    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
