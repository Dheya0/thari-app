import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Thari App Uncaught Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center z-[9999]">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">حدث تعذر بسيط في تحميل الواجهة</h2>
          <p className="text-xs text-slate-400 font-bold max-w-sm mb-6 leading-relaxed">
            تم رصد خطأ برمجي غير متوقع. يمكنك إعادة تشغيل التطبيق أو إصلاح الذاكرة المؤقتة.
          </p>

          {this.state.error && (
            <div className="bg-slate-900 border border-white/10 p-3 rounded-xl text-[11px] text-rose-400 font-mono max-w-md w-full mb-6 overflow-x-auto text-left dir-ltr">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <RefreshCw size={15} />
              <span>إعادة تشغيل التطبيق</span>
            </button>
            <button
              onClick={this.handleResetData}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
            >
              <Trash2 size={15} />
              <span>إصلاح الذاكرة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
