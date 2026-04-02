import { HARMONIC_END, HARMONIC_START, ToneGen, initToneGenTheory } from './tone-gen-engine.mjs';
import { createSegmentValueControl } from './synth-kit/segment-value-control.mjs';

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

const state = {
  engine: null,
  theory: null,
  notes: [],
  mode: 'up',
  bpm: 120,
  timerId: null,
  currentIndex: 0,
  direction: 1, // для up-down: +1 вверх, -1 вниз
  isPlaying: false,
  stepMs: 60000 / 120,
  baseParams: null,
  bpmSegControl: null,
};

function setStatus(text) {
  $('seq-status').textContent = text;
}

function setCurrentNoteLabel(text) {
  $('seq-current-note').textContent = text || '—';
}

function showError(message) {
  const box = $('seq-error');
  if (!message) {
    box.hidden = true;
    box.textContent = '';
    return;
  }
  box.hidden = false;
  box.textContent = message;
}

function readBpm() {
  const raw = Number(/** @type {HTMLInputElement} */ ($('seq-bpm')).value);
  if (!Number.isFinite(raw)) return 120;
  return Math.min(240, Math.max(40, Math.round(raw)));
}

function getStepMs(bpm) {
  const b = Math.min(240, Math.max(40, bpm || 120));
  return 60000 / b;
}

function syncModeButtons() {
  const modes = ['up', 'down', 'up-down', 'random'];
  for (const m of modes) {
    const btn = document.querySelector(`[data-seq-mode="${m}"]`);
    if (!(btn instanceof HTMLButtonElement)) continue;
    btn.setAttribute('aria-pressed', m === state.mode ? 'true' : 'false');
  }
}

function buildBaseParams(theory) {
  const enabled = {};
  for (let n = 1; n <= HARMONIC_END; n++) {
    enabled[n] = n === 1;
  }
  return {
    a4Hz: theory.DEFAULT_A4_HZ,
    waveform: 'sine',
    detuneCents: 0,
    harmMix01: 0,
    harmRolloff: 1.0,
    harmEnabled: enabled,
  };
}

function parseInputNotes(theory) {
  const raw = /** @type {HTMLInputElement} */ ($('seq-notes')).value || '';
  const defaultOct = Number(
    /** @type {HTMLInputElement} */ ($('seq-default-octave')).value || '4',
  );
  const oct = Number.isFinite(defaultOct) ? defaultOct : 4;
  const tokens = raw
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) {
    throw new Error('Введите хотя бы одну ноту (например: C D E F G A B).');
  }

  const notes = [];
  for (const tok of tokens) {
    let namePart = tok;
    let octave = oct;
    const m = tok.match(/^(.+?)(-?\d)$/);
    if (m) {
      namePart = m[1];
      octave = Number(m[2]);
    }

    const parsed = theory.parseNoteName(namePart);
    const displayName = theory.formatNoteName(parsed.letter, parsed.alteration);
    const midi = theory.midiNoteFromPcOctave(parsed.pc, octave);
    const freq = theory.frequencyFromMidi(midi);

    notes.push({
      token: tok,
      name: displayName,
      pc: parsed.pc,
      octave,
      midi,
      frequency: freq,
    });
  }

  return notes;
}

function pickNextIndex(mode, currentIndex, direction, count) {
  if (count <= 1) {
    return { index: 0, direction: 1 };
  }

  if (mode === 'random') {
    const idx = Math.floor(Math.random() * count);
    return { index: idx, direction };
  }

  if (mode === 'up') {
    const idx = (currentIndex + 1) % count;
    return { index: idx, direction: 1 };
  }

  if (mode === 'down') {
    const idx = (currentIndex - 1 + count) % count;
    return { index: idx, direction: -1 };
  }

  // up-down
  let dir = direction || 1;
  let idx = currentIndex + dir;
  if (idx >= count) {
    dir = -1;
    idx = count - 2;
  } else if (idx < 0) {
    dir = 1;
    idx = 1;
  }
  if (count === 2) {
    if (idx < 0) idx = 0;
    if (idx > 1) idx = 1;
  }
  return { index: idx, direction: dir };
}

