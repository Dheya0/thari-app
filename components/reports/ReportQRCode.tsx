import React, { useEffect, useState } from 'react';
import { generateQRCodeDataUrl } from '../../services/reports/reportFingerprint';

interface ReportQRCodeProps {
  payload: string;
  size?: number;
  reportId?: string;
  dataUrl?: string;
}

export const ReportQRCode: React.FC<ReportQRCodeProps> = ({
  payload,
  size = 72,
  reportId,
  dataUrl: initialDataUrl,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(initialDataUrl || null);

  useEffect(() => {
    let isMounted = true;
    if (!initialDataUrl && payload) {
      generateQRCodeDataUrl(payload).then(url => {
        if (isMounted) setDataUrl(url);
      });
    } else if (initialDataUrl) {
      setDataUrl(initialDataUrl);
    }
    return () => {
      isMounted = false;
    };
  }, [payload, initialDataUrl]);

  return (
    <div className="flex flex-col items-center justify-center p-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR Code for ${reportId || 'THARI Report'}`}
          style={{ width: size, height: size }}
          className="rounded-md"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="bg-slate-100 rounded-md flex items-center justify-center text-[8px] font-mono text-slate-400"
        >
          QR
        </div>
      )}
      <span className="text-[7.5px] font-mono font-bold text-slate-500 mt-1 tracking-tight">
        تحقق إلكتروني
      </span>
    </div>
  );
};
