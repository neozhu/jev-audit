import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { JevEvaluationConfig, JevQuestion, JevRawAnswer } from './src/types/jev';
import { calculateConsistency, isValidConsistencyConfig } from './src/utils/consistency';
import { createConsistencyConfig } from './src/data/presets';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-6-luna';

// Official TypeSafe Jev System One Model API Caller (https://api.typesafe.ai/v1/systemone)
async function callTypeSafeJevSystemOne(state: object, questions: JevQuestion[], apiKey: string) {
  const typesafeQuestions: Record<string, any> = {};

  for (const q of questions) {
    if (q.type === 'noul') {
      typesafeQuestions[q.id] = {
        type: 'noul',
        instructions: q.instruction,
        criteria: {
          true: q.noulPrompt,
          false: q.noulFalsePrompt || 'The compared terms have different substantive meaning or one is missing.',
        },
      };
    } else if (q.type === 'choice') {
      typesafeQuestions[q.id] = {
        type: 'choice',
        instructions: q.instruction,
        criteria: Object.fromEntries((q.choices || []).map((choice) => [choice.id, choice.label])),
      };
    } else {
      typesafeQuestions[q.id] = {
        type: 'score',
        instructions: q.instruction,
        criteria: (q.scoreLevels || []).map((level) => level.label),
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
    if (!isValidConsistencyConfig(config)) {
      return res.status(400).json({ error: 'Invalid Jev consistency questions or scoring criteria.' });
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
    const state = {
      baseline: { title: titleA, text: textA },
      scanned: { title: titleB, text: textB },
      comparisonPolicy: config.systemInstruction,
    };
    const result = await callTypeSafeJevSystemOne(state, config.questions, typesafeKey);
    const answers = result.answers;
    const { consistencyRate, contractDecision } = calculateConsistency(config.questions, answers || {});
    return res.json({
      consistencyRate,
      contractDecision,
      evaluations: config.questions.map((question) => ({
        question,
        answer: answers[question.id] as JevRawAnswer,
      })),
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
    const fallback = createConsistencyConfig(isZh ? 'zh' : 'en');
    const prompt = `Create exactly FOUR TypeSafe Jev questions for comparing TWO contracts in one structured state.
User's audit focus: ${userDescription || topicHint || 'Core legal and commercial terms'}
Baseline excerpt: ${textA.slice(0, 1000)}
Scanned excerpt: ${textB.slice(0, 1000)}

The state fields are baseline.text, scanned.text, and comparisonPolicy. Keep the exact question IDs, types, Choice option IDs, consistentChoices, Score level order (0 through 4), invertForConsistency, and weights in the template below. Refine the wording for the user's focus without narrowing the overall contract comparison. For substantive_match, YES means all substantive terms match. For human_edit_signs, YES means observable signs of deliberate textual modification, not proof of who edited or why. The Choice must separate identical/formatting, harmless OCR, substantive change, and unrelated pages. The Score levels must run from unrelated or strongly changed to fully consistent. Ignore only OCR or formatting noise that cannot change meaning. Do not put the 90% threshold in a question; code computes the decision.
Use ${isZh ? 'Chinese' : 'English'} for titles, instructions, and criteria. Return JSON only, without comments, using this structure:
${JSON.stringify(fallback, null, 2)}`;

    let data: JevEvaluationConfig = fallback;
    try {
      const responseText = await generateOpenAIContent(
        prompt,
        'Write precise TypeSafe Jev Noul, Choice, and Score comparison questions. Return valid JSON only.'
      );
      const cleaned = responseText.trim().replace(/^```json\s*|^```\s*|\s*```$/g, '');
      const parsed = JSON.parse(cleaned) as JevEvaluationConfig;
      if (!isValidConsistencyConfig(parsed) || parsed.questions.length !== 4 ||
          parsed.questions.some((question, index) => question.id !== fallback.questions[index].id ||
            question.type !== fallback.questions[index].type) ||
          parsed.questions[1].invertForConsistency !== true ||
          parsed.questions[2].consistentChoices?.join(',') !== 'same,ocr') {
        throw new Error('Generated questions did not match the consistency rubric.');
      }
      data = parsed;
    } catch (generationError: any) {
      console.warn('Question generation failed; using the default consistency rubric:', generationError?.message);
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
