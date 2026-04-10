/**
 * Генерация всех зигзаг-секвенций по 3/4/5 для каждой тоники (канонические 12),
 * каждого лада из getScalePatterns(), диапазона из двух научных октав подряд.
 *
 * Выход: output/zigzag-sequences.jsonl (по одной JSON-строке на комбинацию).
 *
 * Запуск из каталога music: node scripts/generate-zigzag-sequences.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildScale,
  buildScaleDegreeRowsByMidiOrder,
  CANONICAL_TONIC_BY_PC,
  getScalePatterns,
  midiNoteFromPcOctave,
} from '../lib/music-theory.js';
import {
  buildZigzagSeqWindowedClone,
  zigzagIndexSequenceSpec,
} from './zigzag-sequence-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSIC_ROOT = join(__dirname, '..');
const OUT_DIR = join(MUSIC_ROOT, 'output');
const OUT_FILE = join(OUT_DIR, 'zigzag-sequences.jsonl');

/** Две октавы: например 3 и 4 (как в UI диапазона «две октавы»). */
const OCTAVE_MIN = 3;
const OCTAVE_MAX = 4;

const WINDOW_LENS = /** @type {const} */ ([3, 4, 5]);

function noteMidi(n) {
  return midiNoteFromPcOctave(n.pc, n.octave);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const patterns = getScalePatterns();
  const lines = [];

  const meta = {
    type: 'meta',
    octaveMin: OCTAVE_MIN,
    octaveMax: OCTAVE_MAX,
    windowLens: [...WINDOW_LENS],
    tonicCount: CANONICAL_TONIC_BY_PC.length,
    patternIds: patterns.map((p) => p.id),
  };
  lines.push(JSON.stringify(meta));

  for (const pat of patterns) {
    for (const tonic of CANONICAL_TONIC_BY_PC) {
      let scale;
      try {
        scale = buildScale(pat.id, tonic);
      } catch {
        continue;
      }
      const baseSeqNotes = buildScaleDegreeRowsByMidiOrder(scale, OCTAVE_MIN, OCTAVE_MAX);
      const total = baseSeqNotes.length;

      for (const windowLen of WINDOW_LENS) {
        const seq = buildZigzagSeqWindowedClone(baseSeqNotes, windowLen);
        const idxSpec = zigzagIndexSequenceSpec(total, windowLen);
        const row = {
          type: 'sequence',
          patternId: pat.id,
          patternNameRu: pat.nameRu,
          tonic,
          windowLen,
          totalBaseNotes: total,
          zigzagLength: seq.length,
          indexSpec: idxSpec,
          keys: seq.map((n) => n.key),
          midi: seq.map(noteMidi),
        };
        lines.push(JSON.stringify(row));
      }
    }
  }

  await writeFile(OUT_FILE, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${lines.length - 1} sequence rows (+ meta) to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
