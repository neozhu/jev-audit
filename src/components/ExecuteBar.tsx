import React from 'react';
import { Play, AlertCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n/context';

interface Props {
  isLoading: boolean;
  loadingStep: string;
  error: string | null;
  onExecute: () => void;
  canExecute: boolean;
}

export const ExecuteBar: React.FC<Props> = ({
  isLoading,
  loadingStep,
  error,
  onExecute,
  canExecute,
}) => {
  const { lang, t } = useI18n();

  return (
    <div className="space-y-3">
      {/* Error alert if any */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{lang === 'zh' ? `评测异常: ${error}` : `Audit Error: ${error}`}</span>
          </div>
          <button
            onClick={onExecute}
            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 font-medium rounded-lg border border-rose-300 text-xs shrink-0 transition cursor-pointer"
          >
            {lang === 'zh' ? '重试' : 'Retry'}
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          <span>
            {isLoading ? (
              <span className="text-slate-800 font-medium flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                {loadingStep || t.execute.executing}
              </span>
            ) : (
              lang === 'zh'
                ? '就绪：输入基准底稿与回传件文本，AI 将智能甄别实质篡改与 OCR 噪声，判定是否可自动通过'
                : 'Ready: Input baseline draft & scanned copy. AI will detect substantive tampering vs OCR noise to decide auto-pass.'
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onExecute}
          disabled={!canExecute || isLoading}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-xs sm:text-sm text-white flex items-center justify-center gap-2 transition active:scale-[0.99] ${
            !canExecute || isLoading
              ? 'bg-slate-300 cursor-not-allowed shadow-none'
              : 'bg-slate-900 hover:bg-slate-800 shadow-xs cursor-pointer'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
              <span>{t.execute.auditing}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{t.execute.runAudit}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
