import React, { useState } from 'react';
import { ComparisonReport } from '../types/jev';
import { computeWordDiff } from '../utils/diff';
import { generateHtmlReport, downloadFile } from '../utils/export';
import { useI18n } from '../i18n/context';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

interface Props {
  report: ComparisonReport;
}

export const ResultsSection: React.FC<Props> = ({ report }) => {
  const { lang, t } = useI18n();
  const { textA, textB, titleA, titleB, summary, items = [], tamperingDetails = [] } = report;

  const [reviewedItems, setReviewedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [showFullDiff, setShowFullDiff] = useState(false);
  const [showJevRaw, setShowJevRaw] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'tampering' | 'ocr_noise'>('all');

  const isAutoPass = summary.contractDecision === 'auto_pass';
  const tamperingCount = summary.tamperingCount || 0;
  const ocrNoiseCount = summary.ocrNoiseCount || 0;
  const consistencyRate = summary.consistencyRate ?? 0;
  const hasStructuredDifferences = tamperingDetails.length > 0;

  const formatAnswer = (answer: typeof items[number]['answerA']) => {
    if (answer.noulResult) {
      return `${answer.noulResult.value ? (lang === 'zh' ? '是' : 'Yes') : (lang === 'zh' ? '否' : 'No')} · ${Math.round(answer.noulResult.probability * 100)}%`;
    }
    if (answer.choiceResult) return answer.choiceResult.selectedLabel || answer.choiceResult.selectedId;
    if (answer.scoreResult) return `${answer.scoreResult.score} / ${answer.scoreResult.maxScore}`;
    return lang === 'zh' ? 'Jev 未返回结果' : 'No Jev result';
  };

  const toggleReview = (id: string) => {
    setReviewedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = tamperingDetails.filter((d) => {
    if (activeFilter === 'tampering') return d.type === 'tampering';
    if (activeFilter === 'ocr_noise') return d.type === 'ocr_noise';
    return true;
  });

  const wordDiffs = computeWordDiff(textA, textB);

  const handleCopySummary = () => {
    const isZh = lang === 'zh';
    const text = isZh
      ? `【合同比对与防篡改审查结论】\n` +
        `Jev 决策结果: ${isAutoPass ? '🟢 自动通过' : '🔴 需人工 Review'}\n` +
        `Jev 指标判定一致率: ${consistencyRate}%\n` +
        `结论说明: ${summary.decisionReason || summary.summaryText}`
      : `[Contract Comparison & Anti-Tampering Audit Verdict]\n` +
        `Jev Decision: ${isAutoPass ? '🟢 Auto-Pass' : '🔴 Manual Review Required'}\n` +
        `Jev Metric Agreement: ${consistencyRate}%\n` +
        `Findings: ${summary.decisionReason || summary.summaryText}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    const html = generateHtmlReport({ ...report, diffs: wordDiffs }, lang);
    downloadFile(html, `contract-audit-report-${Date.now()}.html`, 'text/html');
  };

  return (
    <div className="space-y-4">
      {/* 1. 核心决策横幅 (Decision Banner) */}
      <div
        className={`rounded-xl p-5 bg-white border shadow-2xs transition ${
          isAutoPass ? 'border-slate-200 border-l-4 border-l-emerald-600' : 'border-slate-200 border-l-4 border-l-rose-600'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {isAutoPass ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {isAutoPass
                    ? t.results.autoPassTitle
                    : tamperingCount > 0
                    ? t.results.tamperingTitle
                    : t.results.lowConsistencyTitle}
                </h3>
              </div>

              {/* 静默元数据行 */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="font-medium text-slate-700">
                  {t.results.consistencyRate}: {consistencyRate}%
                </span>
                {hasStructuredDifferences && <>
                  <span aria-hidden="true">·</span>
                  <span className={tamperingCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-600'}>
                    {t.results.tamperingCount}: {tamperingCount} {lang === 'zh' ? '处' : ''}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{t.results.ocrNoiseCount}: {ocrNoiseCount} {lang === 'zh' ? '处' : ''}</span>
                </>}
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">{t.results.ruleNotice}</span>
              </div>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-3xl">
                {summary.decisionReason || summary.summaryText}
              </p>
            </div>
          </div>

          {/* 快捷操作：复制结论与导出 */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-slate-700" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copied ? t.results.copied : t.results.copyVerdict}</span>
            </button>

            <button
              type="button"
              onClick={handleExportHtml}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.results.exportReport}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Jev 返回结构化差异时才展示风险清单，避免把缺失数据呈现为 0。 */}
      {hasStructuredDifferences && <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* 标题栏与简单过滤 */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {t.results.diffListTitle} ({tamperingDetails.length})
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {t.results.diffListSubtitle}
            </span>
          </div>

          {/* 过滤切换 */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-md transition text-xs cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              {t.results.filterAll} ({tamperingDetails.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('tampering')}
              className={`px-2.5 py-1 rounded-md transition text-xs cursor-pointer ${
                activeFilter === 'tampering'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              {t.results.filterTampering} ({tamperingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ocr_noise')}
              className={`px-2.5 py-1 rounded-md transition text-xs cursor-pointer ${
                activeFilter === 'ocr_noise'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              {t.results.filterNoise} ({ocrNoiseCount})
            </button>
          </div>
        </div>

        {/* 差异卡片列表 */}
        <div className="p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {activeFilter === 'tampering'
                ? t.results.noTamperingFound
                : t.results.noFilteredItems}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isTamper = item.type === 'tampering';
              const isReviewed = Boolean(reviewedItems[item.id]);

              return (
                <div
                  key={item.id || index}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white transition hover:border-slate-300"
                >
                  {/* 第一行：标签、标题与复核按钮 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isTamper ? 'text-rose-700' : 'text-slate-500'
                        }`}
                      >
                        {isTamper ? t.results.tagTampering : t.results.tagNoise}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">
                        {item.clauseTitle || (lang === 'zh' ? '条款差异' : 'Clause Diff')}
                      </span>
                      {item.riskCategory && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          · {item.riskCategory}
                        </span>
                      )}
                    </div>

                    {/* 人工复核标记 */}
                    <button
                      type="button"
                      onClick={() => toggleReview(item.id)}
                      className={`text-xs px-2.5 py-1 rounded border flex items-center gap-1 transition cursor-pointer ${
                        isReviewed
                          ? 'bg-slate-100 text-slate-800 border-slate-300 font-medium'
                          : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200'
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 ${
                          isReviewed ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      />
                      <span>{isReviewed ? t.results.reviewed : t.results.markReview}</span>
                    </button>
                  </div>

                  {/* 第二行：左右对比 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* 原文底稿 */}
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-medium text-slate-400 mb-1">
                        {t.results.baselineDraft}
                      </div>
                      <div className="font-mono text-slate-800 bg-white p-1.5 rounded border border-slate-200">
                        {item.originalText}
                      </div>
                    </div>

                    {/* 回传扫描件 */}
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-medium text-slate-400 mb-1">
                        {t.results.ocrDraft}
                      </div>
                      <div
                        className={`font-mono p-1.5 rounded border bg-white ${
                          isTamper
                            ? 'text-rose-700 border-rose-200 font-semibold'
                            : 'text-slate-800 border-slate-200'
                        }`}
                      >
                        {item.ocrText}
                      </div>
                    </div>
                  </div>

                  {/* 第三行：分析说明 */}
                  <div className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-2 rounded border border-slate-100">
                    <span className="font-medium text-slate-700">{t.results.findingRationale} </span>
                    {item.analysis}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>}

      {/* 3. 辅助折叠面板：全文高亮比对 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFullDiff(!showFullDiff)}
          className="w-full px-5 py-3 bg-slate-50/60 hover:bg-slate-100/80 flex items-center justify-between text-xs font-semibold text-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>{t.results.fullDiffTitle}</span>
          </div>
          {showFullDiff ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showFullDiff && (
          <div className="p-5 border-t border-slate-200 bg-white space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {t.results.fullDiffAdded}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-slate-100 text-slate-500 line-through px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {t.results.fullDiffRemoved}
                </span>
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap select-text">
              {wordDiffs.map((diff, i) => {
                if (diff.added) {
                  return (
                    <span
                      key={i}
                      className="bg-slate-200 text-slate-900 font-semibold px-0.5 rounded"
                    >
                      {diff.value}
                    </span>
                  );
                }
                if (diff.removed) {
                  return (
                    <span
                      key={i}
                      className="text-slate-400 line-through px-0.5"
                    >
                      {diff.value}
                    </span>
                  );
                }
                return <span key={i} className="text-slate-800">{diff.value}</span>;
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Jev 原生原子推断结果 */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowJevRaw(!showJevRaw)}
            className="w-full px-5 py-2.5 bg-slate-50/40 hover:bg-slate-100/60 flex items-center justify-between text-xs font-medium text-slate-600 transition cursor-pointer"
          >
            <span>
              {lang === 'zh'
                ? `Jev 原生指标结果 (${items.length} 项)`
                : `Native Jev Metric Results (${items.length} metrics)`}
            </span>
            {showJevRaw ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {showJevRaw && (
            <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50/30">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>
                      {idx + 1}. {item.answerA?.questionTitle || item.question?.title || (lang === 'zh' ? `指标 ${idx + 1}` : `Metric ${idx + 1}`)}
                    </span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {item.verdict === 'identical'
                        ? t.results.verdictIdentical
                        : item.verdict === 'improved_b'
                        ? t.results.verdictImprovedB
                        : item.verdict === 'preferred_a'
                        ? t.results.verdictPreferredA
                        : t.results.verdictDiverged}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 pt-2">
                    {[{ title: titleA, answer: item.answerA }, { title: titleB, answer: item.answerB }].map(({ title, answer }) => (
                      <div key={title} className="rounded-md border border-slate-200 bg-slate-50 p-2 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-700 truncate">{title}</span>
                          <span className="font-semibold text-slate-900">{formatAnswer(answer)}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{answer.reasoning}</p>
                        {answer.evidenceQuotes && answer.evidenceQuotes.length > 0 && (
                          <div className="text-[10px] text-slate-500 border-l-2 border-slate-300 pl-2">
                            {answer.evidenceQuotes.join('；')}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">
                          {lang === 'zh' ? 'Jev 置信度' : 'Jev confidence'}: {Math.round(answer.confidence * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1">
                    {item.deltaSummary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
