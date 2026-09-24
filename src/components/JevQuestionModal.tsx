import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { JevQuestion, JevQuestionType, JevChoiceOption, JevScoreLevel } from '../types/jev';
import { useI18n } from '../i18n/context';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: JevQuestion) => void;
  initialQuestion?: JevQuestion | null;
}

export const JevQuestionModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialQuestion }) => {
  const { lang, t } = useI18n();
  const zh = lang === 'zh';
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<JevQuestionType>('noul');
  const [instruction, setInstruction] = useState('');
  const [yes, setYes] = useState('');
  const [no, setNo] = useState('');
  const [invert, setInvert] = useState(false);
  const [choices, setChoices] = useState<JevChoiceOption[]>([]);
  const [matching, setMatching] = useState<string[]>([]);
  const [levels, setLevels] = useState<JevScoreLevel[]>([]);
  const [weight, setWeight] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    setId(initialQuestion?.id || `q_${Date.now().toString(36)}`);
    setTitle(initialQuestion?.title || '');
    setType(initialQuestion?.type || 'noul');
    setInstruction(initialQuestion?.instruction || '');
    setYes(initialQuestion?.noulPrompt || '');
    setNo(initialQuestion?.noulFalsePrompt || '');
    setInvert(initialQuestion?.invertForConsistency || false);
    setChoices(initialQuestion?.choices || [{ id: 'match', label: '' }, { id: 'changed', label: '' }]);
    setMatching(initialQuestion?.consistentChoices || ['match']);
    setLevels(initialQuestion?.scoreLevels || [{ score: 0, label: '' }, { score: 1, label: '' }]);
    setWeight(initialQuestion?.weight ?? 1);
    setError('');
  }, [initialQuestion, isOpen]);

  if (!isOpen) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const base = { id, title: title.trim(), type, instruction: instruction.trim(), weight };
    let question: JevQuestion;
    if (type === 'noul') {
      if (!yes.trim() || (invert && !no.trim())) {
        setError(zh ? '请填写是/否判断标准。' : 'Enter the yes/no criteria.');
        return;
      }
      question = { ...base, noulPrompt: yes.trim(), noulFalsePrompt: no.trim(), invertForConsistency: invert };
    } else if (type === 'choice') {
      const clean = choices.map((c) => ({ ...c, id: c.id.trim(), label: c.label.trim() }));
      if (clean.length < 2 || clean.some((c) => !c.id || !c.label) || new Set(clean.map((c) => c.id)).size !== clean.length || matching.length === 0 || matching.length >= clean.length) {
        setError(zh ? '至少需要两个不同选项，并标记部分选项为一致。' : 'Add two distinct options and mark some, but not all, as consistent.');
        return;
      }
      question = { ...base, choices: clean, consistentChoices: matching };
    } else {
      const clean = levels.map((l, score) => ({ ...l, score, label: l.label.trim() }));
      if (clean.length < 2 || clean.some((l) => !l.label)) {
        setError(zh ? '至少需要两个评分档位，并填写说明。' : 'Add at least two labeled score levels.');
        return;
      }
      question = { ...base, minScore: 0, maxScore: clean.length - 1, scoreLevels: clean };
    }
    onSave(question);
    onClose();
  };

  const input = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 max-h-[90vh] overflow-y-auto">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 className="font-semibold text-slate-800 text-lg">{initialQuestion ? t.questionModal.editTitle : t.questionModal.addTitle}</h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={submit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="md:col-span-2 text-xs font-semibold text-slate-700">{t.questionModal.titleLabel}<input required value={title} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-1`} /></label>
          <label className="text-xs font-semibold text-slate-700">{zh ? 'Jev 类型' : 'Jev type'}<select value={type} onChange={(e) => setType(e.target.value as JevQuestionType)} className={`${input} mt-1`}><option value="noul">Noul</option><option value="choice">Choice</option><option value="score">Score</option></select></label>
          <label className="text-xs font-semibold text-slate-700">{t.questionModal.weightLabel}<input type="number" required min="0.1" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className={`${input} mt-1`} /></label>
        </div>
        <label className="block text-xs font-semibold text-slate-700">{t.questionModal.instructionLabel}<textarea required rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} className={`${input} mt-1`} /></label>
        {type === 'noul' && <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">{zh ? '是的判断标准' : 'Yes criterion'}<input required value={yes} onChange={(e) => setYes(e.target.value)} className={`${input} mt-1`} /></label>
          <label className="block text-xs font-semibold text-slate-700">{zh ? '否的判断标准' : 'No criterion'}<input value={no} onChange={(e) => setNo(e.target.value)} className={`${input} mt-1`} /></label>
          <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />{zh ? '是表示不一致（计分时使用 1 − 是的概率）' : 'Yes means inconsistent (score as 1 − P(yes))'}</label>
        </div>}
        {type === 'choice' && <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">{zh ? '选项；勾选表示该选项计入一致性' : 'Options; check those that count as consistent'}</p>
          {choices.map((c, i) => <div key={i} className="flex items-center gap-2">
            <input aria-label={zh ? '一致' : 'Consistent'} type="checkbox" checked={matching.includes(c.id)} onChange={(e) => setMatching(e.target.checked ? [...matching, c.id] : matching.filter((id) => id !== c.id))} />
            <input aria-label="ID" value={c.id} onChange={(e) => { const next = [...choices]; next[i] = { ...c, id: e.target.value }; setChoices(next); setMatching(matching.map((id) => id === c.id ? e.target.value : id)); }} className={`${input} w-28`} />
            <input aria-label={zh ? '选项说明' : 'Option label'} value={c.label} onChange={(e) => { const next = [...choices]; next[i] = { ...c, label: e.target.value }; setChoices(next); }} className={input} />
            <button type="button" onClick={() => { setChoices(choices.filter((_, j) => j !== i)); setMatching(matching.filter((id) => id !== c.id)); }} className="text-slate-500">×</button>
          </div>)}
          <button type="button" onClick={() => setChoices([...choices, { id: `option_${choices.length + 1}`, label: '' }])} className="text-xs text-slate-700">+ {zh ? '添加选项' : 'Add option'}</button>
        </div>}
        {type === 'score' && <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">{zh ? '从不一致到一致的有序档位' : 'Ordered levels from mismatch to match'}</p>
          {levels.map((l, i) => <div key={i} className="flex items-center gap-2"><span className="w-5 text-xs text-slate-500">{i}</span><input aria-label={`${zh ? '档位' : 'Level'} ${i}`} value={l.label} onChange={(e) => { const next = [...levels]; next[i] = { ...l, label: e.target.value }; setLevels(next); }} className={input} /><button type="button" onClick={() => setLevels(levels.filter((_, j) => j !== i))} className="text-slate-500">×</button></div>)}
          {levels.length < 10 && <button type="button" onClick={() => setLevels([...levels, { score: levels.length, label: '' }])} className="text-xs text-slate-700">+ {zh ? '添加档位' : 'Add level'}</button>}
        </div>}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 cursor-pointer">{t.common.cancel}</button><button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg cursor-pointer">{t.questionModal.saveBtn}</button></div>
      </form>
    </div>
  </div>;
};
