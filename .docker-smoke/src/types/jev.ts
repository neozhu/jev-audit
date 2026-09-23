export type JevQuestionType = 'noul' | 'choice' | 'score';

export interface JevChoiceOption {
  id: string;
  label: string;
  description?: string;
}

export interface JevScoreLevel {
  score: number;
  label: string;
  description?: string;
}

export interface JevQuestion {
  id: string;
  title: string;
  type: JevQuestionType;
  instruction: string;
  noulPrompt?: string;
  choices?: JevChoiceOption[];
  minScore?: number;
  maxScore?: number;
  scoreLevels?: JevScoreLevel[];
  weight?: number;
}

export interface JevEvaluationConfig {
  systemInstruction: string;
  questions: JevQuestion[];
}

export interface JevNoulResult {
  value: boolean;
  probability: number;
}

export interface JevChoiceResult {
  selectedId: string;
  selectedLabel: string;
  probabilities: Record<string, number>;
}

export interface JevScoreResult {
  score: number;
  maxScore: number;
  normalizedPercent: number;
}

export interface JevAnswer {
  questionId: string;
  questionTitle: string;
  type: JevQuestionType;
  noulResult?: JevNoulResult;
  choiceResult?: JevChoiceResult;
  scoreResult?: JevScoreResult;
  confidence: number;
  reasoning: string;
  evidenceQuotes?: string[];
}

export type VerdictType = 'identical' | 'improved_b' | 'preferred_a' | 'diverged';

export interface JevComparisonItem {
  question: JevQuestion;
  answerA: JevAnswer;
  answerB: JevAnswer;
  verdict: VerdictType;
  deltaSummary: string;
  scoreDelta?: number;
}

export type ContractDecision = 'auto_pass' | 'require_human_review' | 'rejected';

export interface TamperingDetail {
  id: string;
  clauseTitle: string;
  originalText: string;
  ocrText: string;
  type: 'tampering' | 'ocr_noise' | 'suspicious';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskCategory: '金额数值' | '主体身份' | '履行期限' | '违约责任' | '管辖免责' | '格式排版' | 'OCR错字' | '其他';
  analysis: string;
  reviewed?: boolean;
}

export interface ComparisonSummary {
  overallWinner: 'A' | 'B' | 'TIE' | 'NEUTRAL';
  scoreA: number;
  scoreB: number;
  keyFindings: string[];
  summaryText: string;
  totalQuestions: number;
  identicalCount: number;
  divergedCount: number;
  // Specific to Contract Tampering vs OCR Noise
  contractDecision: ContractDecision;
  consistencyRate: number; // 0 - 100
  tamperingCount: number;
  ocrNoiseCount: number;
  decisionReason: string;
}

export interface DiffSegment {
  value: string;
  added?: boolean;
  removed?: boolean;
  diffType?: 'tampering' | 'ocr_noise' | 'normal';
}

export interface ComparisonReport {
  id: string;
  timestamp: string;
  titleA: string;
  titleB: string;
  textA: string;
  textB: string;
  config: JevEvaluationConfig;
  summary: ComparisonSummary;
  items: JevComparisonItem[];
  diffs: DiffSegment[];
  tamperingDetails: TamperingDetail[];
}
