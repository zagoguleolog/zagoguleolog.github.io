/**
 * Мелкий оверлей в правом нижнем углу: дата/время последнего деплоя (deploy-stamp.mjs).
 */
import { DEPLOY_STAMP } from './deploy-stamp.mjs';

let mounted = false;

export function mountDeployStampOverlay() {
  if (mounted || !DEPLOY_STAMP) return;
  mounted = true;

  const el = document.createElement('div');
  el.className = 'deploy-stamp';
  el.setAttribute('aria-hidden', 'true');
  el.title = 'Метка последнего push в main';
  el.textContent = DEPLOY_STAMP;

  function mount() {
    if (document.querySelector('.deploy-stamp')) return;
    document.body.appendChild(el);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
}
