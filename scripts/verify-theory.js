/**
 * Быстрая проверка: генерация совпадает с примерами из docs/music-theory.md.
 */
import {
  accidentalSystemFromScale,
  buildScale,
  buildScaleDegreeRowsByMidiOrder,
  allCanonicalScales,
  chromaticNamesByAccidentalSystem,
  sumSteps,
  getScalePatterns,
  getMusicTheoryGraph,
  DEFAULT_A4_HZ,
  A4_MIDI_NOTE,
  midiNoteFromPcOctave,
  frequencyFromMidi,
  frequencyFromNoteNameOctave,
  diatonicTriadRootPcsInKey,
  relativeMajorTonicNameFromNaturalMinorTonic,
  majorIvRootPcSet,
  referenceMajorTonicForIvIvCluster,
  isSectorTonalityHighlightOn,
} from '../lib/music-theory.js';
import {
  BAYAN_CHROMATIC_4_ROW_COUNT,
  rowIndexTopDownFromMidi,
  chromaticColumnFromMidi,
  layoutXUnitsFromMidi,
  bayanButtonLabelFromMidi,
  buildBayanButtonModels,
} from '../lib/bayan-b-system.js';

const expectedMajorC = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const majorC = buildScale('major', 'C');
console.assert(
  majorC.degrees.map((d) => d.name).join(',') === expectedMajorC.join(','),
  'C major spelling',
);

const expectedAbPent = ['Ab', 'Cb', 'Db', 'Eb', 'Gb'];
const abPent = buildScale('minorPentatonic', 'Ab');
console.assert(
  abPent.degrees.map((d) => d.name).join(',') === expectedAbPent.join(','),
  'Ab minor pentatonic',
);

const expectedCNatMin = ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'];
const cNatMin = buildScale('naturalMinor', 'C');
console.assert(
  cNatMin.degrees.map((d) => d.name).join(',') === expectedCNatMin.join(','),
  'C natural minor spelling',
);

const expectedCMajPent = ['C', 'D', 'E', 'G', 'A'];
const cMajPent = buildScale('majorPentatonic', 'C');
console.assert(
  cMajPent.degrees.map((d) => d.name).join(',') === expectedCMajPent.join(','),
  'C major pentatonic spelling',
);

const fIonian = buildScale('ionian', 'F');
console.assert(accidentalSystemFromScale(fIonian) === 'flat', 'F ionian → бемольная система знаков');
console.assert(chromaticNamesByAccidentalSystem('flat')[1] === 'Db', 'бемольный хроматический ряд PC 1');
const gIonian = buildScale('ionian', 'G');
console.assert(accidentalSystemFromScale(gIonian) === 'sharp', 'G ionian → диезная система знаков');
console.assert(chromaticNamesByAccidentalSystem('sharp')[6] === 'F#', 'диезный хроматический ряд PC 6');

for (const p of getScalePatterns()) {
  console.assert(sumSteps(p.semitoneSteps) === 12, `${p.id} sum 12`);
}

console.assert(A4_MIDI_NOTE === 69, 'A4 MIDI');
console.assert(DEFAULT_A4_HZ === 440, 'default A4 Hz');
console.assert(midiNoteFromPcOctave(0, 4) === 60, 'C4 MIDI');
console.assert(midiNoteFromPcOctave(9, 4) === 69, 'A4 MIDI from PC+octave');
console.assert(Math.abs(frequencyFromMidi(69) - 440) < 1e-9, 'A4 = 440 Hz');
console.assert(Math.abs(frequencyFromMidi(69, { referenceHz: 432 }) - 432) < 1e-9, 'A4 = 432 Hz');
const c4Hz = frequencyFromMidi(60);
console.assert(Math.abs(c4Hz - 261.6255653005986) < 1e-6, 'C4 frequency ET');
console.assert(Math.abs(frequencyFromNoteNameOctave('C', 4) - c4Hz) < 1e-9, 'C4 from name+octave');
console.assert(
  Math.abs(frequencyFromMidi(60, { referenceHz: 432 }) - 432 * 2 ** (-9 / 12)) < 1e-9,
  'C4 under 432 A4',
);

const pcsCmaj = diatonicTriadRootPcsInKey('C', 'major');
const pcsAmin = diatonicTriadRootPcsInKey('A', 'naturalMinor');
console.assert(pcsCmaj.size === 7 && pcsAmin.size === 7, 'diatonic triad roots count');
for (const pc of pcsCmaj) {
  console.assert(pcsAmin.has(pc), 'relative C major / A minor same PC set');
}

console.assert(relativeMajorTonicNameFromNaturalMinorTonic('A') === 'C', 'relative major of A min');
console.assert(referenceMajorTonicForIvIvCluster('C', 'major') === 'C', 'ref major for C maj');
console.assert(referenceMajorTonicForIvIvCluster('A', 'naturalMinor') === 'C', 'ref major for A min');

