import React from 'react';
import { ConsistencyResult } from '../types/jev';
import { useI18n } from '../i18n/context';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  report: ConsistencyResult;
}

export const ResultsSection: React.FC<Props> = ({ report }) => {
  const { lang } = useI18n();
  const isZh = lang === 'zh';
  const { consistencyRate, contractDecision, evaluations } = report;
  const isAutoPass = contractDecision === 'auto_pass';
  const percent = (value: number) => `${Math.round(value * 1000) / 10}%`;

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border-l-4 border bg-white p-6 shadow-xs ${isAutoPass ? 'border-emerald-600' : 'border-rose-600'}`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {isAutoPass ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span>{isAutoPass ? 'Pass' : (isZh ? '人工 Review' : 'Manual Review')}</span>
        </div>
        <div className="mt-3 text-4xl font-bold tabular-nums text-slate-900">{consistencyRate}%</div>
        <p className="mt-1 text-xs text-slate-500">
          {isZh ? '一致性得分 = Σ(权重 × 各题一致分) ÷ Σ权重 × 100%；Noul 使用是的概率（修改迹象题取反），Choice 汇总一致选项概率，Score 按档位归一化。超过 90% 为 Pass。' : 'Consistency score = Σ(weight × question match score) ÷ Σweights × 100%. Noul uses P(yes), inverted for edit signs; Choice sums matching option probabilities; Score is normalized by its levels. Above 90% passes.'}
        </p>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs" aria-label={isZh ? 'Jev 逐题回复' : 'Jev answers by question'}>
        <h2 className="text-sm font-semibold text-slate-900">{isZh ? 'Jev 逐题回复 · 人工复核' : 'Jev answers · manual review'}</h2>
        <p className="mt-1 text-xs text-slate-500">{isZh ? 'Choice 和 Score 的置信度由 Jev 返回；Noul 没有独立置信度，以下展示是/否概率。' : 'Choice and Score confidence comes from Jev. Noul has no separate confidence field, so its yes/no probabilities are shown.'}</p>
        <div className="mt-4 space-y-3">
          {evaluations.map(({ question, answer }, index) => {
            const selectedChoice = answer.type === 'choice'
              ? question.choices?.find((choice) => choice.id === answer.choice)
              : undefined;
            const maxScore = (question.scoreLevels?.length ?? 1) - 1;
            return <article key={question.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">{index + 1}. {question.title}</h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-600">{answer.type}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{question.instruction}</p>
              {answer.type === 'noul' && <>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-slate-900">{isZh ? '回复：' : 'Answer: '}{answer.noul >= 0.5 ? (isZh ? '是' : 'Yes') : (isZh ? '否' : 'No')}</span>
                  <span className="text-slate-700">{isZh ? '判定概率：' : 'Answer probability: '}{percent(Math.max(answer.noul, 1 - answer.noul))}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                  <span>{isZh ? '是' : 'Yes'} {percent(answer.noul)}</span>
                  <span>{isZh ? '否' : 'No'} {percent(1 - answer.noul)}</span>
                </div>
              </>}
              {answer.type === 'choice' && <>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-slate-900">{isZh ? '回复：' : 'Answer: '}{selectedChoice?.label ?? answer.choice}</span>
                  <span className="text-slate-700">{isZh ? 'Jev 置信度：' : 'Jev confidence: '}{percent(answer.confidence)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                  {question.choices?.map((choice) => <span key={choice.id}>{choice.label} {percent(answer.probabilities[choice.id])}</span>)}
                </div>
              </>}
              {answer.type === 'score' && <>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-slate-900">{isZh ? '回复：' : 'Answer: '}{answer.score.toFixed(2)} / {maxScore}</span>
                  <span className="text-slate-700">{isZh ? 'Jev 置信度：' : 'Jev confidence: '}{percent(answer.confidence)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                  {question.scoreLevels?.map((level) => <span key={level.score}>{level.score}. {level.label} {percent(answer.probabilities[String(level.score)])}</span>)}
                </div>
              </>}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
};
