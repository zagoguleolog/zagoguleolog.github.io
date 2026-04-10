/**
 * Логика секвенций «по 3/4/5» с направлением zigzag — та же, что в app/lads.mjs / app/lads2.mjs.
 * Дублируется здесь для автономных скриптов без браузерных импортов.
 */

/**
 * @param {Array<{ name: string, pc: number, octave: number, key: string }>} baseSeqNotes
 * @param {3|4|5} windowLen
 * @returns {Array<{ name: string, pc: number, octave: number, key: string }>}
 */
export function buildZigzagSeqWindowedClone(baseSeqNotes, windowLen) {
  const total = baseSeqNotes.length;
  if (total < windowLen) return [];

  function buildUp() {
    const seq = [];
    for (let start = 0; start <= total - windowLen; start++) {
      for (let j = 0; j < windowLen; j++) {
        seq.push(baseSeqNotes[start + j]);
      }
    }
    return seq;
  }

  function buildDown() {
    const seq = [];
    for (let start = total - 1; start >= windowLen - 1; start--) {
      for (let j = 0; j < windowLen; j++) {
        seq.push(baseSeqNotes[start - j]);
      }
    }
    return seq;
  }

  const upSeq = buildUp();
  const downSeq = buildDown();
  while (
    downSeq.length &&
    upSeq.length &&
    downSeq[0].key === upSeq[upSeq.length - 1].key
  ) {
    downSeq.shift();
  }
  return upSeq.concat(downSeq);
}

/**
 * Независимая формулировка: только индексы в baseSeqNotes, затем развёртка.
 * @param {number} total
 * @param {3|4|5} windowLen
 * @returns {number[]}
 */
export function zigzagIndexSequenceSpec(total, windowLen) {
  if (total < windowLen) return [];

  const up = [];
  for (let start = 0; start <= total - windowLen; start++) {
    for (let j = 0; j < windowLen; j++) {
      up.push(start + j);
    }
  }

  const down = [];
  for (let start = total - 1; start >= windowLen - 1; start--) {
    for (let j = 0; j < windowLen; j++) {
      down.push(start - j);
    }
  }

  while (down.length && up.length && down[0] === up[up.length - 1]) {
    down.shift();
  }

  return up.concat(down);
}

/**
 * @param {Array<{ name: string, pc: number, octave: number, key: string }>} baseSeqNotes
 * @param {3|4|5} windowLen
 * @returns {Array<{ name: string, pc: number, octave: number, key: string }>}
 */
export function buildZigzagFromSpecIndices(baseSeqNotes, windowLen) {
  const idxs = zigzagIndexSequenceSpec(baseSeqNotes.length, windowLen);
  return idxs.map((i) => baseSeqNotes[i]);
}
