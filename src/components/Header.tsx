import React, { useState, useEffect } from 'react';
import { getContractPresets, PresetScenario } from '../data/presets';
import { useI18n } from '../i18n/context';
import {
  FileCheck2,
  Sparkles,
  RotateCcw,
  BookOpen,
  ChevronDown,
  X,
  Key,
  CheckCircle2,
  Cpu,
  Globe,
  HelpCircle,
} from 'lucide-react';

interface Props {
  onSelectPreset: (preset: PresetScenario) => void;
  onReset: () => void;
}

export const Header: React.FC<Props> = ({ onSelectPreset, onReset }) => {
  const { lang, setLang, t } = useI18n();
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [engineStatus, setEngineStatus] = useState<{
    hasTypeSafeKey: boolean;
    hasOpenAIKey: boolean;
    engine: string;
    typesafeEndpoint: string;
    model: string;
    openaiModel: string;
  }>({
    hasTypeSafeKey: false,
    hasOpenAIKey: false,
    engine: 'jev_key_required',
    typesafeEndpoint: 'https://api.typesafe.ai/v1/systemone',
    model: 'jev-latest',
    openaiModel: 'gpt-6-luna',
  });

  const currentPresets = getContractPresets(lang);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.hasTypeSafeKey === 'boolean') {
          setEngineStatus(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Product Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {t.header.appTitle}
              </h1>
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                TypeSafe Jev
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {t.header.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Language Switcher Segmented Control */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLang('zh')}
              className={`px-2 py-1 rounded transition text-xs flex items-center gap-1 ${
                lang === 'zh'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="切换为中文"
            >
              <span>中文</span>
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded transition text-xs flex items-center gap-1 ${
                lang === 'en'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Switch to English"
            >
              <span>EN</span>
            </button>
          </div>

          {/* Engine Status / API Key badge */}
          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition cursor-pointer"
            title="查看 Jev API 调用实现与 Key 配置状态"
          >
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">
              {engineStatus.hasTypeSafeKey ? t.header.jevConnected : t.header.jevEngine}
            </span>
            <span className="md:hidden">Jev</span>
          </button>

          {/* Preset Cases Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.header.loadPresets}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showPresetsMenu && (
              <div
                className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowPresetsMenu(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
                  {lang === 'zh' ? '选择预置合同场景：' : 'Select Contract Scenario:'}
                </div>
                {currentPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex flex-col gap-0.5 border-b border-slate-50 last:border-b-0 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        {preset.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${preset.badgeColor}`}
                      >
                        {preset.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-2">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guide Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title={lang === 'zh' ? '审查规则说明' : 'Audit Rules Guide'}
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">
              {lang === 'zh' ? '规则原理' : 'Rules'}
            </span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
            title={lang === 'zh' ? '重置文本与配置' : 'Reset Texts & Rubric'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.header.reset}</span>
          </button>
        </div>
      </div>

    </header>

      {/* Jev API Key & Calling Code Explanation Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {lang === 'zh' ? 'TypeSafe Jev API Key 与调用实现说明' : 'TypeSafe Jev API Key & Implementation Guide'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">
                    {lang === 'zh' ? '官方 Jev API 调用代码已完全实现' : 'Official Jev API Calling Code Fully Implemented'}
                  </div>
                  <p className="mt-1 text-xs text-emerald-800">
                    {lang === 'zh'
                      ? '服务端已内置针对 TypeSafe 官方端点 https://api.typesafe.ai/v1/systemone 的完整调用实现（支持原子化 noul、choice、score 类型推断与并发评估）。'
                      : 'Server-side integration with official TypeSafe endpoint https://api.typesafe.ai/v1/systemone is fully built, supporting atomic noul, choice, and score typed inferences.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">
                  {lang === 'zh' ? '一、当前运行状态' : '1. Current Runtime Status'}
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
                  <div>• {lang === 'zh' ? '官方端点' : 'Official Endpoint'}: <code>{engineStatus.typesafeEndpoint}</code></div>
                  <div>• {lang === 'zh' ? '模型代号' : 'Model'}: <code>{engineStatus.model}</code></div>
                  <div>• {lang === 'zh' ? 'OpenAI 模型' : 'OpenAI Model'}: <code>{engineStatus.openaiModel}</code></div>
                  <div>• OPENAI_API_KEY: <strong className={engineStatus.hasOpenAIKey ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                    {engineStatus.hasOpenAIKey ? (lang === 'zh' ? '已配置' : 'Configured') : (lang === 'zh' ? '未配置' : 'Not configured')}
                  </strong></div>
                  <div>• TYPESAFE_API_KEY: <strong className={engineStatus.hasTypeSafeKey ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                    {engineStatus.hasTypeSafeKey
                      ? (lang === 'zh' ? '已注入并就绪 (直连官方 Jev API)' : 'Injected & Ready (Connected to Jev API)')
                      : (lang === 'zh' ? '未注入（合同比对不可用）' : 'Not configured (contract comparison unavailable)')}
                  </strong></div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">
                  {lang === 'zh' ? '二、如何配置 TypeSafe API Key' : '2. How to Configure TypeSafe API Key'}
                </h4>
                <p className="text-slate-600">
                  {lang === 'zh'
                    ? '为保障 API Key 凭证安全，请将您的 Key 配置在环境变量中，无需在前端页面明文输入：'
                    : 'To ensure API credential security, configure your key in environment variables:'}
                </p>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-1">
                  <div className="text-slate-400"># .env or environment variable:</div>
                  <div className="text-slate-200">TYPESAFE_API_KEY="your_typesafe_api_key_here"</div>
                  <div className="text-slate-400 text-[10px]"># Available at https://console.typesafe.ai/settings/keys</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">
                  {lang === 'zh' ? '三、模型职责边界' : '3. Model responsibility boundary'}
                </h4>
                <p className="text-slate-600">
                  {lang === 'zh' ? (
                    <>
                      - <strong>合同比对</strong>：仅调用 TypeSafe Jev 官方 System One 模型；<br />
                      - <strong>GPT</strong>：仅用于生成 Jev 原子问题，不读取或参与合同比对结果。
                    </>
                  ) : (
                    <>
                      - <strong>Contract comparison</strong>: Uses only the official TypeSafe Jev System One model;<br />
                      - <strong>GPT</strong>: Only generates Jev atomic questions and never evaluates contract content or results.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide & Rules Explainer Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {lang === 'zh' ? '合同防篡改审查与 OCR 噪声区分判定标准' : 'Contract Anti-Tampering Audit & OCR Noise Standards'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  {lang === 'zh' ? '什么是「实质性篡改」？（必须触发人工 Review）' : 'What is "Substantive Tampering"? (Must Trigger Manual Review)'}
                </h4>
                <p className="text-slate-600">
                  {lang === 'zh'
                    ? '指对合同具有法律约束力、权利义务分配、履约风险或经济价值产生实质性影响的改动。包括但不限于：'
                    : 'Modifications that materially impact legal obligations, liabilities, performance risks, or financial value:'}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>
                    <strong>{lang === 'zh' ? '金额数值与货币单位' : 'Financial Amounts & Currencies'}</strong>: {lang === 'zh' ? '少零/多零、税率变动、币种变更、违约金比例增减；' : 'Omitted/added zeros, tax rate changes, currency switches, liquidated damage alterations;'}
                  </li>
                  <li>
                    <strong>{lang === 'zh' ? '履约与支付节点' : 'Performance & Milestones'}</strong>: {lang === 'zh' ? '预付款比例、验收周期、账期延长或缩短；' : 'Deposit percentages, acceptance windows, milestone dates altered;'}
                  </li>
                  <li>
                    <strong>{lang === 'zh' ? '法律救济与管辖条款' : 'Legal Remedies & Jurisdiction'}</strong>: {lang === 'zh' ? '免责上限暗中被删除、管辖法院或仲裁地被更改；' : 'Liability caps removed, arbitration or governing court jurisdictions modified;'}
                  </li>
                  <li>
                    <strong>{lang === 'zh' ? '主体身份与账号信息' : 'Entity Identity & Accounts'}</strong>: {lang === 'zh' ? '开户行、账号、签约主体名称被替换。' : 'Bank names, account numbers, or signatory entity names replaced.'}
                  </li>
                </ul>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {lang === 'zh' ? '什么是「良性 OCR 识别噪声」？（准予自动通过）' : 'What is "Benign OCR Recognition Noise"? (Auto-Pass Eligible)'}
                </h4>
                <p className="text-slate-600">
                  {lang === 'zh'
                    ? '指由于纸质扫描倾斜、印章覆盖、光学字符识别算法误差引起的无实质法律意义的字符漂移。包括：'
                    : 'Typographical drift caused by scanning angles, stamp occlusions, or optical recognizer confusion:'}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>
                    <strong>{lang === 'zh' ? '常见形近字错读' : 'Similar Character Typographical Noise'}</strong>: {lang === 'zh' ? '如「日」识别为「目」、「已」识别为「己」、「合同」识别为「合间」；' : "e.g. '1O' for '10', 'agreenent' for 'agreement', 'buslness' for 'business';"}
                  </li>
                  <li>
                    <strong>{lang === 'zh' ? '排印空白与折行' : 'Spacing & Line-Breaks'}</strong>: {lang === 'zh' ? '换行符位置不同、段落首尾多余空格、制表符错位；' : 'Varying line wraps, redundant trailing spaces, tab spacing;'}
                  </li>
                  <li>
                    <strong>{lang === 'zh' ? '标点符号差异' : 'Punctuation Variations'}</strong>: {lang === 'zh' ? '全半角标点混用、符号字符代码不同。' : 'Full-width vs half-width commas, quotation marks, hyphens.'}
                  </li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">
                  💡 {lang === 'zh' ? 'Jev System One 原子推断原则' : 'Jev System One Atomic Inference Principles'}
                </div>
                <p className="text-slate-600">
                  {lang === 'zh'
                    ? '系统将两份文本作为独立状态（State），通过声明式的原子问题（Noul 布尔概率、Choice 分类流向、Score 噪声评级）完成无幻觉的确定性审计，避免大模型自由漫谈。'
                    : 'The system evaluates both texts as decoupled independent states, applying declarative atomic questions (Noul booleans, Choice classifications, Score scales) to guarantee deterministic auditing without LLM hallucination.'}
                </p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
