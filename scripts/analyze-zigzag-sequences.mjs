/**
 * Анализ output/zigzag-sequences.jsonl: сверка двух реализаций зигзага,
 * согласованность keys с indexSpec и поиск подозрительных скачков по MIDI.
 *
 * Запуск из каталога music: node scripts/analyze-zigzag-sequences.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
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
  buildZigzagFromSpecIndices,
  zigzagIndexSequenceSpec,
} from './zigzag-sequence-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUSIC_ROOT = join(__dirname, '..');
const IN_FILE = join(MUSIC_ROOT, 'output', 'zigzag-sequences.jsonl');
const OUT_MD = join(MUSIC_ROOT, 'output', 'zigzag-analysis-report.md');

const OCTAVE_MIN = 3;
const OCTAVE_MAX = 4;

/**
 * @param {ReturnType<typeof buildScale>} scale
 */
function buildBaseSeqNotes(scale) {
  return buildScaleDegreeRowsByMidiOrder(scale, OCTAVE_MIN, OCTAVE_MAX);
}

/**
 * @param {ReturnType<typeof buildBaseSeqNotes>} base
 */
function baseMidiNonIncreasingSteps(base) {
  /** @type {Array<{ i: number, m0: number, m1: number }>} */
  const bad = [];
  for (let i = 0; i < base.length - 1; i++) {
    const m0 = noteMidi(base[i]);
    const m1 = noteMidi(base[i + 1]);
    if (m1 <= m0) bad.push({ i, m0, m1 });
  }
  return bad;
}

function noteMidi(n) {
  return midiNoteFromPcOctave(n.pc, n.octave);
}

/**
 * Индексы в base по ключу шага секвенции (должны быть однозначны).
 * @param {ReturnType<typeof buildBaseSeqNotes>} base
 * @param {string[]} keys
 */
function indicesFromKeys(base, keys) {
  const indexByKey = new Map(base.map((n, i) => [n.key, i]));
  const idx = [];
  for (const k of keys) {
    const j = indexByKey.get(k);
    if (j === undefined) {
      return { error: `ключ не найден в базовом ряду: ${k}` };
    }
    idx.push(j);
  }
  return { idx };
}

/**
 * Ожидаемые скачки индекса между соседними шагами (для отладки «паразитных» нот).
 * @param {number[]} idxs
 * @param {3|4|5} windowLen
 */
function classifyIndexJumps(idxs, windowLen) {
  /** @type {Array<{ i: number, from: number, to: number, d: number, ok: boolean }>} */
  const bad = [];
  if (idxs.length < 2) return bad;

  const withinUp = 1;
  const betweenUp = 2 - windowLen;
  const withinDown = -1;
  const betweenDown = windowLen - 2;

  const allowed = new Set([withinUp, betweenUp, withinDown, betweenDown]);

  for (let i = 0; i < idxs.length - 1; i++) {
    const d = idxs[i + 1] - idxs[i];
    if (!allowed.has(d)) {
      bad.push({ i, from: idxs[i], to: idxs[i + 1], d, ok: false });
    }
  }
  return bad;
}

