import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConsistencyConfig } from './presets';
import { calculateConsistency, isValidConsistencyConfig } from '../utils/consistency';

test('default rubric keeps separate consistency judgments and reviews a changed term', () => {
  for (const lang of ['zh', 'en'] as const) {
    const { questions } = createConsistencyConfig(lang);
    assert.equal(isValidConsistencyConfig(createConsistencyConfig(lang)), true);
    assert.equal(questions.length, 4);
    assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
    assert.deepEqual(questions.map((question) => question.type).sort(), ['choice', 'noul', 'noul', 'score']);
    assert.equal(questions.filter((question) => question.invertForConsistency).length, 1);

    const matching = Object.fromEntries(questions.map((question) => [question.id,
      question.type === 'choice'
        ? { type: 'choice', choice: 'ocr', probabilities: { same: 0.02, ocr: 0.96, changed: 0.02, unrelated: 0 } }
        : question.type === 'score'
          ? { type: 'score', score: 3.8 }
          : { type: 'noul', noul: question.invertForConsistency ? 0.05 : 0.95 },
    ]));
    assert.equal(calculateConsistency(questions, matching).contractDecision, 'auto_pass');

    const changed = { ...matching, substantive_match: { type: 'noul', noul: 0.02 } };
    assert.equal(calculateConsistency(questions, changed).contractDecision, 'require_human_review');
  }
});

test('rejects a Choice without a defined consistency mapping', () => {
  const config = createConsistencyConfig('en');
  const choice = config.questions.find((question) => question.type === 'choice')!;
  delete choice.consistentChoices;
  assert.equal(isValidConsistencyConfig(config), false);
});

test('default rubric gives higher impact to substantive mismatches than degree uncertainty', () => {
  for (const lang of ['zh', 'en'] as const) {
    const questions = createConsistencyConfig(lang).questions;
    assert.ok(Math.abs(questions.reduce((sum, question) => sum + (question.weight ?? 0), 0) - 1) < 1e-10);
    const matching = {
      substantive_match: { type: 'noul', noul: 1 },
      human_edit_signs: { type: 'noul', noul: 0 },
      difference_type: { type: 'choice', choice: 'same', probabilities: { same: 1, ocr: 0, changed: 0, unrelated: 0 } },
      consistency_degree: { type: 'score', score: 4 },
    };
    const rates = [
      { ...matching, substantive_match: { type: 'noul', noul: 0.5 } },
      { ...matching, human_edit_signs: { type: 'noul', noul: 0.5 } },
      { ...matching, difference_type: { type: 'choice', choice: 'changed', probabilities: { same: 0.5, ocr: 0, changed: 0.5, unrelated: 0 } } },
      { ...matching, consistency_degree: { type: 'score', score: 2 } },
    ].map((answers) => calculateConsistency(questions, answers).consistencyRate);

    assert.ok(rates[0] < rates[1] && rates[1] < rates[2] && rates[2] < rates[3]);
  }
});
