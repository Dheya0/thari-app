import React from 'react';
import { Wallet as WalletIcon, Coins, Calendar, FileText } from 'lucide-react';
import { ReportScopeInfo } from '../../services/reports/reportTypes';

interface ReportScopeHeaderProps {
  scope: ReportScopeInfo;
  totalTransactions?: number;
  className?: string;
}

export const ReportScopeHeader: React.FC<ReportScopeHeaderProps> = ({
  scope,
  totalTransactions,
  className = '',
}) => {
  const { selectedWallets = [], currenciesInScope = [], isAllWallets, baseCurrency } = scope;

  return (
    <div className={`bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 ${className}`}>
      {/* Top Row: Selected Wallets Badges */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <WalletIcon size={12} className="text-amber-600" />
            <span>نطاق المحافظ المحددة بالتقرير</span>
          </span>
          <span className="text-[10px] font-bold text-slate-500 font-mono">
            {isAllWallets
              ? `كافة المحافظ (${selectedWallets.length})`
              : `${selectedWallets.length} محافظ مختارة`}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedWallets.map((w) => (
            <div
              key={w.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-bold shadow-2xs"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: w.color || '#D9B978' }}
              />
              <span className="truncate max-w-[140px]">{w.name}</span>
              <span className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {w.currencyCode}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Row: Currencies & Operating Scope */}
      <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Currencies in scope */}
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Coins size={12} className="text-emerald-600" />
            <span>العملات المعتمدة بالحسابات</span>
          </span>
          <div className="flex flex-wrap gap-1 items-center">
            {currenciesInScope.map((c) => (
              <span
                key={c.code}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-[11px] font-bold"
              >
                <span>{c.code}</span>
                <span className="text-[9px] text-emerald-700">({c.symbol})</span>
              </span>
            ))}
            {!scope.currencyFilter && currenciesInScope.length > 1 && (
              <span className="text-[10px] font-medium text-slate-500 self-center">
                • تقييم موحد بـ <b className="text-slate-800">{baseCurrency.code}</b>
              </span>
            )}
          </div>
        </div>

        {/* Period */}
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Calendar size={12} className="text-sky-600" />
            <span>الفترة الزمنية</span>
          </span>
          <p className="font-bold text-slate-900 text-xs truncate" title={scope.periodLabelAr}>
            {scope.periodLabelAr}
          </p>
        </div>

        {/* Transaction Count */}
        {totalTransactions !== undefined && (
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <FileText size={12} className="text-slate-600" />
              <span>إجمالي الحركات المحاسبية</span>
            </span>
            <p className="font-bold text-slate-900 text-xs">
              {totalTransactions} حركة مسجلة
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
