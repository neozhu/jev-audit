import { diffWords, diffLines, Change } from 'diff';
import { DiffSegment } from '../types/jev';

export interface DiffLine {
  type: 'added' | 'removed' | 'common';
  text: string;
  lineNumberA?: number;
  lineNumberB?: number;
}

export interface SideBySideRow {
  left?: {
    line: number;
    text: string;
    type: 'removed' | 'common' | 'empty';
  };
  right?: {
    line: number;
    text: string;
    type: 'added' | 'common' | 'empty';
  };
}

export function computeWordDiff(textA: string, textB: string): DiffSegment[] {
  const changes: Change[] = diffWords(textA || '', textB || '');
  return changes.map((c) => ({
    value: c.value,
    added: c.added,
    removed: c.removed,
  }));
}

export function computeSideBySideDiff(textA: string, textB: string): SideBySideRow[] {
  const linesA = (textA || '').split('\n');
  const linesB = (textB || '').split('\n');
  const changes = diffLines(textA || '', textB || '');

  const rows: SideBySideRow[] = [];
  let lineA = 1;
  let lineB = 1;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const lines = change.value.replace(/\n$/, '').split('\n');

    if (!change.added && !change.removed) {
      for (const l of lines) {
        rows.push({
          left: { line: lineA++, text: l, type: 'common' },
          right: { line: lineB++, text: l, type: 'common' },
        });
      }
    } else if (change.removed) {
      // Check if next change is added to pair them up
      const nextChange = changes[i + 1];
      if (nextChange && nextChange.added) {
        const addedLines = nextChange.value.replace(/\n$/, '').split('\n');
        const maxLen = Math.max(lines.length, addedLines.length);

        for (let j = 0; j < maxLen; j++) {
          const lText = lines[j];
          const rText = addedLines[j];
          rows.push({
            left: lText !== undefined ? { line: lineA++, text: lText, type: 'removed' } : { line: 0, text: '', type: 'empty' },
            right: rText !== undefined ? { line: lineB++, text: rText, type: 'added' } : { line: 0, text: '', type: 'empty' },
          });
        }
        i++; // skip next since we handled it
      } else {
        for (const l of lines) {
          rows.push({
            left: { line: lineA++, text: l, type: 'removed' },
            right: { line: 0, text: '', type: 'empty' },
          });
        }
      }
    } else if (change.added) {
      for (const l of lines) {
        rows.push({
          left: { line: 0, text: '', type: 'empty' },
          right: { line: lineB++, text: l, type: 'added' },
        });
      }
    }
  }

  return rows;
}

export function computeDiffStats(textA: string, textB: string) {
  const segments = computeWordDiff(textA, textB);
  let addedWords = 0;
  let removedWords = 0;
  let commonWords = 0;

  for (const seg of segments) {
    const count = seg.value.trim().length > 0 ? seg.value.trim().split(/\s+/).length : 0;
    if (seg.added) addedWords += count;
    else if (seg.removed) removedWords += count;
    else commonWords += count;
  }

  const totalWords = addedWords + removedWords + commonWords;
  const similarityScore = totalWords > 0 
    ? Math.round((commonWords / (commonWords + Math.max(addedWords, removedWords))) * 100) 
    : 100;

  return {
    addedWords,
    removedWords,
    commonWords,
    similarityScore,
    charCountA: textA.length,
    charCountB: textB.length,
  };
}
