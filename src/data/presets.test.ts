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
