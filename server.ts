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
    engine: hasTypeSafeKey ? 'typesafe_jev_native' : 'jev_key_required',
    typesafeEndpoint: 'https://api.typesafe.ai/v1/systemone',
    model: 'jev-latest',
    openaiModel,
  });
});

// OpenAI is intentionally restricted to authoring Jev questions. Contract
// evaluation must never pass through this function.
async function generateOpenAIContent(prompt: string, systemInstruction?: string) {
  const { text } = await generateText({
    model: openai.responses(openaiModel),
    prompt,
    ...(systemInstruction ? { system: systemInstruction } : {}),
    providerOptions: {
      openai: { reasoningEffort: 'high' },
    },
    timeout: 25000,
  });
  if (!text) throw new Error('OpenAI returned an empty response');
  return text;
}

// POST /api/compare
// Contract content is sent only to the TypeSafe Jev API. OpenAI is used solely
// by /api/generate-questions and is never a comparison fallback or synthesizer.
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

    const typesafeKey = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY;
    if (!typesafeKey || !typesafeKey.trim() || typesafeKey === 'MY_TYPESAFE_API_KEY') {
      return res.status(503).json({
        error: lang === 'en'
          ? 'TYPESAFE_API_KEY is required. Contract comparison is performed exclusively by Jev; OpenAI only generates questions.'
          : '必须配置 TYPESAFE_API_KEY。合同比对仅由 Jev 完成；GPT 只负责生成问题。',
      });
    }

    console.log('Invoking official TypeSafe Jev API for contract comparison...');
    const [resA, resB] = await Promise.all([
      callTypeSafeJevSystemOne(textA, config.questions, typesafeKey),
      callTypeSafeJevSystemOne(textB, config.questions, typesafeKey),
    ]);
    const jevResultsA = resA.results || resA;
    const jevResultsB = resB.results || resB;
    const isZh = lang !== 'en';

    const items = config.questions.map((q) => {
      const rawA = jevResultsA[q.id] || {};
      const rawB = jevResultsB[q.id] || {};
      const makeAnswer = (raw: any, title: string) => {
        const answer: any = {
          questionId: q.id,
          questionTitle: q.title,
          type: q.type,
          confidence: Number(raw.confidence ?? 0),
          reasoning: raw.reasoning || (isZh ? `${title} 的结论由 Jev 原生模型生成。` : `${title} was evaluated by the native Jev model.`),
          evidenceQuotes: raw.evidenceQuotes || raw.evidence || [],
        };
        if (q.type === 'noul') {
          const probability = Number(raw.probability ?? (raw.value ? 1 : 0));
          answer.noulResult = { value: raw.value ?? probability > 0.5, probability };
        } else if (q.type === 'choice') {
          const selectedId = String(raw.value ?? raw.selected ?? raw.selectedId ?? '');
          answer.choiceResult = {
            selectedId,
            selectedLabel: q.choices?.find((choice) => choice.id === selectedId)?.label || raw.selectedLabel || selectedId,
            probabilities: raw.probabilities || (selectedId ? { [selectedId]: 1 } : {}),
          };
        } else {
          const score = Number(raw.value ?? raw.score ?? q.minScore ?? 1);
          const maxScore = q.maxScore || 5;
          answer.scoreResult = { score, maxScore, normalizedPercent: Math.round((score / maxScore) * 100) };
        }
        return answer;
      };
      const answerA = makeAnswer(rawA, titleA);
      const answerB = makeAnswer(rawB, titleB);
      const comparableA = q.type === 'noul' ? answerA.noulResult.value : q.type === 'choice' ? answerA.choiceResult.selectedId : answerA.scoreResult.score;
      const comparableB = q.type === 'noul' ? answerB.noulResult.value : q.type === 'choice' ? answerB.choiceResult.selectedId : answerB.scoreResult.score;
      const identical = comparableA === comparableB;
      return {
        questionId: q.id,
        answerA,
        answerB,
        verdict: identical ? 'identical' : 'diverged',
        deltaSummary: identical
          ? (isZh ? 'Jev 对两份合同给出了相同判定。' : 'Jev returned the same judgment for both contracts.')
          : (isZh ? 'Jev 对两份合同给出了不同判定。' : 'Jev returned different judgments for the contracts.'),
      };
    });

    const questionById = new Map(config.questions.map((question) => [question.id, question]));
    const reviewAnswer = items.find((item) => {
      const question = questionById.get(item.questionId);
      return /review|审核|decision/i.test(`${item.questionId} ${question?.title || ''}`);
    })?.answerB?.choiceResult?.selectedId;
    const tamperingAnswers = items.filter((item) => {
      const question = questionById.get(item.questionId);
      return /tamper|篡改/i.test(`${item.questionId} ${question?.title || ''}`);
    });
    const tamperingCount = tamperingAnswers.filter((item) => item.answerB?.noulResult?.value === true).length;
    const identicalCount = items.filter((item) => item.verdict === 'identical').length;
    const consistencyRate = Math.round((identicalCount / items.length) * 1000) / 10;
    // Only an explicit Jev workflow answer may auto-pass a contract. If the
    // configured questions do not produce one, fail closed for human review.
    const contractDecision = reviewAnswer === 'rejected'
      ? 'rejected'
      : reviewAnswer === 'auto_pass' && tamperingCount === 0
        ? 'auto_pass'
        : 'require_human_review';

    return res.json({
      summary: {
        overallWinner: 'NEUTRAL',
        scoreA: 100,
        scoreB: consistencyRate,
        contractDecision,
        consistencyRate,
        tamperingCount,
        ocrNoiseCount: 0,
        decisionReason: isZh
          ? reviewAnswer
            ? `Jev 工作流问题的原生结论为“${reviewAnswer}”。`
            : '当前问题集未返回明确的 Jev 工作流结论，已按安全策略转人工复核。'
          : reviewAnswer
            ? `The native Jev workflow answer is "${reviewAnswer}".`
            : 'The question set returned no explicit Jev workflow decision; the contract was routed to human review.',
        keyFindings: items.filter((item) => item.verdict !== 'identical').map((item) => item.answerB.reasoning),
        summaryText: isZh ? 'Jev 原生合同比对已完成。' : 'Native Jev contract comparison completed.',
        engine: 'typesafe_jev_native',
        endpoint: 'https://api.typesafe.ai/v1/systemone',
      },
      tamperingDetails: [],
      items,
    });
  } catch (error: any) {
    console.error('Error during Jev comparison:', error);
    return res.status(502).json({
      error: error?.message || 'Failed to execute native Jev evaluation.',
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
