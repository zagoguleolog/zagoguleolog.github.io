/**
 * Простой тайм-базированный секвенсор для арпеджио.
 *
 * Чистая логика по индексам и времени; звук и UI делегируются коллбэку onStep.
 *
 * API:
 *   createSequencer({
 *     notes,
 *     mode,
 *     bpm,
 *     stepNoteLength,
 *     scheduler,
 *     onStep,
 *   }) → { start, stop, setNotes, setBpm, setMode, setStepNoteLength }.
 *
 * См. план в lad_sequencer_and_page_*.plan.md.
 */

/**
 * Поддерживаемые режимы обхода.
 * - 'up-loop' — циклический проход 0…N-1…0…
 * - 'up-down' — 0…N-1…1…0… без дублирования крайних ступеней.
 * - 'off' — секвенсор не двигается (стоп).
 * @typedef {'up-loop' | 'up-down' | 'off'} ArpMode
 */

/**
 * Длительность шага в долях четверти.
 * Поддерживаются 1/4, 1/8, 1/16, 1/32 (деление базовой четверти).
 * @typedef {'1/4' | '1/8' | '1/16' | '1/32'} StepNoteLength
 */

/**
 * Абстракция таймера: set(fn, delayMs) → token; clear(token).
 * По умолчанию используется цепочка setTimeout в браузере/Node.
 * @typedef {{ set: (fn: () => void, delayMs: number) => unknown, clear: (token: unknown) => void }} Scheduler
 */

/**
 * @typedef {{
 *   notes?: readonly any[],
 *   mode?: ArpMode,
 *   bpm?: number,
 *   stepNoteLength?: StepNoteLength,
 *   scheduler?: Scheduler,
 *   onStep?: (index: number, note: any, ctx: { bpm: number, stepMs: number, mode: ArpMode, stepNoteLength: StepNoteLength }) => void,
 * }} CreateSequencerOptions
 */

/**
 * Расчёт длительности шага в миллисекундах по BPM и длительности ноты.
 *
 * Базовый шаг для четверти: 60000 / bpm.
 * Для восьмой: 60000 / bpm / 2, для шестнадцатой — / 4, для тридцать второй — / 8.
 *
 * @param {number} bpm > 0
 * @param {StepNoteLength} len
 * @returns {number}
 */
export function stepDurationMs(bpm, len) {
  const safeBpm = Number(bpm) > 0 ? Number(bpm) : 80;
  const quarterMs = 60000 / safeBpm;
  switch (len) {
    case '1/4':
      return quarterMs;
    case '1/8':
      return quarterMs / 2;
    case '1/16':
      return quarterMs / 4;
    case '1/32':
      return quarterMs / 8;
    default:
      // Fallback на четверть, если кто‑то передал неподдерживаемое значение.
      return quarterMs;
  }
}

/**
 * Дефолтный планировщик шагов через setTimeout.
 * Каждый шаг пересчитывает интервал заново (учитывает изменения BPM / длительности).
 * @returns {Scheduler}
 */
function createDefaultScheduler() {
  return {
    set(fn, delayMs) {
      const id = setTimeout(fn, delayMs);
      return id;
    },
    clear(token) {
      if (token != null) {
        clearTimeout(/** @type {number} */ (token));
      }
    },
  };
}

/**
 * Вычисление следующего индекса и направления для режима up-down.
 *
 * @param {number} index Текущий индекс (0…N-1)
 * @param {number} dir Направление: +1 или -1
 * @param {number} count Количество нот (N)
 * @returns {{ index: number, dir: number }}
 */
function nextIndexUpDown(index, dir, count) {
  if (count <= 1) {
    return { index: 0, dir: 1 };
  }
  let i = index + dir;
  let d = dir;
  if (i >= count) {
    // Дошли до верхней ноты, меняем направление и шагаем на соседнюю вниз.
    d = -1;
    i = count - 2;
  } else if (i < 0) {
    // Дошли до нижней ноты, меняем направление и шагаем на соседнюю вверх.
    d = 1;
    i = 1;
  }
  return { index: i, dir: d };
}