function playStep() {
  if (!state.engine || !state.notes.length || !state.baseParams) {
    stopSequencerInternal();
    return;
  }
  const note = state.notes[state.currentIndex];
  state.engine.startMono({
    ...state.baseParams,
    name: note.name,
    octave: note.octave,
  });
  setCurrentNoteLabel(`${note.name}${note.octave} (${note.frequency.toFixed(2)} Гц)`);
  setStatus(`Играет шаг ${state.currentIndex + 1} из ${state.notes.length}`);

  const next = pickNextIndex(
    state.mode,
    state.currentIndex,
    state.direction,
    state.notes.length,
  );
  state.currentIndex = next.index;
  state.direction = next.direction;
}

function stopSequencerInternal() {
  if (state.timerId != null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.engine) {
    state.engine.stopMonoSmooth();
    state.engine.stopAllPolySmooth();
  }
  state.isPlaying = false;
  setStatus('Тишина');
  setCurrentNoteLabel('—');
}

function startSequencer() {
  if (!state.engine || !state.theory) return;

  let notes;
  try {
    notes = parseInputNotes(state.theory);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    stopSequencerInternal();
    return;
  }

  showError('');
  state.notes = notes;
  state.bpm = readBpm();
  state.stepMs = getStepMs(state.bpm);
  state.currentIndex = 0;
  state.direction = 1;

  state.baseParams = buildBaseParams(state.theory);
  state.engine.setReleaseSmoothSec(Math.min(0.4, state.stepMs / 2000));

  if (state.timerId != null) {
    window.clearInterval(state.timerId);
  }
  playStep();
  state.timerId = window.setInterval(playStep, state.stepMs);
  state.isPlaying = true;
}

async function main() {
  const warn = $('seq-module-warning');
  try {
    const m = await import('../lib/music-theory.js');
    initToneGenTheory(m);
    state.theory = m;
  } catch (e) {
    warn.hidden = false;
    warn.textContent =
      'Не удалось загрузить lib/music-theory.js. Откройте страницу на опубликованном сайте по HTTPS или по HTTP с корректным MIME для ES-модулей; не открывайте файл напрямую через file://.';
    console.error(e);
    return;
  }

  state.engine = new ToneGen();

  // Режимы арпеджио — кнопки
  document.addEventListener('click', (ev) => {
    const btn = ev.target instanceof HTMLElement ? ev.target.closest('[data-seq-mode]') : null;
    if (!(btn instanceof HTMLButtonElement)) return;
    const mode = btn.getAttribute('data-seq-mode');
    if (!mode) return;
    state.mode = mode;
    syncModeButtons();
  });

  // BPM: сегментный индикатор + скрытый диапазон
  const bpmSegMount = document.getElementById('seq-bpm-seg');
  if (bpmSegMount) {
    state.bpmSegControl = createSegmentValueControl({
      mount: bpmSegMount,
      min: 40,
      max: 240,
      value: state.bpm,
      step: 1,
      pixelsPerFullRange: 220,
      label: 'BPM',
      width: 3,
      padField: true,
    });
    state.bpmSegControl.onChange((v) => {
      const bpm = Math.round(v);
      state.bpm = bpm;
      state.stepMs = getStepMs(bpm);
      /** @type {HTMLInputElement} */ ($('seq-bpm')).value = String(bpm);
      if (state.engine) {
        state.engine.setReleaseSmoothSec(Math.min(0.4, state.stepMs / 2000));
      }
      if (state.isPlaying && state.timerId != null) {
        window.clearInterval(state.timerId);
        state.timerId = window.setInterval(playStep, state.stepMs);
      }
    });
  }

  $('seq-start').addEventListener('click', () => {
    if (state.isPlaying) {
      stopSequencerInternal();
    }
    startSequencer();
  });

  $('seq-stop').addEventListener('click', () => {
    stopSequencerInternal();
  });

  $('seq-bpm').addEventListener('input', () => {
    const bpm = readBpm();
    /** @type {HTMLInputElement} */ ($('seq-bpm')).value = String(bpm);
    state.bpm = bpm;
    state.stepMs = getStepMs(bpm);
    if (state.bpmSegControl) {
      state.bpmSegControl.setValue(bpm);
    }
    if (state.engine) {
      state.engine.setReleaseSmoothSec(Math.min(0.4, state.stepMs / 2000));
    }
    if (state.isPlaying && state.timerId != null) {
      window.clearInterval(state.timerId);
      state.timerId = window.setInterval(playStep, state.stepMs);
    }
  });

  $('seq-default-octave').addEventListener('input', () => {
    if (!state.isPlaying) return;
    stopSequencerInternal();
    startSequencer();
  });

  setStatus('Тишина');
  setCurrentNoteLabel('—');
  syncModeButtons();
}

void main();

