import React, { useState } from 'react';
import { JevQuestion } from '../types/jev';
import { useI18n } from '../i18n/context';
import {
  Sparkles,
  X,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Plus,
  Lightbulb,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyConfig: (newQuestions: JevQuestion[], systemInstruction?: string, append?: boolean) => void;
  textA: string;
  textB: string;
  currentQuestionsCount: number;
}

const PRESET_IDEAS_ZH = [
  {
    title: '💰 款项与账期防篡改',
    prompt: '请重点审查合同中的设备采购总额、首付款比例以及付款账期。如果扫描件中金额少了零、改动了账期天数或支付前置条件，必须判定为需人工 Review；若仅是 OCR 错别字则放行。',
  },
  {
    title: '⚖️ 违约金与解约条款',
    prompt: '请重点审查违约金计算比例（千分之几还是万分之几）、单方解约通知期（是否从30天缩短到7天）以及免责上限是否被删除，要求建立明确分类和评分规则。',
  },
  {
    title: '🛡️ 知识产权与保密责任',
    prompt: '审查知识产权归属是否从【甲方完全所有】被暗改为【双方共有】或【乙方所有】，以及保密期限是否被篡改。必须高敏感度报警。',
  },
  {
    title: '🔍 扫描件 OCR 噪声容忍',
    prompt: '这批合同主要经过手机拍照扫描，包含大量形近字（如日/目、已/己、同/间）以及下划线断裂。请重点判定这些是否仅属于良性 OCR 噪点，在核心条款一致时高置信度自动通过。',
  },
];

const PRESET_IDEAS_EN = [
  {
    title: '💰 Payment Terms & Financial Integrity',
    prompt: 'Strictly inspect total purchase amount, deposit percentages, and payment milestones. Flag any altered figures, omitted zeros, or modified deadlines as requiring manual review; benign OCR typos can pass.',
  },
  {
    title: '⚖️ Penalties & Termination Clauses',
    prompt: 'Check liquidated damages rates (0.5% vs 0.05%), unilateral termination notice periods, and liability caps. Establish clear classification and scoring rules.',
  },
  {
    title: '🛡️ IP Ownership & Confidentiality',
    prompt: 'Audit intellectual property ownership rights (exclusive vs shared/retained) and confidentiality durations. Must alert on subtle alterations.',
  },
  {
    title: '🔍 Benign OCR Noise Tolerance',
    prompt: 'These documents were scanned from paper and contain optical character confusion (1O vs 10, hyphens, broken underlines). Verify that benign typographical artifacts are tolerated with high auto-pass confidence when core terms match.',
  },
];

export const AiGenerateQuestionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyConfig,
  textA,
  textB,
  currentQuestionsCount,
}) => {
  const { lang, t } = useI18n();
  const isZh = lang === 'zh';
  const presetIdeas = isZh ? PRESET_IDEAS_ZH : PRESET_IDEAS_EN;

  const [userDescription, setUserDescription] = useState(
    isZh
      ? '请重点审查合同核心商务条款：包括采购总金额、付款方式、违约责任与免责限制。严格区分恶意篡改与良性 OCR 噪点，并给出审核流向决策。'
      : 'Strictly review key commercial terms: total price, payment schedule, default liabilities, and liability caps. Distinguish malicious alterations from benign OCR scan noise.'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    systemInstruction?: string;
    questions: JevQuestion[];
  } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!userDescription.trim()) {
      setError(isZh ? '请输入您希望审查的指标描述或要求。' : 'Please enter an audit requirement description.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDescription,
          textA: textA.slice(0, 1500),
          textB: textB.slice(0, 1500),
          lang,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(isZh ? '未成功生成有效问题列表，请重新尝试。' : 'Failed to generate questions. Please try again.');
      }

      setGeneratedResult({
        systemInstruction: data.systemInstruction,
        questions: data.questions,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (isZh ? '生成失败，请重试。' : 'Generation failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (append = false) => {
    if (!generatedResult) return;
    onApplyConfig(generatedResult.questions, generatedResult.systemInstruction, append);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {t.aiModal.title}
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  OpenAI
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {t.aiModal.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Quick Idea Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Lightbulb className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.aiModal.scenarioHint}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetIdeas.map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUserDescription(idea.prompt)}
                  className="text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 transition text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-slate-900 flex items-center justify-between">
                    <span>{idea.title}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition" />
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {idea.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Prompt Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              {t.aiModal.inputLabel}
            </label>
            <textarea
              rows={4}
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              placeholder={t.aiModal.inputPlaceholder}
              className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-slate-400 leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{t.aiModal.inputTip}</span>
              <span>{userDescription.length} {t.common.chars}</span>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !userDescription.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" />
                  <span>{t.aiModal.generatingBtn}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.aiModal.generateBtn}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs">
              {error}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedResult && (
            <div className="pt-3 border-t border-slate-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isZh
                      ? `已提炼 ${generatedResult.questions.length} 项评测指标与指令`
                      : `Extracted ${generatedResult.questions.length} evaluation questions`}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {t.aiModal.architectureHint}
                </span>
              </div>

              {/* System Instruction */}
              {generatedResult.systemInstruction && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {t.aiModal.sysInstructionLabel}
                  </div>
                  <div className="text-xs text-slate-700 italic">
                    “{generatedResult.systemInstruction}”
                  </div>
                </div>
              )}

              {/* Questions List Preview */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {generatedResult.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">
                          {idx + 1}. {q.title}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          · {q.type === 'noul' ? t.rubric.booleanType : q.type === 'choice' ? t.rubric.choiceType : t.rubric.scoreType}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: {q.id}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      {q.instruction}
                    </p>

                    {q.type === 'noul' && q.noulPrompt && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block">
                        {t.rubric.prompt}: “{q.noulPrompt}”
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Apply Controls */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                {currentQuestionsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleApply(true)}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.aiModal.appendBtn}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleApply(false)}
                  className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.aiModal.replaceBtn}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer note */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
          <span>{t.aiModal.footerSpec}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
