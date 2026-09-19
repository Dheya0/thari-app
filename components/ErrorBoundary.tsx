import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  exportSuccess: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    exportSuccess: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, exportSuccess: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Thari App Uncaught Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleEmergencyExport = () => {
    try {
      const dump: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('thari') || key.startsWith('_thari'))) {
          dump[key] = localStorage.getItem(key);
        }
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dump, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `thari_emergency_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      this.setState({ exportSuccess: true });
    } catch (e) {
      console.error('Emergency export failed:', e);
    }
  };

  private handleSafeReset = () => {
    if (window.confirm('هل تريد مسح ذاكرة التخزين المؤقتة وإعادة تشغيل التطبيق؟ لن يؤثر ذلك إذا قمت بتصدير نسخة احتياطية أولاً.')) {
      try {
        sessionStorage.clear();
        localStorage.removeItem('thari_bg_ts');
      } catch (e) {}
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] flex flex-col items-center justify-center p-6 text-center z-[9999]">
          <div className="w-16 h-16 rounded-2xl bg-[#D9B978]/10 border border-[#D9B978]/25 text-[#D9B978] flex items-center justify-center mb-4 shadow-lg shadow-[#D9B978]/5">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#F4F1EA] mb-2">تعذر غير متوقع في تحميل الواجهة</h2>
          <p className="text-xs text-slate-400 font-medium max-w-sm mb-5 leading-relaxed">
            تم رصد حالة استثنائية. بياناتك محفوظة بأمان تام في جهازك، ويمكنك تنزيل نسخة طارئة أو إعادة التشغيل.
          </p>

          {this.state.error && (
            <div className="bg-[#12161C] border border-white/[0.08] p-3.5 rounded-xl text-[11px] text-amber-400/90 font-mono max-w-md w-full mb-6 overflow-x-auto text-left dir-ltr custom-scrollbar max-h-32">
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full bg-[#D9B978] hover:bg-[#E5C98D] text-[#0A0D10] font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-[#D9B978]/15"
            >
              <RefreshCw size={15} />
              <span>إعادة تشغيل التطبيق</span>
            </button>

            <button
              onClick={this.handleEmergencyExport}
              className="w-full bg-[#171D24] hover:bg-[#1E252E] text-[#D9B978] font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border border-[#D9B978]/25"
            >
              <Download size={15} />
              <span>{this.state.exportSuccess ? 'تم تنزيل النسخة الطارئة بنجاح' : 'تنزيل نسخة احتياطية طارئة'}</span>
            </button>

            <button
              onClick={this.handleSafeReset}
              className="w-full bg-transparent hover:bg-white/[0.04] text-slate-400 font-medium py-2.5 px-4 rounded-xl text-[11px] flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw size={13} />
              <span>مسح الكاش والمحاولة مجدداً</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