const ivIvC = majorIvRootPcSet('C');
console.assert(ivIvC.size === 3 && ivIvC.has(0) && ivIvC.has(5) && ivIvC.has(7), 'C major I IV V PCs');

const diatC = diatonicTriadRootPcsInKey('C', 'major');
const t3 = new Set(['0', '1', '11']);
const covered = new Set([0, 9, 7, 4, 5, 2]);
console.assert(
  !isSectorTonalityHighlightOn({
    diatonicPcs: diatC,
    t3Indices: t3,
    coveredPcs: covered,
    showSeventhChord: false,
    sectorIndex: '2',
    rootPc: 2,
  }),
  'ii root on non-T3 off without seventh',
);
console.assert(
  isSectorTonalityHighlightOn({
    diatonicPcs: diatC,
    t3Indices: t3,
    coveredPcs: covered,
    showSeventhChord: true,
    sectorIndex: '5',
    rootPc: 11,
  }),
  'vii root on non-T3 on with seventh',
);
console.assert(
  !isSectorTonalityHighlightOn({
    diatonicPcs: diatC,
    t3Indices: t3,
    coveredPcs: covered,
    showSeventhChord: true,
    sectorIndex: '2',
    rootPc: 2,
  }),
  'ii still off when covered by T3 inner',
);

console.assert(rowIndexTopDownFromMidi(60) === 2 && rowIndexTopDownFromMidi(61) === 1 && rowIndexTopDownFromMidi(62) === 0, 'B-system row from MIDI C4,C#4,D4');
console.assert(chromaticColumnFromMidi(60) === 20 && chromaticColumnFromMidi(61) === 20, 'B-system chromatic column');
console.assert(Math.abs(layoutXUnitsFromMidi(60, 1 / 3) - 20) < 1e-9, 'B-system x-units C4');
console.assert(bayanButtonLabelFromMidi(60) === 'C4', 'bayan label C4');
const bayanSlice = buildBayanButtonModels({ midiMin: 60, midiMax: 62, staggerFraction: 1 / 3 });
console.assert(bayanSlice.length === 3, 'bayan 3 buttons');
console.assert(bayanSlice[0].xUnits0 === 0 && bayanSlice[2].xUnits0 > bayanSlice[0].xUnits0, 'bayan xUnits0 normalized');

const rc4 = BAYAN_CHROMATIC_4_ROW_COUNT;
console.assert(
  rowIndexTopDownFromMidi(60, rc4) === 3 &&
    rowIndexTopDownFromMidi(61, rc4) === 2 &&
    rowIndexTopDownFromMidi(62, rc4) === 1 &&
    rowIndexTopDownFromMidi(63, rc4) === 0,
  'chromatic-4 row from MIDI C4–D#4',
);
console.assert(chromaticColumnFromMidi(60, rc4) === 15 && chromaticColumnFromMidi(64, rc4) === 16, 'chromatic-4 columns C4 / E4');
console.assert(Math.abs(layoutXUnitsFromMidi(60, 1 / 4, rc4) - 15) < 1e-9, 'chromatic-4 x-units C4');
const bayan4Slice = buildBayanButtonModels({ midiMin: 60, midiMax: 63, staggerFraction: 1 / 4, rowCount: rc4 });
console.assert(bayan4Slice.length === 4, 'bayan 4 buttons C4–D#4');

const g = getMusicTheoryGraph();
console.assert(g.nodes.size > 0, 'graph nodes');
console.assert(g.edgesByKind('intervalDirected').length === 144, '12x12 directed PCs');
console.assert(g.edgesFrom('scale:major|C').length > 0, 'scale edges');

const cSharpRow = buildScaleDegreeRowsByMidiOrder(buildScale('major', 'C#'), 3, 4);
console.assert(cSharpRow.length === 14, 'C# major C3…B4 = 14 scale tones');
for (let i = 0; i < cSharpRow.length - 1; i++) {
  const a = midiNoteFromPcOctave(cSharpRow[i].pc, cSharpRow[i].octave);
  const b = midiNoteFromPcOctave(cSharpRow[i + 1].pc, cSharpRow[i + 1].octave);
  console.assert(b > a, `C# row MIDI strictly up at ${i}: ${a}→${b}`);
}
console.assert(cSharpRow[0].name === 'B#' && cSharpRow[0].octave === 3, 'C# row starts at B#3 (pc 0 = C3 in range)');
const gRow = buildScaleDegreeRowsByMidiOrder(buildScale('major', 'G'), 3, 4);
console.assert(gRow[0].name === 'C' && gRow[0].octave === 3, 'G major row starts at C3, not G3 (keyboard span)');
console.assert(gRow[gRow.length - 1].name === 'B' && gRow[gRow.length - 1].octave === 4, 'G major row ends at B4');

console.log('verify-theory: OK', {
  patterns: getScalePatterns().length,
  majorKeys: allCanonicalScales('major').length,
  graphEdges: g.edges.length,
});
