import React, { useState } from 'react';
import {
  JevEvaluationConfig,
  JevQuestion,
} from '../types/jev';
import { JevQuestionModal } from './JevQuestionModal';
import { isValidConsistencyConfig } from '../utils/consistency';
import { AiGenerateQuestionsModal } from './AiGenerateQuestionsModal';
import { useI18n } from '../i18n/context';
import {
  Sliders,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Code,
  FileJson,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  config: JevEvaluationConfig;
  onChangeConfig: (newConfig: JevEvaluationConfig) => void;
  titleA: string;
  textA: string;
  titleB: string;
  textB: string;
  onChangeState: (state: { titleA: string; textA: string; titleB: string; textB: string }) => void;
}

export const JevConfigSection: React.FC<Props> = ({
  config,
  onChangeConfig,
  titleA,
  textA,
  titleB,
  textB,
  onChangeState,
}) => {
  const { lang, t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<JevQuestion | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showSystemInstruction, setShowSystemInstruction] = useState(false);

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: JevQuestion) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const handleDeleteQuestion = (id: string) => {
    onChangeConfig({
      ...config,
      questions: config.questions.filter((q) => q.id !== id),
    });
  };

  const handleSaveQuestion = (savedQ: JevQuestion) => {
    if (editingQuestion) {
      onChangeConfig({
        ...config,
        questions: config.questions.map((q) => (q.id === savedQ.id ? savedQ : q)),
      });
    } else {
      onChangeConfig({
        ...config,
        questions: [...config.questions, savedQ],
      });
    }
    setIsModalOpen(false);
  };

  const handleOpenJsonModal = () => {
    setRawJsonText(JSON.stringify({
      state: {
        baseline: { title: titleA, text: textA },
        scanned: { title: titleB, text: textB },
        comparisonPolicy: config.systemInstruction,
      },
      questions: config.questions,
    }, null, 2));
    setJsonError(null);
    setShowJsonModal(true);
  };

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      const state = parsed.state;
      if (state !== undefined && (
        !state || typeof state.baseline?.title !== 'string' || typeof state.baseline?.text !== 'string' ||
        typeof state.scanned?.title !== 'string' || typeof state.scanned?.text !== 'string' ||
        typeof state.comparisonPolicy !== 'string'
      )) {
        throw new Error(lang === 'zh' ? 'state 的标题、文本或评测指令无效' : 'Invalid state titles, texts, or comparison policy');
      }
      const systemInstruction = state ? state.comparisonPolicy : parsed.systemInstruction;
      if (!isValidConsistencyConfig({ systemInstruction, questions: parsed.questions })) {
        throw new Error(lang === 'zh' ? '问题类型、选项或计分配置无效' : 'Invalid question types, options, or scoring configuration');
      }
      onChangeConfig({
        systemInstruction,
        questions: parsed.questions,
      });
      if (state) {
        onChangeState({
          titleA: state.baseline.title,
          textA: state.baseline.text,
          titleB: state.scanned.title,
          textB: state.scanned.text,
        });
      }
      setShowJsonModal(false);
    } catch (e: any) {
      setJsonError((lang === 'zh' ? 'JSON 格式有误: ' : 'Invalid JSON format: ') + e.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h2 className="font-semibold text-slate-900 text-sm">
            {t.rubric.title}
          </h2>
          <span className="text-xs text-slate-500">
            · {config.questions.length} {t.rubric.atomicCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Interactive Dialog Generator */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition cursor-pointer"
            title={lang === 'zh' ? '输入自定义审查诉求，智能提炼 Jev 评测指标与指令' : 'Extract Jev rubric and questions from natural language'}
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.rubric.aiExtract}</span>
          </button>

          {/* JSON raw editor */}
          <button
            type="button"
            onClick={handleOpenJsonModal}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title={lang === 'zh' ? '查看或导入 Jev state 与问题 JSON' : 'View or import Jev state and questions JSON'}
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.rubric.rawJson}</span>
          </button>

          {/* Add Question Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.rubric.addQuestion}</span>
          </button>
        </div>
      </div>

      {/* System Instruction Accordion */}
      <div className="px-5 py-2.5 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <button
          type="button"
          onClick={() => setShowSystemInstruction(!showSystemInstruction)}
          className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium cursor-pointer"
        >
          <span>{t.rubric.systemInstruction}</span>
          {showSystemInstruction ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
        <span className="text-[11px] text-slate-400">
          {t.rubric.systemInstructionHint}
        </span>
      </div>

      {showSystemInstruction && (
        <div className="p-4 bg-slate-50/60 border-b border-slate-200">
          <textarea
            rows={2}
            value={config.systemInstruction || ''}
            onChange={(e) =>
              onChangeConfig({ ...config, systemInstruction: e.target.value })
            }
            placeholder={t.rubric.systemInstructionPlaceholder}
            className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      )}

      {/* Questions List */}
      <div className="p-5 space-y-3">
        {config.questions.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed rounded-lg">
            {t.rubric.emptyQuestions}
          </div>
        ) : (
          config.questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="p-3.5 rounded-lg border border-slate-200 bg-white transition hover:border-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-900">
                    {idx + 1}. {q.title}
                  </span>

                  <span className="text-[11px] text-slate-500 font-medium">
                    ·{' '}
                    {q.type === 'noul'
                      ? t.rubric.booleanType
                      : q.type === 'choice'
                      ? t.rubric.choiceType
                      : t.rubric.scoreType}
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {q.id}
                  </span>

                  {q.weight !== undefined && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      · {t.rubric.weight}: {q.weight}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {q.instruction}
                </p>

                {/* Sub details depending on question type */}
                {q.type === 'noul' && q.noulPrompt && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block">
                    {t.rubric.prompt}: “{q.noulPrompt}”
                  </div>
                )}

                {q.type === 'choice' && q.choices && q.choices.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-slate-400">{t.rubric.choices}:</span>
                    {q.choices.map((c) => (
                      <span
                        key={c.id}
                        className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-normal"
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}

                {q.type === 'score' && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block">
                    {t.rubric.scoreRange}: {q.minScore ?? 0} ~ {q.maxScore ?? ((q.scoreLevels?.length ?? 1) - 1)}
                    {q.scoreLevels && q.scoreLevels.length > 0 && (
                      <span className="ml-1 text-slate-400">
                        ({q.scoreLevels.map((l) => `${l.score}:${l.label}`).join(' | ')})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(q)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title={t.common.edit}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title={t.common.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Question Edit/Add Modal */}
      {isModalOpen && (
        <JevQuestionModal
          isOpen={isModalOpen}
          initialQuestion={editingQuestion}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveQuestion}
        />
      )}

      {/* AI Interactive Dialog Modal */}
      {isAiModalOpen && (
        <AiGenerateQuestionsModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          onApplyConfig={(newQuestions, systemInstruction, append) => {
            if (append) {
              onChangeConfig({
                ...config,
                systemInstruction: systemInstruction || config.systemInstruction,
                questions: [...config.questions.filter((q) => !newQuestions.some((newQ) => newQ.id === q.id)), ...newQuestions],
              });
            } else {
              onChangeConfig({
                ...config,
                systemInstruction: systemInstruction || config.systemInstruction,
                questions: newQuestions,
              });
            }
          }}
          textA={textA}
          textB={textB}
          currentQuestionsCount={config.questions.length}
        />
      )}

      {/* Raw JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-slate-700" />
                <h3 className="font-semibold text-slate-800 text-sm">
                  {lang === 'zh' ? '编辑 Jev state 与问题 JSON' : 'Edit Jev State & Questions JSON'}
                </h3>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <p className="text-xs text-slate-500 mb-2">
                {lang === 'zh'
                  ? '可编辑 state 中的两份文本、标题、评测指令，以及 Jev 原子问题：'
                  : 'Edit the two texts, titles, comparison policy, and Jev atomic questions in JSON:'}
              </p>
              <textarea
                value={rawJsonText}
                onChange={(e) => setRawJsonText(e.target.value)}
                className="w-full flex-1 p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg border border-slate-700 focus:outline-none"
                rows={16}
              />
              {jsonError && (
                <p className="text-xs text-red-500 mt-2 font-medium">{jsonError}</p>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                onClick={() => setShowJsonModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleSaveJson}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                {lang === 'zh' ? '应用 JSON 配置' : 'Apply JSON Config'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
