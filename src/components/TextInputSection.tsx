import React, { useRef } from 'react';
import { ArrowRightLeft, Upload, Trash2, Copy, Check } from 'lucide-react';
import { useI18n } from '../i18n/context';

interface Props {
  titleA: string;
  setTitleA: (title: string) => void;
  textA: string;
  setTextA: (text: string) => void;
  titleB: string;
  setTitleB: (title: string) => void;
  textB: string;
  setTextB: (text: string) => void;
  onSwap: () => void;
}

export const TextInputSection: React.FC<Props> = ({
  titleA,
  setTitleA,
  textA,
  setTextA,
  titleB,
  setTitleB,
  textB,
  setTextB,
  onSwap,
}) => {
  const { lang, t } = useI18n();
  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);
  const [copiedA, setCopiedA] = React.useState(false);
  const [copiedB, setCopiedB] = React.useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (target === 'A') setTextA(content || '');
      else setTextB(content || '');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopy = (text: string, target: 'A' | 'B') => {
    navigator.clipboard.writeText(text);
    if (target === 'A') {
      setCopiedA(true);
      setTimeout(() => setCopiedA(false), 1500);
    } else {
      setCopiedB(true);
      setTimeout(() => setCopiedB(false), 1500);
    }
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
        {/* Swap Button In-Between */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            onClick={onSwap}
            title={t.input.swapTooltip}
            className="w-8 h-8 rounded-full bg-white border border-slate-300 shadow-xs text-slate-500 hover:text-slate-900 hover:border-slate-400 transition flex items-center justify-center cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Box A */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-colors focus-within:border-slate-400">
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 mr-2">
              <span className="text-xs font-semibold text-slate-700">A</span>
              <input
                type="text"
                value={titleA}
                onChange={(e) => setTitleA(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent hover:bg-slate-200/40 focus:bg-white px-1.5 py-0.5 rounded border border-transparent focus:border-slate-300 focus:outline-none w-full max-w-[220px]"
                placeholder={t.input.titleA}
              />
              <span className="text-[11px] text-slate-400 font-mono">
                {textA.length} {t.input.chars}
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <button
                type="button"
                onClick={() => fileInputRefA.current?.click()}
                className="p-1 hover:text-slate-800 hover:bg-slate-200/50 rounded transition cursor-pointer"
                title={`${t.input.importTxt} (.txt, .md, .json)`}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRefA}
                accept=".txt,.md,.json,.csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'A')}
              />

              <button
                type="button"
                onClick={() => handleCopy(textA, 'A')}
                className="p-1 hover:text-slate-800 hover:bg-slate-200/50 rounded transition cursor-pointer"
                title={t.common.copy}
              >
                {copiedA ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTextA('')}
                className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                title={t.common.clear}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            <textarea
              rows={9}
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              placeholder={
                lang === 'zh'
                  ? '在此粘贴或导入【原始基准合同】电子底稿 (例如：我方法务审核通过的标准合同正本、电子签约底稿)...'
                  : 'Paste or import original baseline contract draft here (e.g. approved standard contract, digital master draft)...'
              }
              className="w-full h-full p-3.5 text-xs sm:text-sm text-slate-800 bg-transparent resize-y font-mono focus:outline-none placeholder:text-slate-400 leading-relaxed"
            />
          </div>
        </div>

        {/* Text Box B */}
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-colors focus-within:border-slate-400">
          <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 mr-2">
              <span className="text-xs font-semibold text-slate-700">B</span>
              <input
                type="text"
                value={titleB}
                onChange={(e) => setTitleB(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent hover:bg-slate-200/40 focus:bg-white px-1.5 py-0.5 rounded border border-transparent focus:border-slate-300 focus:outline-none w-full max-w-[220px]"
                placeholder={t.input.titleB}
              />
              <span className="text-[11px] text-slate-400 font-mono">
                {textB.length} {t.input.chars}
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <button
                type="button"
                onClick={() => fileInputRefB.current?.click()}
                className="p-1 hover:text-slate-800 hover:bg-slate-200/50 rounded transition cursor-pointer"
                title={`${t.input.importTxt} (.txt, .md, .json)`}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRefB}
                accept=".txt,.md,.json,.csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'B')}
              />

              <button
                type="button"
                onClick={() => handleCopy(textB, 'B')}
                className="p-1 hover:text-slate-800 hover:bg-slate-200/50 rounded transition cursor-pointer"
                title={t.common.copy}
              >
                {copiedB ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setTextB('')}
                className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                title={t.common.clear}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            <textarea
              rows={9}
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              placeholder={
                lang === 'zh'
                  ? '在此粘贴或导入【回传扫描件 OCR 提取文本】(例如：对方签署盖章后回传的扫描件文字、OCR识别提取文本)...'
                  : 'Paste or import scanned contract OCR text here (e.g. scanned copy returned after signing, OCR extracted text)...'
              }
              className="w-full h-full p-3.5 text-xs sm:text-sm text-slate-800 bg-transparent resize-y font-mono focus:outline-none placeholder:text-slate-400 leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
