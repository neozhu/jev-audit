import { JevEvaluationConfig, JevQuestion } from '../types/jev';

export function isValidConsistencyConfig(config: any): config is JevEvaluationConfig {
  if (!config || !Array.isArray(config.questions) || config.questions.length === 0 ||
      typeof config.systemInstruction !== 'string') return false;
  const ids = new Set<string>();
  for (const question of config.questions as JevQuestion[]) {
    if (!question || typeof question.id !== 'string' || !question.id || ids.has(question.id) ||
        typeof question.title !== 'string' || !question.title.trim() ||
        typeof question.instruction !== 'string' || !question.instruction.trim() ||
        !Number.isFinite(question.weight ?? 1) || (question.weight ?? 1) <= 0) return false;
    ids.add(question.id);
    if (question.type === 'noul') {
      if (!question.noulPrompt || (question.invertForConsistency && !question.noulFalsePrompt)) return false;
    } else if (question.type === 'choice') {
      const choices = question.choices || [];
      const matching = question.consistentChoices || [];
      if (choices.length < 2 || matching.length === 0 || matching.length >= choices.length ||
          new Set(choices.map((choice) => choice.id)).size !== choices.length ||
          choices.some((choice) => !choice.id || !choice.label) ||
          matching.some((id) => !choices.some((choice) => choice.id === id))) return false;
    } else if (question.type === 'score') {
      const levels = question.scoreLevels || [];
      if (levels.length < 2 || levels.length > 10 ||
          levels.some((level, index) => level.score !== index || !level.label)) return false;
    } else return false;
  }
  return true;
}

export function calculateConsistency(questions: JevQuestion[], answers: Record<string, any>) {
  let weightedProbability = 0;
  let totalWeight = 0;

  for (const question of questions) {
    const weight = question.weight ?? 1;
    const answer = answers[question.id];
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error(`Invalid consistency question: ${question.id}`);
    }
    let probability: number;
    if (question.type === 'noul' && answer?.type === 'noul') {
      probability = question.invertForConsistency ? 1 - answer.noul : answer.noul;
    } else if (question.type === 'choice' && answer?.type === 'choice' &&
        question.choices && question.choices.length >= 2 && question.consistentChoices?.length) {
      if (question.choices.some((choice) => typeof answer.probabilities?.[choice.id] !== 'number' ||
          !Number.isFinite(answer.probabilities[choice.id]) || answer.probabilities[choice.id] < 0 || answer.probabilities[choice.id] > 1) ||
          question.consistentChoices.some((id) => !question.choices?.some((choice) => choice.id === id))) {
        throw new Error(`Invalid Jev answer for question: ${question.id}`);
      }
      probability = question.consistentChoices.reduce((sum, id) => sum + answer.probabilities[id], 0);
    } else if (question.type === 'score' && answer?.type === 'score' && question.scoreLevels && question.scoreLevels.length >= 2) {
      probability = answer.score / (question.scoreLevels.length - 1);
    } else {
      throw new Error(`Invalid consistency question or Jev answer: ${question.id}`);
    }
    if (typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new Error(`Invalid Jev answer for question: ${question.id}`);
    }
    weightedProbability += weight * probability;
    totalWeight += weight;
  }

  if (totalWeight === 0) throw new Error('At least one consistency question is required.');
  const consistencyRate = Math.round((weightedProbability / totalWeight) * 1000) / 10;
  return {
    consistencyRate,
    contractDecision: consistencyRate > 90 ? 'auto_pass' as const : 'require_human_review' as const,
  };
}
