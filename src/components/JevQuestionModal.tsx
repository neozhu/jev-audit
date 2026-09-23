import React, { useState, useEffect } from 'react';
import { JevQuestion, JevQuestionType, JevChoiceOption, JevScoreLevel } from '../types/jev';
import { useI18n } from '../i18n/context';
import { X, Plus, Trash2, HelpCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: JevQuestion) => void;
  initialQuestion?: JevQuestion | null;
}

export const JevQuestionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialQuestion,
}) => {
  const { lang, t } = useI18n();
  const isZh = lang === 'zh';

  const [type, setType] = useState<JevQuestionType>('noul');
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [noulPrompt, setNoulPrompt] = useState('');
  const [weight, setWeight] = useState(1.0);

  // For choice
  const [choices, setChoices] = useState<JevChoiceOption[]>([
    { id: 'opt_1', label: isZh ? '积极符合' : 'Fully Compliant', description: '' },
    { id: 'opt_2', label: isZh ? '部分符合' : 'Partially Compliant', description: '' },
    { id: 'opt_3', label: isZh ? '不符合' : 'Non-Compliant', description: '' },
  ]);

  // For score
  const [minScore, setMinScore] = useState(1);
  const [maxScore, setMaxScore] = useState(5);
  const [scoreLevels, setScoreLevels] = useState<JevScoreLevel[]>([
    { score: 1, label: isZh ? '1分 - 差' : '1 - Poor' },
    { score: 3, label: isZh ? '3分 - 中等' : '3 - Moderate' },
    { score: 5, label: isZh ? '5分 - 优' : '5 - Excellent' },
  ]);

  useEffect(() => {
    if (initialQuestion) {
      setType(initialQuestion.type);
      setId(initialQuestion.id);
      setTitle(initialQuestion.title);
      setInstruction(initialQuestion.instruction);
      setNoulPrompt(initialQuestion.noulPrompt || '');
      setWeight(initialQuestion.weight || 1.0);
      if (initialQuestion.choices) setChoices(initialQuestion.choices);
      if (initialQuestion.minScore !== undefined) setMinScore(initialQuestion.minScore);
      if (initialQuestion.maxScore !== undefined) setMaxScore(initialQuestion.maxScore);
      if (initialQuestion.scoreLevels) setScoreLevels(initialQuestion.scoreLevels);
    } else {
      setType('noul');
      setId(`q_${Date.now().toString(36)}`);
      setTitle('');
      setInstruction('');
      setNoulPrompt('');
      setWeight(1.0);
      setChoices([
        { id: 'opt_1', label: isZh ? '优秀' : 'Pass', description: '' },
        { id: 'opt_2', label: isZh ? '及格' : 'Marginal', description: '' },
        { id: 'opt_3', label: isZh ? '不及格' : 'Fail', description: '' },
      ]);
      setScoreLevels([
        { score: 1, label: isZh ? '1分 - 差' : '1 - Poor' },
        { score: 3, label: isZh ? '3分 - 中等' : '3 - Medium' },
        { score: 5, label: isZh ? '5分 - 优' : '5 - Excellent' },
      ]);
    }
  }, [initialQuestion, isOpen, isZh]);

  if (!isOpen) return null;

  const handleAddChoice = () => {
    const newIdx = choices.length + 1;
    setChoices([...choices, { id: `opt_${newIdx}`, label: isZh ? `选项 ${newIdx}` : `Choice ${newIdx}` }]);
  };

  const handleRemoveChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  const handleUpdateChoice = (index: number, field: keyof JevChoiceOption, val: string) => {
    const updated = [...choices];
    updated[index] = { ...updated[index], [field]: val };
    setChoices(updated);
  };

  const handleAddScoreLevel = () => {
    const nextScore = scoreLevels.length > 0 ? scoreLevels[scoreLevels.length - 1].score + 1 : 1;
    setScoreLevels([...scoreLevels, { score: nextScore, label: isZh ? `${nextScore}分` : `Score ${nextScore}` }]);
  };

  const handleRemoveScoreLevel = (index: number) => {
    setScoreLevels(scoreLevels.filter((_, i) => i !== index));
  };

  const handleUpdateScoreLevel = (index: number, label: string) => {
    const updated = [...scoreLevels];
    updated[index] = { ...updated[index], label };
    setScoreLevels(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instruction.trim()) {
      return;
    }

    const question: JevQuestion = {
      id: id || `q_${Date.now().toString(36)}`,
      title: title.trim(),
      type,
      instruction: instruction.trim(),
      weight: Number(weight) || 1.0,
      ...(type === 'noul' ? { noulPrompt: noulPrompt.trim() } : {}),
      ...(type === 'choice' ? { choices } : {}),
      ...(type === 'score' ? { minScore, maxScore, scoreLevels } : {}),
    };

    onSave(question);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg">
              {initialQuestion ? t.questionModal.editTitle : t.questionModal.addTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isZh
                ? '遵循 TypeSafe Jev 规范：每个问题聚焦单一维度进行原子化判断'
                : 'TypeSafe Jev Specification: Each question evaluates a single decoupled atomic dimension'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Question Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t.questionModal.typeLabel}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('noul')}
                className={`p-3 rounded-lg border text-left transition flex flex-col cursor-pointer ${
                  type === 'noul'
                    ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  noul ({isZh ? '是/否概率' : 'Boolean'})
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {t.questionModal.noulDesc}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('choice')}
                className={`p-3 rounded-lg border text-left transition flex flex-col cursor-pointer ${
                  type === 'choice'
                    ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  choice ({isZh ? '分类单选' : 'Classification'})
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {t.questionModal.choiceDesc}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('score')}
                className={`p-3 rounded-lg border text-left transition flex flex-col cursor-pointer ${
                  type === 'score'
                    ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  score ({isZh ? '连续评分' : 'Rating Scale'})
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {t.questionModal.scoreDesc}
                </span>
              </button>
            </div>
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.questionModal.titleLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.questionModal.titlePlaceholder}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.questionModal.weightLabel}
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 1.0)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.questionModal.instructionLabel} <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={t.questionModal.instructionPlaceholder}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Type-specific configs */}
          {type === 'noul' && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-semibold text-slate-900 mb-1">
                {t.questionModal.noulPromptLabel}
              </label>
              <input
                type="text"
                value={noulPrompt}
                onChange={(e) => setNoulPrompt(e.target.value)}
                placeholder={t.questionModal.noulPromptPlaceholder}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                {isZh
                  ? 'Jev 引擎将评估此命题在文本状态下为「True」的概率与置信度。'
                  : 'Jev evaluates the proposition probability and confidence of being "True".'}
              </p>
            </div>
          )}

          {type === 'choice' && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  {t.questionModal.choicesLabel}
                </label>
                <button
                  type="button"
                  onClick={handleAddChoice}
                  className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> {t.questionModal.addChoice}
                </button>
              </div>
              <div className="space-y-2">
                {choices.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={c.label}
                      onChange={(e) => handleUpdateChoice(idx, 'label', e.target.value)}
                      placeholder={t.questionModal.optionLabelPlaceholder}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <input
                      type="text"
                      value={c.description || ''}
                      onChange={(e) => handleUpdateChoice(idx, 'description', e.target.value)}
                      placeholder={isZh ? '可选说明' : 'Optional description'}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    {choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChoice(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'score' && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-900">
                  {t.questionModal.scoreRangeLabel}
                </label>
                <button
                  type="button"
                  onClick={handleAddScoreLevel}
                  className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> {isZh ? '增加档位' : 'Add Level'}
                </button>
              </div>
              <div className="space-y-2">
                {scoreLevels.map((lvl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-12 text-xs font-semibold text-slate-800 bg-slate-200 text-center py-1 rounded">
                      {lvl.score}
                    </span>
                    <input
                      type="text"
                      value={lvl.label}
                      onChange={(e) => handleUpdateScoreLevel(idx, e.target.value)}
                      placeholder={isZh ? '该分值对应的标准描述' : 'Criterion description'}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    {scoreLevels.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveScoreLevel(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition cursor-pointer"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition cursor-pointer"
          >
            {t.questionModal.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
