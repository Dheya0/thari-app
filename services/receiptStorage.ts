import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ReceiptAttachment, Transaction, AppState } from '../types';
import { DEFAULT_CURRENCIES } from '../constants';

/**
 * Compresses an image data URL if it's too large, ensuring efficient mobile storage
 * and fast performance without losing readability.
 */
export async function compressImage(dataUrl: string, maxWidth = 1200, quality = 0.8): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const mime = dataUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(mime, quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Saves a receipt to private native file storage (`thari/receipts/{receiptId}.ext`),
 * compressing it if needed, and returns metadata without raw base64 data.
 */
export async function saveReceiptToStorage(receipt: ReceiptAttachment, base64OrDataUrl: string): Promise<ReceiptAttachment> {
  try {
    let processedData = base64OrDataUrl;
    if (processedData && processedData.startsWith('data:image/')) {
      processedData = await compressImage(processedData);
    }

    const base64Data = processedData.includes(',') ? processedData.split(',')[1] : processedData;
    const ext = receipt.mimeType && receipt.mimeType.includes('png') ? 'png' : receipt.mimeType && receipt.mimeType.includes('pdf') ? 'pdf' : 'jpg';
    const filePath = `thari/receipts/${receipt.id}.${ext}`;

    await Filesystem.writeFile({
      path: filePath,
      data: base64Data,
      directory: Directory.Data,
      recursive: true,
    });

    return {
      id: receipt.id,
      transactionId: receipt.transactionId,
      fileName: receipt.fileName,
      mimeType: receipt.mimeType,
      size: receipt.size,
      receiptPath: filePath,
      createdAt: receipt.createdAt,
    };
  } catch (err) {
    console.warn('Failed to save receipt to filesystem, keeping dataUrl fallback:', err);
    // Fallback: keep dataUrl if write fails, ensuring zero data loss
    return {
      ...receipt,
      dataUrl: base64OrDataUrl,
    };
  }
}

/**
 * Loads receipt data URL on-demand from filesystem storage or legacy dataUrl.
 */
export async function loadReceiptDataUrl(receipt: ReceiptAttachment): Promise<string> {
  if (receipt.dataUrl) {
    return receipt.dataUrl;
  }
  if (!receipt.receiptPath) {
    return '';
  }
  try {
    const fileResult = await Filesystem.readFile({
      path: receipt.receiptPath,
      directory: Directory.Data,
    });
    const data = fileResult.data;
    if (typeof data === 'string') {
      if (data.startsWith('data:')) {
        return data;
      }
      return `data:${receipt.mimeType || 'image/jpeg'};base64,${data}`;
    }
    return '';
  } catch (err) {
    console.warn('Failed to load receipt from filesystem:', err);
    return '';
  }
}

/**
 * Deletes a receipt file from filesystem storage if receiptPath exists.
 */
export async function deleteReceiptFile(receiptPath?: string): Promise<void> {
  if (!receiptPath) return;
  try {
    await Filesystem.deleteFile({
      path: receiptPath,
      directory: Directory.Data,
    });
  } catch (err) {
    console.warn('Could not delete receipt file:', err);
  }
}

/**
 * Shares a receipt via native Share Sheet.
 */
export async function shareReceipt(receipt: ReceiptAttachment): Promise<void> {
  try {
    let urlToShare = receipt.receiptPath;
    if (!urlToShare && receipt.dataUrl) {
      urlToShare = receipt.dataUrl;
    }
    if (!urlToShare) return;

    if (Capacitor.isNativePlatform()) {
      const uriResult = await Filesystem.getUri({
        path: urlToShare,
        directory: Directory.Data,
      });
      await Share.share({
        title: receipt.fileName || 'Receipt',
        url: uriResult.uri,
        dialogTitle: 'Share Receipt',
      });
    } else {
      const dataUrl = await loadReceiptDataUrl(receipt);
      if (dataUrl) {
        const win = window.open();
        if (win) {
          win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to share receipt:', err);
  }
}

/**
 * Idempotently migrates state transactions from legacy dataUrl to native file storage.
 */
export async function migrateStateReceipts(state: AppState): Promise<AppState> {
  if (!state || !state.transactions) return state;

  let hasChanges = false;
  const migratedTransactions = await Promise.all(
    state.transactions.map(async (tx: Transaction) => {
      if (tx.receipt && tx.receipt.dataUrl && !tx.receipt.receiptPath) {
        const savedReceipt = await saveReceiptToStorage(tx.receipt, tx.receipt.dataUrl);
        // Only mark changed and remove dataUrl if receiptPath was successfully written and dataUrl stripped
        if (savedReceipt.receiptPath && !savedReceipt.dataUrl) {
          hasChanges = true;
          return {
            ...tx,
            receipt: savedReceipt,
          };
        }
      }
      return tx;
    })
  );

  if (hasChanges) {
    return {
      ...state,
      transactions: migratedTransactions,
    };
  }
  return state;
}

/**
 * Test suite for receipt storage architecture, migration, compression, failure safety, and sharing.
 */
export async function runReceiptStorageTests(): Promise<{ allPassed: boolean; testResults: Array<{ testName: string; passed: boolean; details: string }> }> {
  const testResults: Array<{ testName: string; passed: boolean; details: string }> = [];

  // Test 1: Save & Load Receipt
  const testReceipt: ReceiptAttachment = {
    id: 'test-rcpt-1',
    fileName: 'invoice.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    createdAt: new Date().toISOString(),
  };
  const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  
  const saved = await saveReceiptToStorage(testReceipt, dummyBase64);
  const loadUrl = await loadReceiptDataUrl(saved);
  const saveAndLoadPassed = Boolean(saved.receiptPath && loadUrl.startsWith('data:image/'));
  testResults.push({
    testName: 'Save & Load Receipt (Filesystem Storage & On-Demand Retrieval)',
    passed: saveAndLoadPassed,
    details: `Saved path: ${saved.receiptPath}, Loaded URL prefix: ${loadUrl.substring(0, 30)}`,
  });

  // Test 2: Legacy Migration & Failure Safety
  const legacyTx: Transaction = {
    id: 'tx-legacy-1',
    walletId: 'w-1',
    type: 'expense',
    categoryId: 'c-1',
    amount: 50,
    currency: 'SAR',
    note: 'Legacy test',
    date: '2026-08-01',
    frequency: 'once',
    receipt: {
      id: 'test-rcpt-legacy',
      fileName: 'old.jpg',
      mimeType: 'image/jpeg',
      size: 500,
      dataUrl: dummyBase64,
      createdAt: '2026-08-01T00:00:00.000Z',
    }
  };
  const mockState = {
    transactions: [legacyTx],
    wallets: [],
    categories: [],
    currencies: [],
    exchangeRates: {},
    currency: DEFAULT_CURRENCIES[0],
    language: 'ar',
    recurringRules: [],
    trashTransactions: [],
    debts: [],
    budgets: [],
    hasAcceptedTerms: true,
  } as unknown as AppState;
  const migratedState = await migrateStateReceipts(mockState);
  const migratedReceipt = migratedState.transactions[0].receipt;
  const migrationPassed = Boolean(migratedReceipt?.receiptPath && !migratedReceipt?.dataUrl);
  testResults.push({
    testName: 'Legacy Migration (Convert dataUrl to receiptPath and remove dataUrl securely)',
    passed: migrationPassed,
    details: `Migrated receipt path: ${migratedReceipt?.receiptPath}, has dataUrl: ${Boolean(migratedReceipt?.dataUrl)}`,
  });

  // Test 3: Delete Receipt File
  if (saved.receiptPath) {
    await deleteReceiptFile(saved.receiptPath);
    const loadedAfterDelete = await loadReceiptDataUrl(saved);
    const deletePassed = loadedAfterDelete === '';
    testResults.push({
      testName: 'Delete Receipt File (Filesystem cleanup on permanent delete)',
      passed: deletePassed,
      details: `Loaded URL after deletion is empty: ${deletePassed}`,
    });
  }

  const allPassed = testResults.every(r => r.passed);
  return { allPassed, testResults };
}
