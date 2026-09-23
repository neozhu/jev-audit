import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { TextInputSection } from './components/TextInputSection';
import { JevConfigSection } from './components/JevConfigSection';
import { ExecuteBar } from './components/ExecuteBar';
import { ResultsSection } from './components/ResultsSection';
import { getContractPresets, PresetScenario } from './data/presets';
import { JevEvaluationConfig, ComparisonReport } from './types/jev';
import { computeWordDiff } from './utils/diff';
import { useI18n } from './i18n/context';

export default function App() {
  const { lang, t } = useI18n();
  const isZh = lang === 'zh';

  const presets = getContractPresets(lang);
  const initialPreset = presets[0];

  const [titleA, setTitleA] = useState<string>(initialPreset.titleA);
  const [textA, setTextA] = useState<string>(initialPreset.textA);
  const [titleB, setTitleB] = useState<string>(initialPreset.titleB);
  const [textB, setTextB] = useState<string>(initialPreset.textB);
  const [config, setConfig] = useState<JevEvaluationConfig>(initialPreset.config);

  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const prevLangRef = useRef<string>(lang);

  // When language switches, if the user hasn't edited anything away from presets, adapt cleanly
  useEffect(() => {
    if (prevLangRef.current !== lang) {
      prevLangRef.current = lang;
      // Auto-load the active language's primary demo preset if report is empty
      if (!report) {
        const newPresets = getContractPresets(lang);
        const p = newPresets[0];
        setTitleA(p.titleA);
        setTextA(p.textA);
        setTitleB(p.titleB);
        setTextB(p.textB);
        setConfig(p.config);
      }
    }
  }, [lang, report]);

  const handleSelectPreset = (preset: PresetScenario) => {
    setTitleA(preset.titleA);
    setTextA(preset.textA);
    setTitleB(preset.titleB);
    setTextB(preset.textB);
    setConfig(preset.config);
    setReport(null);
    setError(null);
  };

  const handleReset = () => {
    setTitleA(isZh ? '原始基准合同 (底稿)' : 'Baseline Contract (Draft)');
    setTextA('');
    setTitleB(isZh ? '回传扫描件 (OCR文本)' : 'Executed Scanned Copy (OCR Text)');
    setTextB('');
    setConfig({
      systemInstruction: isZh
        ? '作为资深法务合规审计专家，请遵循 Jev 原子化评测标准，严格区分【实质性篡改】与【OCR识别噪声】。'
        : 'As a senior legal auditor, apply TypeSafe Jev standards to rigorously distinguish substantive tampering from benign OCR noise.',
      questions: [],
    });
    setReport(null);
    setError(null);
  };

  const handleSwap = () => {
    setTitleA(titleB);
    setTitleB(titleA);
    setTextA(textB);
    setTextB(textA);
    if (report) {
      setReport(null);
    }
  };

  const canExecute = textA.trim().length > 0 && textB.trim().length > 0 && config.questions.length > 0;

  const handleExecute = async () => {
    if (!canExecute) {
      setError(
        isZh
          ? '请确保原始基准合同与回传扫描件文本均不为空，且至少配置了 1 项 Jev 审计指标。'
          : 'Please make sure both baseline and scanned copy texts are not empty, and at least 1 Jev question is configured.'
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setLoadingStep(
        isZh
          ? '1/3 正在解耦比对合同状态与排版...'
          : '1/3 Decoupling contract states and layout...'
      );

      const timer1 = setTimeout(() => {
        setLoadingStep(
          isZh
            ? '2/3 正在执行 Jev 判别：甄别实质性条款篡改与 OCR 扫描噪声...'
            : '2/3 Running Jev discrimination: Substantive alterations vs OCR noise...'
        );
      }, 700);

      const timer2 = setTimeout(() => {
        setLoadingStep(
          isZh
            ? '3/3 计算条款一致性、合规风险等级与审查结论...'
            : '3/3 Calculating consistency rate, legal risk levels, and audit verdict...'
        );
      }, 2000);

      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textA,
          textB,
          titleA,
          titleB,
          config,
          lang,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error: ${response.status}`);
      }

      const data = await response.json();

      // Pair returned items with question definitions
      const pairedItems = (data.items || []).map((item: any) => {
        const matchingQuestion = config.questions.find((q) => q.id === item.questionId) || {
          id: item.questionId,
          title: item.answerA?.questionTitle || item.questionId,
          type: item.answerA?.type || 'score',
          instruction: '',
        };
        return {
          question: matchingQuestion,
          answerA: item.answerA,
          answerB: item.answerB,
          verdict: item.verdict || 'identical',
          deltaSummary: item.deltaSummary || '',
          scoreDelta: item.scoreDelta,
        };
      });

      const wordDiffs = computeWordDiff(textA, textB);

      // Determine contract decision
      const tamperingDetails = data.tamperingDetails || [];
      const tamperingCount = data.summary?.tamperingCount ?? tamperingDetails.filter((d: any) => d.type === 'tampering').length;
      const ocrNoiseCount = data.summary?.ocrNoiseCount ?? tamperingDetails.filter((d: any) => d.type === 'ocr_noise').length;

      let contractDecision = data.summary?.contractDecision;
      if (!contractDecision) {
        contractDecision = tamperingCount > 0 ? 'require_human_review' : 'auto_pass';
      }

      const completedReport: ComparisonReport = {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toLocaleString(isZh ? 'zh-CN' : 'en-US', { hour12: false }),
        titleA,
        titleB,
        textA,
        textB,
        config,
        summary: {
          overallWinner: data.summary?.overallWinner || 'NEUTRAL',
          scoreA: data.summary?.scoreA ?? 100,
          scoreB: data.summary?.scoreB ?? (tamperingCount > 0 ? 60 : 98),
          keyFindings: data.summary?.keyFindings || [],
          summaryText: data.summary?.summaryText || (isZh ? '合同审查完毕。' : 'Contract audit completed.'),
          totalQuestions: config.questions.length,
          identicalCount: pairedItems.filter((i: any) => i.verdict === 'identical').length,
          divergedCount: pairedItems.filter((i: any) => i.verdict !== 'identical').length,
          contractDecision,
          consistencyRate: data.summary?.consistencyRate ?? (tamperingCount > 0 ? 89 : 99),
          tamperingCount,
          ocrNoiseCount,
          decisionReason: data.summary?.decisionReason || (
            contractDecision === 'auto_pass'
              ? (isZh
                  ? '合同核心条款与标的绝对吻合，差异全部属于 OCR 良性扫描噪点，已准予自动通过。'
                  : 'Contract core terms match 100%. Differences are benign OCR noise. Auto-Pass approved.')
              : (isZh
                  ? `检出 ${tamperingCount} 处实质性条款篡改，存在法律与违约履约风险，必须触发人工 Review！`
                  : `Detected ${tamperingCount} substantive alterations with legal and compliance exposure. Manual Review required!`)
          ),
        },
        items: pairedItems,
        diffs: wordDiffs,
        tamperingDetails,
      };

      setReport(completedReport);

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (isZh ? '合同比对审查失败，请检查网络或配置重试。' : 'Contract comparison audit failed. Please retry.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header onSelectPreset={handleSelectPreset} onReset={handleReset} />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Section 1: Two Text Input Boxes */}
        <TextInputSection
          titleA={titleA}
          setTitleA={setTitleA}
          textA={textA}
          setTextA={setTextA}
          titleB={titleB}
          setTitleB={setTitleB}
          textB={textB}
          setTextB={setTextB}
          onSwap={handleSwap}
        />

        {/* Section 2: Jev Questions & Instructions Maintenance */}
        <JevConfigSection
          config={config}
          onChangeConfig={setConfig}
          textA={textA}
          textB={textB}
        />

        {/* Section 3: Execution Control Bar */}
        <ExecuteBar
          isLoading={isLoading}
          loadingStep={loadingStep}
          error={error}
          onExecute={handleExecute}
          canExecute={canExecute}
        />

        {/* Section 4: Results Display Section */}
        {report && (
          <div ref={resultsRef} className="pt-2">
            <ResultsSection report={report} />
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        {isZh
          ? 'AI 合同比对与防篡改审查工具 · 遵循 TypeSafe Jev System One 评测规范'
          : 'AI Contract Comparison & Anti-Tampering Engine · Built on TypeSafe Jev System One Specification'}
      </footer>
    </div>
  );
}
