import React, { useEffect, useMemo, useState } from 'react';
import { Category, Currency, Transaction, Wallet } from '../types';
import { generateFinancialReportSync } from '../services/reports/reportService';
import { generateQRCodeDataUrl } from '../services/reports/reportFingerprint';
import { FinancialReportDocument } from './reports/FinancialReportDocument';
import { ReportModel } from '../services/reports/reportTypes';

export interface FinancialReportProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
  userName?: string;
  wallets: Wallet[];
  type?: 'summary' | 'detailed';
  exchangeRates?: Record<string, number>;
  filterWalletId?: string | null;
  filterCurrency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  transactions,
  categories,
  currency,
  userName = 'مستخدم ثري',
  wallets,
  type = 'detailed',
  exchangeRates = {},
  filterWalletId = null,
  filterCurrency = null,
  startDate = null,
  endDate = null,
}) => {
  // Generate the snapshot report model
  const baseModel = useMemo(() => {
    return generateFinancialReportSync({
      transactions,
      categories,
      wallets,
      userName,
      baseCurrencyCode: currency?.code || 'SAR',
      exchangeRates,
      params: {
        type,
        walletId: filterWalletId,
        currencyCode: filterCurrency,
        startDate,
        endDate,
        targetCurrencyCode: currency?.code || 'SAR',
      },
    });
  }, [
    transactions,
    categories,
    wallets,
    userName,
    currency?.code,
    exchangeRates,
    type,
    filterWalletId,
    filterCurrency,
    startDate,
    endDate,
  ]);

  const [reportModel, setReportModel] = useState<ReportModel>(baseModel);

  // Asynchronously generate QR Code Data URL when payload changes
  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataUrl(baseModel.metadata.qrPayload).then((dataUrl) => {
      if (isMounted && dataUrl) {
        setReportModel((prev) => ({
          ...baseModel,
          metadata: {
            ...baseModel.metadata,
            qrDataUrl: dataUrl,
          },
        }));
      } else if (isMounted) {
        setReportModel(baseModel);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [baseModel]);

  return (
    <div className="hidden print:block print:w-full print:m-0 print:p-0 print:bg-white text-slate-900">
      <FinancialReportDocument model={reportModel} />
    </div>
  );
};

export default FinancialReport;
