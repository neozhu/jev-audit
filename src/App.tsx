import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { TextInputSection } from './components/TextInputSection';
import { JevConfigSection } from './components/JevConfigSection';
import { ExecuteBar } from './components/ExecuteBar';
import { ResultsSection } from './components/ResultsSection';
import { getContractPresets, createConsistencyConfig, PresetScenario } from './data/presets';
import { JevEvaluationConfig, ConsistencyResult } from './types/jev';
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

  const [report, setReport] = useState<ConsistencyResult | null>(null);
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
    setConfig(createConsistencyConfig(lang));
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
            ? '1/3 正在准备两份合同的比较状态...'
            : '1/3 Preparing the comparison state...'
      );

      const timer1 = setTimeout(() => {
        setLoadingStep(
          isZh
              ? '2/3 Jev 正在逐项判断实质含义是否一致...'
              : '2/3 Jev is evaluating substantive agreement...'
        );
      }, 700);

      const timer2 = setTimeout(() => {
        setLoadingStep(
          isZh
              ? '3/3 正在计算一致性得分与审核流向...'
              : '3/3 Calculating consistency score and review decision...'
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
      if (!Number.isFinite(data.consistencyRate) || !['auto_pass', 'require_human_review'].includes(data.contractDecision) ||
          !Array.isArray(data.evaluations) || data.evaluations.length !== config.questions.length) {
        throw new Error(isZh ? 'Jev 未返回有效的一致性结果。' : 'Jev did not return a valid consistency result.');
      }
      setReport(data as ConsistencyResult);

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
          setTitleA={(value) => { setTitleA(value); setReport(null); }}
          textA={textA}
          setTextA={(value) => { setTextA(value); setReport(null); }}
          titleB={titleB}
          setTitleB={(value) => { setTitleB(value); setReport(null); }}
          textB={textB}
          setTextB={(value) => { setTextB(value); setReport(null); }}
          onSwap={handleSwap}
        />

        {/* Section 2: Jev Questions & Instructions Maintenance */}
        <JevConfigSection
          config={config}
          onChangeConfig={(value) => { setConfig(value); setReport(null); }}
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
