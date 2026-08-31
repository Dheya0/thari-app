import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ReceiptAttachment, Transaction, AppState } from '../types';

export async function saveReceiptToStorage(receipt: ReceiptAttachment, base64OrDataUrl: string): Promise<ReceiptAttachment> {
  try {
    const base64Data = base64OrDataUrl.includes(',') ? base64OrDataUrl.split(',')[1] : base64OrDataUrl;
    const ext = receipt.mimeType && receipt.mimeType.includes('png') ? 'png' : receipt.mimeType && receipt.mimeType.includes('pdf') ? 'pdf' : 'jpg';
    const filePath = `receipts/${receipt.id}.${ext}`;

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
    return receipt;
  }
}

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

export async function migrateStateReceipts(state: AppState): Promise<AppState> {
  if (!state || !state.transactions) return state;

  let hasChanges = false;
  const migratedTransactions = await Promise.all(
    state.transactions.map(async (tx: Transaction) => {
      if (tx.receipt && tx.receipt.dataUrl && !tx.receipt.receiptPath) {
        hasChanges = true;
        const savedReceipt = await saveReceiptToStorage(tx.receipt, tx.receipt.dataUrl);
        return {
          ...tx,
          receipt: savedReceipt,
        };
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
