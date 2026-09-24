import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateConsistency } from './consistency';

test('weights Jev yes probabilities and passes only above 90%', () => {
  const questions = [
    { id: 'amounts', title: 'Amounts', type: 'noul' as const, instruction: 'Do amounts match?', weight: 2 },
    { id: 'terms', title: 'Terms', type: 'noul' as const, instruction: 'Do terms match?', weight: 1 },
  ];
  assert.deepEqual(calculateConsistency(questions, {
    amounts: { type: 'noul', noul: 0.9 },
    terms: { type: 'noul', noul: 0.9 },
  }), { consistencyRate: 90, contractDecision: 'require_human_review' });
  assert.deepEqual(calculateConsistency(questions, {
    amounts: { type: 'noul', noul: 0.96 },
    terms: { type: 'noul', noul: 0.9 },
  }), { consistencyRate: 94, contractDecision: 'auto_pass' });
});

test('refuses to score missing or malformed Jev answers', () => {
  const questions = [{ id: 'amounts', title: 'Amounts', type: 'noul' as const, instruction: 'Do amounts match?' }];
  assert.throws(() => calculateConsistency(questions, {}));
  assert.throws(() => calculateConsistency(questions, { amounts: { type: 'noul', noul: 1.2 } }));
});

test('combines Noul, Choice, and Score answers with the correct direction', () => {
  const questions = [
    { id: 'match', title: 'Match', type: 'noul' as const, instruction: 'Do terms match?' },
    { id: 'human', title: 'Edit signs', type: 'noul' as const, instruction: 'Are there edit signs?', invertForConsistency: true },
    { id: 'difference', title: 'Difference', type: 'choice' as const, instruction: 'What changed?', consistentChoices: ['same', 'ocr'], choices: [{ id: 'same', label: 'Same' }, { id: 'ocr', label: 'OCR' }, { id: 'changed', label: 'Changed' }] },
    { id: 'degree', title: 'Degree', type: 'score' as const, instruction: 'How close?', scoreLevels: [{ score: 0, label: 'Different' }, { score: 1, label: 'Partial' }, { score: 2, label: 'Same' }] },
  ];
  assert.deepEqual(calculateConsistency(questions, {
    match: { type: 'noul', noul: 0.96 },
    human: { type: 'noul', noul: 0.04 },
    difference: { type: 'choice', choice: 'ocr', probabilities: { same: 0.01, ocr: 0.97, changed: 0.02 } },
    degree: { type: 'score', score: 1.94 },
  }), { consistencyRate: 96.8, contractDecision: 'auto_pass' });
  assert.throws(() => calculateConsistency(questions, {
    match: { type: 'noul', noul: 0.96 },
    human: { type: 'noul', noul: 0.04 },
    difference: { type: 'choice', choice: 'ocr', probabilities: { same: 0.01 } },
    degree: { type: 'score', score: 1.94 },
  }));
});
