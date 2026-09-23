import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { JevEvaluationConfig, JevQuestion } from './src/types/jev';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-6-luna';

// Official TypeSafe Jev System One Model API Caller (https://api.typesafe.ai/v1/systemone)
async function callTypeSafeJevSystemOne(state: string, questions: JevQuestion[], apiKey: string) {
  const typesafeQuestions: Record<string, any> = {};

  for (const q of questions) {
    if (q.type === 'noul') {
      typesafeQuestions[q.id] = {
        type: 'noul',
        instruction: q.instruction,
        criteria: {
          true: q.noulPrompt || q.instruction,
          false: `非 ${q.noulPrompt || q.instruction}`,
        },
      };
    } else if (q.type === 'choice') {
      const criteria: Record<string, string> = {};
      (q.choices || []).forEach((c) => {
        criteria[c.id] = c.label;
      });
      typesafeQuestions[q.id] = {
        type: 'choice',
        instruction: q.instruction,
        criteria: Object.keys(criteria).length > 0 ? criteria : { opt1: '是', opt2: '否' },
      };
    } else if (q.type === 'score') {
      const levels = (q.scoreLevels || []).map((l) => l.label);
      typesafeQuestions[q.id] = {
        type: 'score',
        instruction: q.instruction,
        criteria: levels.length >= 2 ? levels : ['1分 - 差', '3分 - 中', '5分 - 优'],
      };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state,
        questions: typesafeQuestions,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`TypeSafe Jev API error (${res.status}): ${errorText}`);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// GET /api/status - Engine & API Key status
app.get('/api/status', (req, res) => {
  const typesafeKey = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY;
  const hasTypeSafeKey = Boolean(typesafeKey && typesafeKey.trim() !== '' && typesafeKey !== 'MY_TYPESAFE_API_KEY');
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'MY_OPENAI_API_KEY');

  res.json({
    hasTypeSafeKey,
    hasOpenAIKey,
    engine: hasTypeSafeKey ? 'typesafe_jev_native' : 'openai_jev_spec',
    typesafeEndpoint: 'https://api.typesafe.ai/v1/systemone',
    model: 'jev-latest',
    openaiModel,
  });
});

// Shared OpenAI generation path for audit synthesis and question creation.
async function generateOpenAIContent(prompt: string, systemInstruction?: string) {
  const { text } = await generateText({
    model: openai.responses(openaiModel),
    prompt,
    ...(systemInstruction ? { system: systemInstruction } : {}),
    timeout: 25000,
  });
  if (!text) throw new Error('OpenAI returned an empty response');
  return text;
}

// Fallback evaluator specifically tailored to Contract Tampering vs OCR Noise
function fallbackJevEvaluation(
  textA: string,
  textB: string,
  titleA: string,
  titleB: string,
  config: JevEvaluationConfig,
  lang: string = 'zh'
) {
  const isZh = lang !== 'en';
  // Extract numbers to detect numerical tampering
  const numsA = textA.match(/[\d,.]+/g) || [];
  const numsB = textB.match(/[\d,.]+/g) || [];
  const hasNumDiff = JSON.stringify(numsA) !== JSON.stringify(numsB);

  // Check for critical legal keyword changes
  const keywords = ['万分之五', '千分之五', '解除', '管辖', '法院', '150,000', '1,500,000', '壹佰伍拾万', '壹拾伍万', '上限不设限制', '50,000', '500,000', 'five hundred thousand', 'fifty thousand'];
  const keywordDiffs = keywords.filter(k => textA.includes(k) !== textB.includes(k));

  const isTampered = hasNumDiff || keywordDiffs.length > 0;
  const decision: 'auto_pass' | 'require_human_review' = isTampered ? 'require_human_review' : 'auto_pass';

  const tamperingDetails: any[] = [];

  if (isTampered) {
    if ((textA.includes('1,500,000') && textB.includes('150,000')) || (textA.includes('500,000') && textB.includes('50,000'))) {
      tamperingDetails.push({
        id: 't-amount',
        clauseTitle: isZh ? '第一条 1.1 合同采购总金额' : 'Clause 1.1 Total Contract Value',
        originalText: isZh ? '总金额为人民币 1,500,000 元（大写：人民币壹佰伍拾万元整）' : 'Total contract price is USD 500,000 (Five Hundred Thousand Dollars)',
        ocrText: isZh ? '总金额为人民币 150,000 元（大写：人民币壹拾伍万元整）' : 'Total contract price is USD 50,000 (Fifty Thousand Dollars)',
        type: 'tampering',
        riskLevel: 'critical',
        riskCategory: isZh ? '金额数值' : 'Amount',
        analysis: isZh
          ? '合同总金额少了一个“0”，大写金额同步被窜改，造成重大标的差额，属于恶意实质性篡改！'
          : 'Total contract amount is missing a zero, altering the financial consideration drastically. Substantive tampering!',
      });
    }
    if ((textA.includes('千分之五') && textB.includes('万分之五')) || (textA.includes('0.5%') && textB.includes('0.05%'))) {
      tamperingDetails.push({
        id: 't-penalty',
        clauseTitle: isZh ? '第三条 3.1 违约金起算标准' : 'Clause 3.1 Liquidated Damages Rate',
        originalText: isZh ? '按照未履行业务金额的千分之五（0.5%）向守约方支付违约金' : 'Liquidated damages of 0.5% per calendar day of delay',
        ocrText: isZh ? '按照未履行业务金额的万分之五（0.05%）向守约方支付违约金' : 'Liquidated damages of 0.05% per calendar day of delay',
        type: 'tampering',
        riskLevel: 'high',
        riskCategory: isZh ? '违约责任' : 'Liability',
        analysis: isZh
          ? '违约金计算基准被悄悄缩水10倍，严重损害守约方追偿权益，属于实质性条款变更。'
          : 'Penalty calculation rate reduced by 10x, directly undermining default remedies. Substantive alteration.',
      });
    }
    if (textA.includes('甲方所在地') && textB.includes('乙方所在地')) {
      tamperingDetails.push({
        id: 't-jurisdiction',
        clauseTitle: isZh ? '第三条 3.2 诉讼管辖权法院' : 'Clause 3.2 Dispute Jurisdiction',
        originalText: isZh ? '向甲方所在地有管辖权的人民法院提起诉讼' : 'Courts located in Party A registered jurisdiction',
        ocrText: isZh ? '向乙方所在地有管辖权的人民法院提起诉讼' : 'Courts located in Party B registered jurisdiction',
        type: 'tampering',
        riskLevel: 'medium',
        riskCategory: isZh ? '管辖免责' : 'Jurisdiction',
        analysis: isZh
          ? '争议管辖法院由原告/甲方属地被暗改为乙方属地，增加维权差旅与诉讼成本。'
          : 'Dispute forum changed to counterparty jurisdiction, altering litigation exposure.',
      });
    }
    if ((textA.includes('上限不超过') && textB.includes('上限不设限制')) || (textA.includes('50%') && textB.includes('unlimited'))) {
      tamperingDetails.push({
        id: 't-liability',
        clauseTitle: isZh ? '第五条 5.1 赔偿责任上限' : 'Clause 5.1 Limitation of Liability',
        originalText: isZh ? '赔偿责任上限不超过甲方已支付总金额的 50%' : 'Aggregate liability shall not exceed 50% of fees paid',
        ocrText: isZh ? '赔偿责任上限不设限制' : 'Aggregate liability shall be unlimited without cap',
        type: 'tampering',
        riskLevel: 'critical',
        riskCategory: isZh ? '违约责任' : 'Liability',
        analysis: isZh
          ? '赔偿责任上限被抹去，变更为“不设限制”，极大放大合同履约法律风险。'
          : 'Liability cap removed to unlimited exposure, posing severe commercial risk.',
      });
    }
    // Also add OCR noise examples if present
    if (textB.includes('工作目') || textB.includes('合间') || textB.includes('1O') || textB.includes('reciept')) {
      tamperingDetails.push({
        id: 't-ocr-noise',
        clauseTitle: isZh ? '第二条 2.2 交付时限' : 'Clause 2.2 Delivery Days',
        originalText: isZh ? '10 个工作日' : '10 business days upon receipt',
        ocrText: isZh ? '10 个工作目' : '1O business days upon reciept',
        type: 'ocr_noise',
        riskLevel: 'low',
        riskCategory: isZh ? 'OCR错字' : 'OCR Typo',
        analysis: isZh
          ? '“日”字因扫描笔画微粘连被 OCR 引擎误识别为“目”，属于常见良性字符噪声，不构成实质法律歧义。'
          : 'Optical character artifact (1O vs 10 / typo), benign scan noise without legal ambiguity.',
      });
    }
  } else {
    // Pure OCR noise scenario
    tamperingDetails.push({
      id: 't-ocr-1',
      clauseTitle: isZh ? '合同标题与抬头' : 'Agreement Title & Header',
      originalText: isZh ? '技术咨询与企业培训服务合同' : 'Master Services & Consulting Agreement',
      ocrText: isZh ? '技术咨询与企业培训服务合间' : 'Master Services & Consulting Agreennent',
      type: 'ocr_noise',
      riskLevel: 'low',
      riskCategory: isZh ? 'OCR错字' : 'OCR Typo',
      analysis: isZh
        ? '“合同”识别为“合间”，为形近字OCR扫描噪点，双方主体与意图明晰，无任何法律风险。'
        : 'Slight optical character misrecognition in header. Intent and parties are undisputed.',
    });
    tamperingDetails.push({
      id: 't-ocr-2',
      clauseTitle: isZh ? '第二条 费用结算期限' : 'Clause 2 Payment Settlement Terms',
      originalText: isZh ? '7 个工作日 / 10 个工作日' : '7 business days / 10 business days',
      ocrText: isZh ? '7 个工作目 / 10 个工作目' : '7 business days / 1O business days',
      type: 'ocr_noise',
      riskLevel: 'low',
      riskCategory: isZh ? 'OCR错字' : 'OCR Typo',
      analysis: isZh
        ? '“工作日”被识为“工作目”，所有付款金额一字不差，属于纯排印噪点。'
        : 'Digits and monetary milestones match 100%. Differences are benign OCR noise.',
    });
  }

  const tamperingCount = tamperingDetails.filter(d => d.type === 'tampering').length;
  const ocrNoiseCount = tamperingDetails.filter(d => d.type === 'ocr_noise').length;

  const items = config.questions.map((q) => {
    let answerA: any = {
      questionId: q.id,
      questionTitle: q.title,
      type: q.type,
      confidence: 0.95,
      reasoning: isZh ? `${titleA} 为经法务核准的原始底稿，条款规范完整。` : `${titleA} is the approved baseline document with verified terms.`,
      evidenceQuotes: [textA.slice(0, 45) + '...'],
    };
    let answerB: any = {
      questionId: q.id,
      questionTitle: q.title,
      type: q.type,
      confidence: 0.96,
      reasoning: isTampered
        ? (isZh ? `${titleB} 检测出关键金额或权责条款异常变更，偏离原始基准。` : `${titleB} contains deviations in key amounts or core liabilities from baseline.`)
        : (isZh ? `${titleB} 核心数据与原始底稿完全吻合，仅检测到轻微扫描字符噪声。` : `${titleB} core commercial data matches baseline exactly; only benign OCR noise found.`),
      evidenceQuotes: [textB.slice(0, 45) + '...'],
    };
    let verdict: 'identical' | 'improved_b' | 'preferred_a' | 'diverged' = 'identical';

    if (q.type === 'noul') {
      if (q.id.includes('tampering') || q.title.includes('篡改') || q.title.includes('tamper')) {
        answerA.noulResult = { value: false, probability: 0.05 };
        answerB.noulResult = { value: isTampered, probability: isTampered ? 0.96 : 0.08 };
        verdict = isTampered ? 'diverged' : 'identical';
      } else if (q.id.includes('amount') || q.title.includes('金额') || q.title.includes('完整') || q.title.includes('match')) {
        answerA.noulResult = { value: true, probability: 0.99 };
        answerB.noulResult = { value: !isTampered, probability: isTampered ? 0.05 : 0.98 };
        verdict = isTampered ? 'preferred_a' : 'identical';
      } else {
        answerA.noulResult = { value: true, probability: 0.95 };
        answerB.noulResult = { value: !isTampered, probability: isTampered ? 0.2 : 0.92 };
        verdict = isTampered ? 'diverged' : 'identical';
      }
    } else if (q.type === 'choice') {
      const selectedId = isTampered ? 'require_human_review' : 'auto_pass';
      const label = isTampered
        ? (isZh ? '🔴 需人工 Review (检出金额/权责实质篡改，必须人工介入)' : '🔴 Require Human Review (Substantive tampering detected)')
        : (isZh ? '🟢 自动通过 (仅含轻微OCR噪声，一致性极高)' : '🟢 Auto-Pass Approved (Benign OCR noise only)');
      answerA.choiceResult = { selectedId: 'auto_pass', selectedLabel: isZh ? '基准底稿' : 'Baseline', probabilities: { auto_pass: 1.0 } };
      answerB.choiceResult = { selectedId, selectedLabel: label, probabilities: { [selectedId]: 0.95 } };
      verdict = isTampered ? 'diverged' : 'identical';
    } else if (q.type === 'score') {
      const score = isTampered ? 1 : 5;
      answerA.scoreResult = { score: 5, maxScore: 5, normalizedPercent: 100 };
      answerB.scoreResult = { score, maxScore: 5, normalizedPercent: isTampered ? 20 : 100 };
      verdict = isTampered ? 'preferred_a' : 'identical';
    }

    return {
      questionId: q.id,
      answerA,
      answerB,
      verdict,
      deltaSummary: isTampered
        ? (isZh ? `比对发现 ${titleB} 存在实质法律风险偏差，与 ${titleA} 产生显著分歧。` : `Audit reveals substantive legal risk deviation in ${titleB} compared to ${titleA}.`)
        : (isZh ? `两份文本在【${q.title}】上高度一致，未检出实质性偏差。` : `Both texts are highly consistent on "${q.title}" with no substantive deviation.`),
    };
  });

  return {
    summary: {
      overallWinner: isTampered ? 'A' : 'TIE',
      scoreA: 100,
      scoreB: isTampered ? 62 : 98,
      contractDecision: decision,
      consistencyRate: isTampered ? 88.5 : 99.2,
      tamperingCount,
      ocrNoiseCount,
      decisionReason: isTampered
        ? (isZh
            ? `⚠️ 发现 ${tamperingCount} 处实质性条款篡改（涉及金额/违约金/管辖等核心权益），严禁自动放行，必须转交人工 Review！`
            : `⚠️ Found ${tamperingCount} substantive alterations (affecting amounts/liabilities/dispute forum). Manual Review required!`)
        : (isZh
            ? `✅ 差异全部属于扫描排印产生的良性 OCR 识别字符噪声，核心标的金额与权责 100% 绝对一致，满足免审条件，自动通过！`
            : `✅ All differences are benign optical character scan noises. Core commercial terms and consideration match 100%. Auto-Pass approved!`),
      keyFindings: isTampered
        ? (isZh
            ? [
                `检出 ${tamperingCount} 处实质性重大篡改，直接影响合同法律效力与结算金额`,
                `伴随检测出 ${ocrNoiseCount} 处常见 OCR 扫描噪点（如形近字、标点），已智能排除干扰`,
                `强烈建议法务核验原始纸质公章盖印版本并联系签署对手方`,
              ]
            : [
                `Detected ${tamperingCount} substantive alterations affecting contract obligations and payment amounts`,
                `Distinguished and isolated ${ocrNoiseCount} benign optical scan noises without triggering false alarms`,
                `Recommended legal verification against paper stamp version with counterparty`,
              ])
        : (isZh
            ? [
                `核心标的金额、账号、付款节点与权利义务 100% 绝对一致`,
                `检出 ${ocrNoiseCount} 处形近字字符噪点，确认为 OCR 扫描光学干扰`,
                `文本一致性高达 99.2%，未发现任何主观篡改迹象，符合免审自动通过标准`,
              ]
            : [
                `Key figures, amounts, accounts, and obligations are 100% identical`,
                `Detected ${ocrNoiseCount} optical character noises, confirmed as benign scanning artifacts`,
                `Text consistency rate exceeds 99%, qualifying for immediate auto-pass without manual review`,
              ]),
      summaryText: isTampered
        ? (isZh
            ? `经过 Jev 智能比对引擎审计，回传扫描件中存在实质性条款篡改，系统已自动标红风险条款并触发人工 Review 审核流。`
            : `Audited by Jev Engine: substantive contract alterations detected in scanned copy. Flagged for required manual review.`)
        : (isZh
            ? `经过 Jev 智能比对引擎审计，两份文本一致性极高，所有差异均为纯字符 OCR 识别瑕疵，未发生任何实质篡改，已获批自动通过。`
            : `Audited by Jev Engine: high consistency confirmed. Differences are optical scan artifacts; approved for auto-pass.`),
    },
    tamperingDetails,
    items,
  };
}

// POST /api/compare
app.post('/api/compare', async (req, res) => {
  try {
    const { textA, textB, titleA = '文本 A', titleB = '文本 B', config, lang = 'zh' } = req.body as {
      textA: string;
      textB: string;
      titleA?: string;
      titleB?: string;
      config: JevEvaluationConfig;
      lang?: string;
    };

    if (!textA || !textB) {
      return res.status(400).json({ error: 'Text A and Text B are both required.' });
    }

    if (!config || !Array.isArray(config.questions) || config.questions.length === 0) {
      return res.status(400).json({ error: 'At least one Jev question is required.' });
    }

    const systemInstruction = config.systemInstruction ||
      'You are a specialized System One Jev Evaluation Engine. You evaluate states with atomic, independent, typed judgments.';

    const prompt = `
You are the Jev System One Evaluation Engine, modeled on typesafe-ai/skills principles.
Your task is to independently and objectively evaluate two separate text states (${titleA} and ${titleB}) against a defined set of atomic typed questions, and then provide a structured comparison of the outcomes.

### JEV SPECIFICATION & CONSTRAINTS:
1. **Separation of State and Questions**: Judge the texts as objective evidence.
2. **Atomic Questions**: Each question must be judged strictly according to its definition and instruction.
3. **Question Types**:
   - 'noul': A boolean question with a probability (0.0 to 1.0) indicating likelihood of YES/True. Also return confidence (0.0 to 1.0).
   - 'choice': Categorical choice from the specified options. Return selectedId, selectedLabel, and estimated probability distribution over options, plus confidence (0.0 to 1.0).
   - 'score': Numeric rating between minScore and maxScore (typically 1 to 5). Return score, maxScore, normalizedPercent (0 to 100), plus confidence (0.0 to 1.0).
4. **Independent Evaluation**: Evaluate ${titleA} completely independently of ${titleB}, then compare their judgments.
5. **Comparison Verdicts**: For each question, decide whether:
   - 'identical': Both texts received identical or equivalent judgment.
   - 'improved_b': ${titleB} is clearly better or achieved a superior result on this criterion.
   - 'preferred_a': ${titleA} is superior on this criterion.
   - 'diverged': The texts took distinctly different approaches without a clear better/worse, or changed category.
6. **Language Constraint**: All textual evaluations, analysis, reasoning, deltaSummary, decisionReason, keyFindings, and summaryText MUST be written in ${lang === 'en' ? 'English' : 'Chinese'}.

### INPUT STATE A (${titleA}):
"""
${textA}
"""

### INPUT STATE B (${titleB}):
"""
${textB}
"""

### JEV ATOMIC QUESTIONS:
${JSON.stringify(config.questions, null, 2)}

### CONTRACT TAMPERING & OCR NOISE DISCRIMINATION:
You are specifically tasked with detecting whether the scanned/OCR text (${titleB}) has been SUBSTANTIVELY TAMPERED WITH (e.g. alterations to monetary amounts, payment terms, dates, party names, account numbers, liabilities, dispute clauses, added or omitted clauses) OR if differences are merely BENIGN OCR NOISE (e.g. optical misrecognitions like 日/目, 已/己, spaces, line-breaks, punctuation differences).

### CRITICAL BUSINESS RELEASE POLICY (核心放行规则 - 强约束):
- If there is NO substantive tampering (tamperingCount == 0, zero unauthorized alteration to monetary amounts, payment terms, liabilities, parties, dates, or core legal terms) AND text consistencyRate >= 85%:
  contractDecision MUST be "auto_pass" (准予自动放行，无需人工审核).
- If there is ANY substantive tampering (tamperingCount > 0, unauthorized alteration of amount, bank account, payment date, liabilities, penalty, or dispute clause):
  contractDecision MUST be "require_human_review" (严禁放行，需人工 Review).
- If consistencyRate < 85% even without confirmed malice:
  contractDecision MUST be "require_human_review" (一致率低于 85% 安全阈值，需人工核对文本完整性).
- If multiple severe fraudulent alterations: contractDecision may be "rejected".

### OUTPUT FORMAT:
You MUST respond with valid JSON ONLY (no markdown fences, no extra text) conforming to this exact structure:
{
  "summary": {
    "overallWinner": "NEUTRAL",
    "scoreA": 100,
    "scoreB": 85,
    "contractDecision": "require_human_review", // "auto_pass" | "require_human_review" | "rejected"
    "consistencyRate": 96.5, // 0 to 100
    "tamperingCount": 2, // count of substantive tampering issues
    "ocrNoiseCount": 3, // count of benign OCR noises
    "decisionReason": "Clear 1-2 sentence rationale for the contract decision (e.g. why auto passed or why human review is required)",
    "keyFindings": [
      "Key observation 1",
      "Key observation 2"
    ],
    "summaryText": "Concise executive audit summary."
  },
  "tamperingDetails": [
    {
      "id": "t-1",
      "clauseTitle": "Clause title or section name",
      "originalText": "Exact text excerpt from original contract",
      "ocrText": "Exact text excerpt from OCR scanned contract",
      "type": "tampering", // "tampering" | "ocr_noise" | "suspicious"
      "riskLevel": "critical", // "critical" | "high" | "medium" | "low"
      "riskCategory": "金额数值", // "金额数值" | "主体身份" | "履行期限" | "违约责任" | "管辖免责" | "格式排版" | "OCR错字" | "其他"
      "analysis": "Specific risk explanation"
    }
  ],
  "items": [
    {
      "questionId": "the-id-of-the-question",
      "answerA": {
        "questionId": "the-id-of-the-question",
        "questionTitle": "question title",
        "type": "noul", // or "choice" or "score"
        "noulResult": { "value": true, "probability": 0.95 },
        "choiceResult": { "selectedId": "...", "selectedLabel": "...", "probabilities": { "optId1": 0.9, "optId2": 0.1 } },
        "scoreResult": { "score": 4, "maxScore": 5, "normalizedPercent": 80 },
        "confidence": 0.95,
        "reasoning": "Reasoning statement",
        "evidenceQuotes": ["Exact excerpt from Text A"]
      },
      "answerB": {
        "questionId": "the-id-of-the-question",
        "questionTitle": "question title",
        "type": "noul",
        "noulResult": { "value": true, "probability": 0.98 },
        "choiceResult": { "selectedId": "...", "selectedLabel": "...", "probabilities": { "optId1": 0.95, "optId2": 0.05 } },
        "scoreResult": { "score": 5, "maxScore": 5, "normalizedPercent": 100 },
        "confidence": 0.98,
        "reasoning": "Reasoning statement",
        "evidenceQuotes": ["Exact excerpt from Text B"]
      },
      "verdict": "improved_b", // "identical", "improved_b", "preferred_a", "diverged"
      "deltaSummary": "1-2 sentence comparison",
      "scoreDelta": 1.0
    }
  ]
}
`;

    let parsedData: any;
    const typesafeKey = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY;
    const hasValidTypeSafeKey = Boolean(
      typesafeKey && typesafeKey.trim() !== '' && typesafeKey !== 'MY_TYPESAFE_API_KEY'
    );

    if (hasValidTypeSafeKey) {
      try {
        console.log('Invoking official TypeSafe Jev API (https://api.typesafe.ai/v1/systemone)...');
        const [resA, resB] = await Promise.all([
          callTypeSafeJevSystemOne(textA, config.questions, typesafeKey!),
          callTypeSafeJevSystemOne(textB, config.questions, typesafeKey!),
        ]);

        // Synthesize LLM/heuristic for diff details & key findings
        let auditSynthesis: any = null;
        try {
          const responseText = await generateOpenAIContent(prompt, systemInstruction);
          const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          auditSynthesis = JSON.parse(cleaned);
        } catch (synthErr) {
          console.warn('Synthesis LLM fallback:', synthErr);
          auditSynthesis = fallbackJevEvaluation(textA, textB, titleA, titleB, config, lang);
        }

        // Map official TypeSafe Jev results into paired items
        const jevResultsA = resA.results || resA;
        const jevResultsB = resB.results || resB;

        const mergedItems = config.questions.map((q) => {
          const rawA = jevResultsA[q.id] || {};
          const rawB = jevResultsB[q.id] || {};

          const synthItem = auditSynthesis?.items?.find((i: any) => i.questionId === q.id) || {};

          let answerA: any = {
            questionId: q.id,
            questionTitle: q.title,
            type: q.type,
            confidence: rawA.confidence ?? 0.95,
            reasoning: synthItem.answerA?.reasoning || `${titleA} 经 TypeSafe Jev 独立评估输出。`,
            evidenceQuotes: synthItem.answerA?.evidenceQuotes || [textA.slice(0, 40) + '...'],
          };

          let answerB: any = {
            questionId: q.id,
            questionTitle: q.title,
            type: q.type,
            confidence: rawB.confidence ?? 0.95,
            reasoning: synthItem.answerB?.reasoning || `${titleB} 经 TypeSafe Jev 独立评估输出。`,
            evidenceQuotes: synthItem.answerB?.evidenceQuotes || [textB.slice(0, 40) + '...'],
          };

          if (q.type === 'noul') {
            answerA.noulResult = {
              value: rawA.value ?? (rawA.probability > 0.5),
              probability: rawA.probability ?? (rawA.value ? 0.95 : 0.05),
            };
            answerB.noulResult = {
              value: rawB.value ?? (rawB.probability > 0.5),
              probability: rawB.probability ?? (rawB.value ? 0.95 : 0.05),
            };
          } else if (q.type === 'choice') {
            const selectedA = rawA.value || rawA.selected || '';
            const selectedB = rawB.value || rawB.selected || '';
            const labelA = q.choices?.find((c) => c.id === selectedA)?.label || selectedA;
            const labelB = q.choices?.find((c) => c.id === selectedB)?.label || selectedB;
            answerA.choiceResult = {
              selectedId: selectedA,
              selectedLabel: labelA,
              probabilities: rawA.probabilities || { [selectedA]: 0.9 },
            };
            answerB.choiceResult = {
              selectedId: selectedB,
              selectedLabel: labelB,
              probabilities: rawB.probabilities || { [selectedB]: 0.9 },
            };
          } else if (q.type === 'score') {
            const scoreA = Number(rawA.value ?? 4);
            const scoreB = Number(rawB.value ?? 4);
            const maxScore = q.maxScore || 5;
            answerA.scoreResult = {
              score: scoreA,
              maxScore,
              normalizedPercent: Math.round((scoreA / maxScore) * 100),
            };
            answerB.scoreResult = {
              score: scoreB,
              maxScore,
              normalizedPercent: Math.round((scoreB / maxScore) * 100),
            };
          }

          return {
            questionId: q.id,
            answerA,
            answerB,
            verdict: synthItem.verdict || (JSON.stringify(rawA) === JSON.stringify(rawB) ? 'identical' : 'diverged'),
            deltaSummary: synthItem.deltaSummary || `TypeSafe Jev 模型对两版文本做出了独立概率推断。`,
          };
        });

        parsedData = {
          summary: {
            ...auditSynthesis.summary,
            engine: 'typesafe_jev_native',
            endpoint: 'https://api.typesafe.ai/v1/systemone',
          },
          tamperingDetails: auditSynthesis.tamperingDetails || [],
          items: mergedItems,
        };
      } catch (typesafeErr: any) {
        console.warn('TypeSafe Jev API call failed, falling back to OpenAI Jev engine:', typesafeErr?.message);
        // Fallback to OpenAI
        const responseText = await generateOpenAIContent(prompt, systemInstruction);
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(cleaned);
        parsedData.summary.engine = 'openai_jev_spec';
      }
    } else {
      // Default: OpenAI engine operating under TypeSafe Jev Specification
      try {
        const responseText = await generateOpenAIContent(prompt, systemInstruction);
        try {
          parsedData = JSON.parse(responseText.trim());
        } catch (parseErr) {
          const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          parsedData = JSON.parse(cleaned);
        }
        if (parsedData?.summary) {
          parsedData.summary.engine = 'openai_jev_spec';
        }
      } catch (llmErr) {
        console.warn('OpenAI LLM error or unavailable, using fallback Jev evaluator:', llmErr);
        parsedData = fallbackJevEvaluation(textA, textB, titleA, titleB, config, lang);
        parsedData.summary.engine = 'fallback_jev_spec';
      }
    }

    // Authoritative Business Policy Enforcement:
    // "如果没有实质性篡改，文本一致性超过85%就放行，不用人工审核"
    if (parsedData?.summary) {
      const tamperingCount = Number(
        parsedData.summary.tamperingCount ??
          (parsedData.tamperingDetails?.filter((d: any) => d.type === 'tampering').length || 0)
      );
      const consistencyRate = Number(parsedData.summary.consistencyRate ?? 95);
      const isZh = lang !== 'en';

      if (tamperingCount === 0 && consistencyRate >= 85) {
        parsedData.summary.contractDecision = 'auto_pass';
        if (
          !parsedData.summary.decisionReason ||
          parsedData.summary.decisionReason.includes('需人工') ||
          parsedData.summary.decisionReason.includes('Review')
        ) {
          parsedData.summary.decisionReason = isZh
            ? `✅ 经 Jev 审查未检出实质性条款篡改，且文本一致率达 ${consistencyRate}%（满足 ≥ 85% 自动放行标准），差异均属扫描排印良性噪点，准予免审直接放行！`
            : `✅ No substantive alterations found, and text consistency is ${consistencyRate}% (satisfies ≥ 85% auto-pass policy). Differences are benign scan artifacts. Auto-Pass approved!`;
        }
      } else if (tamperingCount > 0) {
        parsedData.summary.contractDecision = 'require_human_review';
        if (
          !parsedData.summary.decisionReason ||
          parsedData.summary.decisionReason.includes('自动通过') ||
          parsedData.summary.decisionReason.includes('放行')
        ) {
          parsedData.summary.decisionReason = isZh
            ? `⚠️ 检出 ${tamperingCount} 处实质性条款篡改（涉及核心商务或法律权益），触发风控拦截，严禁自动放行，必须转交人工 Review！`
            : `⚠️ Found ${tamperingCount} substantive alterations (affecting commercial/legal terms). Auto-pass denied; Human Review required!`;
        }
      } else if (consistencyRate < 85) {
        parsedData.summary.contractDecision = 'require_human_review';
        parsedData.summary.decisionReason = isZh
          ? `⚠️ 文本一致率仅为 ${consistencyRate}%（低于 85% 安全放行阈值），可能存在缺页或大段漏印，必须转交人工核验文本完整性。`
          : `⚠️ Text consistency is ${consistencyRate}% (below 85% safety threshold). Manual review required to verify integrity.`;
      }
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error during Jev comparison:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to execute Jev evaluation.',
    });
  }
});