async function main() {
  let raw;
  try {
    raw = await readFile(IN_FILE, 'utf8');
  } catch (e) {
    console.error(`Нет файла ${IN_FILE}. Сначала: node scripts/generate-zigzag-sequences.mjs`);
    process.exit(1);
  }

  const lines = raw.split(/\r?\n/).filter(Boolean);
  /** @type {Array<{ kind: string, detail?: string, row?: object, jumps?: object[] }>} */
  const issues = [];
  let sequenceRows = 0;

  /** Проверка базового ряда (монотонный MIDI) для всех ладов из файла. */
  const metaLine = lines.find((l) => {
    try {
      return JSON.parse(l).type === 'meta';
    } catch {
      return false;
    }
  });
  if (metaLine) {
    const meta = JSON.parse(metaLine);
    const patternIds = meta.patternIds ?? getScalePatterns().map((p) => p.id);
    for (const patternId of patternIds) {
      for (const tonic of CANONICAL_TONIC_BY_PC) {
        let scale;
        try {
          scale = buildScale(patternId, tonic);
        } catch {
          continue;
        }
        const base = buildBaseSeqNotes(scale);
        const badBase = baseMidiNonIncreasingSteps(base);
        if (badBase.length) {
          issues.push({
            kind: 'base_midi_not_increasing',
            row: { patternId, tonic },
            detail: `шаги ${badBase.map((b) => `${b.i}: ${b.m0}→${b.m1}`).join('; ')}`,
          });
        }
      }
    }
  }

  for (const line of lines) {
    const row = JSON.parse(line);
    if (row.type === 'meta') continue;
    if (row.type !== 'sequence') continue;
    sequenceRows++;

    const { patternId, tonic, windowLen, keys, indexSpec } = row;

    let scale;
    try {
      scale = buildScale(patternId, tonic);
    } catch (e) {
      issues.push({
        kind: 'buildScale',
        detail: String(/** @type {Error} */ (e).message),
        row: { patternId, tonic, windowLen },
      });
      continue;
    }

    const base = buildBaseSeqNotes(scale);
    const clone = buildZigzagSeqWindowedClone(base, windowLen);
    const fromSpec = buildZigzagFromSpecIndices(base, windowLen);
    const specIdxFresh = zigzagIndexSequenceSpec(base.length, windowLen);

    const cKeys = clone.map((n) => n.key);
    const fKeys = fromSpec.map((n) => n.key);

    if (cKeys.join('\0') !== fKeys.join('\0')) {
      issues.push({
        kind: 'clone_vs_specKeys',
        row: { patternId, tonic, windowLen },
        detail: 'buildZigzagSeqWindowedClone и buildZigzagFromSpecIndices расходятся',
      });
    }

    if (indexSpec && indexSpec.join(',') !== specIdxFresh.join(',')) {
      issues.push({
        kind: 'stored_indexSpec_stale',
        row: { patternId, tonic, windowLen },
      });
    }

    const ik = indicesFromKeys(base, keys);
    if ('error' in ik) {
      issues.push({ kind: 'key_lookup', detail: ik.error, row: { patternId, tonic, windowLen } });
      continue;
    }

    if (ik.idx.join(',') !== specIdxFresh.join(',')) {
      issues.push({
        kind: 'keys_vs_specIndex',
        row: { patternId, tonic, windowLen },
        detail: `ожидались индексы ${specIdxFresh.join(',')}, по keys ${ik.idx.join(',')}`,
      });
    }

    const jumps = classifyIndexJumps(ik.idx, windowLen);
    if (jumps.length) {
      issues.push({
        kind: 'unexpected_index_jump',
        row: { patternId, tonic, windowLen },
        jumps,
      });
    }
  }

  const midiAnomalies = [];
  for (const line of lines) {
    const row = JSON.parse(line);
    if (row.type !== 'sequence') continue;
    const mids = row.midi;
    if (!Array.isArray(mids) || mids.length < 2) continue;
    for (let i = 0; i < mids.length - 1; i++) {
      const span = Math.abs(mids[i + 1] - mids[i]);
      /** Больше октавы подряд — подозрительно для «паразитного» скачка (эвристика). */
      if (span > 12) {
        midiAnomalies.push({
          patternId: row.patternId,
          tonic: row.tonic,
          windowLen: row.windowLen,
          step: i,
          a: mids[i],
          b: mids[i + 1],
          span,
        });
      }
    }
  }

  let md = `# Отчёт анализа зигзаг-секвенций\n\n`;
  md += `Файл данных: \`output/zigzag-sequences.jsonl\`  \n`;
  md += `Строк-секвенций: **${sequenceRows}**  \n\n`;

  if (!issues.length) {
    md += `## Проверки реализации\n\n**Ошибок не найдено:** клон lads совпадает со спецификацией по индексам, keys согласованы с indexSpec, скачки индекса только допустимых типов (+1, −1, ${'`'}2−L${'`'}, ${'`'}L−2${'`'}); для всех ладов×тоник базовый ряд из \`buildScaleDegreeRowsByMidiOrder\` даёт **строго возрастающий MIDI**.\n\n`;
  } else {
    md += `## Ошибки и расхождения (${issues.length})\n\n`;
    for (const iss of issues) {
      md += `### ${iss.kind}\n\n`;
      md += `- **лад:** ${iss.row?.patternId}, **тоника:** ${iss.row?.tonic}, **окно:** ${iss.row?.windowLen}\n`;
      if (iss.detail) md += `- ${iss.detail}\n`;
      if (iss.jumps?.length) {
        md += `\n| шаг | from | to | Δ |\n|-----|------|----|---|\n`;
        for (const j of iss.jumps) {
          md += `| ${j.i} | ${j.from} | ${j.to} | ${j.d} |\n`;
        }
      }
      md += `\n`;
    }
  }

  const MIDI_SHOW = 40;
  if (midiAnomalies.length) {
    md += `## Эвристика MIDI: скачок > 12 полутонов подряд (${midiAnomalies.length})\n\n`;
    md += `Часто следствие **неверного базового ряда** (до ERR-004); при корректном \`buildScaleDegreeRowsByMidiOrder\` здесь обычно пусто. Показаны первые ${MIDI_SHOW} строк.\n\n`;
    md += `| лад | тоника | L | шаг | MIDI₁ | MIDI₂ | |Δ| |\n|-----|--------|---|-----|-------|-------|-----|\n`;
    for (const m of midiAnomalies.slice(0, MIDI_SHOW)) {
      md += `| ${m.patternId} | ${m.tonic} | ${m.windowLen} | ${m.step} | ${m.a} | ${m.b} | ${m.span} |\n`;
    }
    if (midiAnomalies.length > MIDI_SHOW) {
      md += `\n*…и ещё ${midiAnomalies.length - MIDI_SHOW} записей*\n`;
    }
    md += `\n`;
  } else {
    md += `## Эвристика MIDI\n\nНет соседних пар с |Δ| > 12.\n\n`;
  }

  await writeFile(OUT_MD, md, 'utf8');
  console.log(`Report: ${OUT_MD}`);
  console.log(`Issues: ${issues.length}, midi>12: ${midiAnomalies.length}`);
  if (issues.length) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
