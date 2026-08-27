
/**
 * Generate a unique Report ID: THR-RPT-YYYYMMDD-XXXXXX
 */
export function generateReportId(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `THR-RPT-${y}${m}${d}-${randomSuffix}`;
}

/**
 * Computes an integrity fingerprint (e.g., 7E91-4A2C-93D1) from data summary
 */
export function computeReportFingerprint(inputString: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x55555555;

  for (let i = 0; i < inputString.length; i++) {
    const char = inputString.charCodeAt(i);
    hash1 = (hash1 ^ char) * 0x01000193;
    hash2 = (hash2 ^ (char << 5)) + (hash2 >> 2);
  }

  const part1 = (Math.abs(hash1) % 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const part2 = (Math.abs(hash2) % 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const part3 = (Math.abs(hash1 ^ hash2) % 0xffff).toString(16).toUpperCase().padStart(4, '0');

  return `${part1}-${part2}-${part3}`;
}

/**
 * Builds the structured QR Code payload
 */
export interface QRCodePayloadOptions {
  reportId: string;
  reportType: 'summary' | 'detailed';
  currencyScope: string;
  walletScope: string;
  txCount: number;
  generatedAtISO: string;
  fingerprint: string;
}

export function buildQRPayload(options: QRCodePayloadOptions): string {
  return JSON.stringify({
    app: 'THARI',
    reportId: options.reportId,
    reportType: options.reportType,
    currency: options.currencyScope,
    wallet: options.walletScope,
    txCount: options.txCount,
    generatedAt: options.generatedAtISO,
    fingerprint: options.fingerprint,
  });
}

/**
 * Generates an SVG or PNG data URL for the QR code
 */
export async function generateQRCodeDataUrl(payload: string): Promise<string> {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#0f172a', // Deep slate / navy
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Failed to generate QR Code Data URL:', error);
    return '';
  }
}
