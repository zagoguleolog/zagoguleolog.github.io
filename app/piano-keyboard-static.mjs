/**
 * Справочная страница: пиано из общего модуля раскладок (нужен HTTP, см. docs/overview.md).
 */
import { buildPianoKeys } from './keyboard-layouts.mjs';

const el = document.getElementById('pkb-piano');
if (el) {
  buildPianoKeys(el, { octaveMin: 4, octaveMax: 5 });
}