/**
 * @param {CreateSequencerOptions} opts
 */
export function createSequencer(opts = {}) {
  /** @type {any[]} */
  let notes = Array.isArray(opts.notes) ? [...opts.notes] : [];
  /** @type {ArpMode} */
  let mode = opts.mode ?? 'off';
  /** @type {number} */
  let bpm = Number(opts.bpm) > 0 ? Number(opts.bpm) : 80;
  /** @type {StepNoteLength} */
  let stepLen = opts.stepNoteLength ?? '1/4';
  /** @type {Scheduler} */
  const scheduler = opts.scheduler ?? createDefaultScheduler();
  /** @type {(index: number, note: any, ctx: { bpm: number, stepMs: number, mode: ArpMode, stepNoteLength: StepNoteLength }) => void} */
  const onStep = typeof opts.onStep === 'function' ? opts.onStep : () => {};

  let running = false;
  let timerToken = null;
  let index = 0;
  let dir = 1;

  function effectiveMode() {
    if (!notes.length) return /** @type {ArpMode} */ ('off');
    if (mode === 'off') return mode;
    return mode;
  }

  function computeStepMs() {
    return stepDurationMs(bpm, stepLen);
  }

  function scheduleNext() {
    if (!running) return;
    const effMode = effectiveMode();
    if (effMode === 'off' || !notes.length) {
      running = false;
      timerToken && scheduler.clear(timerToken);
      timerToken = null;
      return;
    }

    const stepMs = computeStepMs();
    const curIndex = index;
    const curNote = notes[curIndex];

    const ctx = {
      bpm,
      stepMs,
      mode: effMode,
      stepNoteLength: stepLen,
    };

    try {
      onStep(curIndex, curNote, ctx);
    } catch (e) {
      // Не прерываем цикл из‑за ошибок UI/звука.
      console.error('arp-sequencer onStep error', e);
    }

    if (effMode === 'up-loop') {
      index = (curIndex + 1) % notes.length;
    } else if (effMode === 'up-down') {
      const next = nextIndexUpDown(curIndex, dir, notes.length);
      index = next.index;
      dir = next.dir;
    }

    timerToken = scheduler.set(scheduleNext, stepMs);
  }

  function start() {
    if (running) return;
    if (!notes.length) return;
    if (mode === 'off') return;
    running = true;
    index = 0;
    dir = 1;
    timerToken && scheduler.clear(timerToken);
    timerToken = scheduler.set(scheduleNext, 0);
  }

  function stop() {
    running = false;
    if (timerToken != null) {
      scheduler.clear(timerToken);
      timerToken = null;
    }
  }

  function setNotes(nextNotes) {
    notes = Array.isArray(nextNotes) ? [...nextNotes] : [];
    if (!notes.length) {
      stop();
      index = 0;
      dir = 1;
      return;
    }
    // Сохраняем текущую фазу, но нормализуем индекс.
    index = Math.min(Math.max(index, 0), notes.length - 1);
  }

  function setBpm(nextBpm) {
    const n = Number(nextBpm);
    if (!Number.isFinite(n) || n <= 0) return;
    bpm = n;
    if (running) {
      // Перезапускаем таймер с новым интервалом, не сбрасывая индекс.
      timerToken && scheduler.clear(timerToken);
      timerToken = scheduler.set(scheduleNext, computeStepMs());
    }
  }

  /**
   * @param {ArpMode} nextMode
   */
  function setMode(nextMode) {
    if (mode === nextMode) return;
    mode = nextMode;
    if (mode === 'off') {
      stop();
      return;
    }
    if (notes.length && !running) {
      start();
    }
  }

  /**
   * @param {StepNoteLength} nextLen
   */
  function setStepNoteLength(nextLen) {
    if (stepLen === nextLen) return;
    stepLen = nextLen;
    if (running) {
      timerToken && scheduler.clear(timerToken);
      timerToken = scheduler.set(scheduleNext, computeStepMs());
    }
  }

  return Object.freeze({
    start,
    stop,
    setNotes,
    setBpm,
    setMode,
    setStepNoteLength,
  });
}