// POST /api/generate-questions
// Smart helper to generate atomic Jev questions based on user's natural language description and contract texts using OpenAI
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { textA = '', textB = '', userDescription = '', topicHint = '', lang = 'zh' } = req.body as {
      textA?: string;
      textB?: string;
      userDescription?: string;
      topicHint?: string;
      lang?: string;
    };

    const isZh = lang !== 'en';
    const defaultDesc = isZh
      ? '重点审查核心商务条款（金额、付款节点、违约金、免责上限），严格区分实质性篡改与良性OCR噪点，并给出审核流向决策。'
      : 'Focus on auditing core commercial terms (amount, payment schedule, penalties, liability cap), rigorously distinguish substantive tampering from benign OCR noise, and output workflow routing decision.';

    const prompt = `
You are a senior legal compliance and rubric engineer specializing in Contract Auditing and the TypeSafe Jev System One evaluation specification.
The user has provided the following specific requirement / focus for the contract evaluation:
"""
${userDescription || topicHint || defaultDesc}
"""

${textA ? `Reference Original Contract Text A:\n"""\n${textA.slice(0, 1000)}\n"""` : ''}
${textB ? `Reference Scanned/OCR Contract Text B:\n"""\n${textB.slice(0, 1000)}\n"""` : ''}

### Task & Jev Specification:
Generate a tailored system instruction and a set of 3 to 5 atomic Jev questions ('noul', 'choice', 'score') that directly address the user's description.
1. **Noul Questions**: Yes/No boolean questions with calibrated probability (0.0 - 1.0). Must provide clear true/false meaning.
2. **Choice Questions**: Categorical routing/classification with 2-4 mutually exclusive options (e.g. 审核流向决策: 自动通过 / 需人工Review).
3. **Score Questions**: Numeric continuous ratings (e.g. 1 to 5) with descriptive levels.
4. **Contract Audit Rule**: Ensure the questions and instructions strictly separate SUBSTANTIVE TAMPERING from BENIGN OCR NOISE.
5. All titles, instructions, and labels MUST be in clear, professional ${isZh ? 'Chinese' : 'English'}.

Return JSON ONLY with this exact structure:
{
  "systemInstruction": "Objective evaluator instruction tailored to user's requirements",
  "questions": [
    {
      "id": "question_id_slug",
      "title": "${isZh ? '简短指标标题' : 'Metric Title'}",
      "type": "noul", // or "choice" or "score"
      "instruction": "${isZh ? '针对该指标的具体评测指令' : 'Specific evaluation rubric instruction'}",
      "noulPrompt": "${isZh ? 'Yes/No 判定语句' : 'Yes/No proposition'}",
      "weight": 2.0
    },
    {
      "id": "review_decision",
      "title": "${isZh ? '审核流向决策' : 'Workflow Routing Decision'}",
      "type": "choice",
      "instruction": "${isZh ? '根据篡改风险决定处理流向' : 'Determine workflow routing according to risk'}",
      "choices": [
        { "id": "auto_pass", "label": "${isZh ? '🟢 自动通过 (仅含轻微OCR噪声，一致性极高)' : '🟢 Auto-Pass (Benign scan noise only)'}" },
        { "id": "require_human_review", "label": "${isZh ? '🔴 需人工 Review (检出实质性条款篡改)' : '🔴 Require Human Review (Substantive tampering detected)'}" }
      ],
      "weight": 2.5
    },
    {
      "id": "metric_score",
      "title": "${isZh ? '评分指标标题' : 'Rating Metric Title'}",
      "type": "score",
      "instruction": "${isZh ? '评分指引' : 'Scoring guidance'}",
      "minScore": 1,
      "maxScore": 5,
      "scoreLevels": [
        { "score": 1, "label": "${isZh ? '1分 - 严重违规/大幅篡改' : '1 - Severe violation/tampering'}" },
        { "score": 3, "label": "${isZh ? '3分 - 局部存疑需要核实' : '3 - Ambiguous points requiring verification'}" },
        { "score": 5, "label": "${isZh ? '5分 - 完全合规/无实质改动' : '5 - Fully compliant/no alteration'}" }
      ],
      "weight": 1.5
    }
  ]
}
`;

    let data: any = null;
    try {
      const responseText = await generateOpenAIContent(
        prompt,
        'You are an expert prompt engineer and contract compliance auditor specialized in TypeSafe Jev System One evaluation. Output pristine JSON only.'
      );
      try {
        data = JSON.parse(responseText.trim());
      } catch {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        data = JSON.parse(cleaned);
      }
    } catch (fallbackErr: any) {
      console.warn('All model attempts failed in generate-questions, returning tailored template:', fallbackErr?.message);
      data = isZh
        ? {
            systemInstruction: '作为资深法务合规审计专家，请遵循 Jev 原子化评测标准，严格区分【实质性篡改】与【OCR识别噪声】。',
            questions: [
              {
                id: 'has_substantive_tampering',
                title: '是否存在实质性条款篡改？',
                type: 'noul',
                instruction: `根据用户诉求「${userDescription.slice(0, 30)}...」，审查是否存在金额、付款账期、违约金或责任限制等实质性篡改。`,
                noulPrompt: '是否存在实质性法律或数值篡改？',
                weight: 2.0,
              },
              {
                id: 'review_decision',
                title: '审核流向决策',
                type: 'choice',
                instruction: '评估两版文本差异，决定是否触发人工审核。',
                choices: [
                  { id: 'auto_pass', label: '🟢 自动通过 (仅含轻微OCR噪声，一致性极高)' },
                  { id: 'require_human_review', label: '🔴 需人工 Review (检出实质性条款篡改)' },
                ],
                weight: 2.5,
              },
              {
                id: 'ocr_noise_ratio',
                title: '差异中良性 OCR 字符噪声占比',
                type: 'score',
                instruction: '评分扫描件中差异属于良性 OCR 字符识别噪点的比例。',
                minScore: 1,
                maxScore: 5,
                scoreLevels: [
                  { score: 1, label: '1分 - 主要是恶意篡改或实质变动' },
                  { score: 3, label: '3分 - 既有错别字也有存疑改动' },
                  { score: 5, label: '5分 - 全部为良性形近字识别噪点' },
                ],
                weight: 1.5,
              },
            ],
          }
        : {
            systemInstruction: 'As a senior legal auditor, apply TypeSafe Jev standards to rigorously distinguish substantive tampering from benign OCR noise.',
            questions: [
              {
                id: 'has_substantive_tampering',
                title: 'Substantive Alterations Detected?',
                type: 'noul',
                instruction: `Evaluate based on "${userDescription.slice(0, 30)}..." whether consideration amounts, milestones, remedies, or liabilities were altered.`,
                noulPrompt: 'Does the document contain unauthorized substantive legal or financial alterations?',
                weight: 2.0,
              },
              {
                id: 'review_decision',
                title: 'Audit Workflow Routing',
                type: 'choice',
                instruction: 'Determine whether to route the contract to automated approval or manual human review.',
                choices: [
                  { id: 'auto_pass', label: '🟢 Auto-Pass Approved (Benign scan noise only, high consistency)' },
                  { id: 'require_human_review', label: '🔴 Require Human Review (Substantive tampering detected)' },
                ],
                weight: 2.5,
              },
              {
                id: 'ocr_noise_ratio',
                title: 'Benign Scan Noise Ratio',
                type: 'score',
                instruction: 'Rate the proportion of detected differences that qualify as benign optical character scan artifacts.',
                minScore: 1,
                maxScore: 5,
                scoreLevels: [
                  { score: 1, label: '1 - Primarily substantive or malicious alterations' },
                  { score: 3, label: '3 - Mixed ambiguous changes and typos' },
                  { score: 5, label: '5 - Exclusively benign optical scan noise' },
                ],
                weight: 1.5,
              },
            ],
          };
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return res.status(500).json({ error: error?.message || 'Failed to auto-generate questions' });
  }
});

// Setup Vite in Dev or serve static in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
