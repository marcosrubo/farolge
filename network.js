/* Registra a abertura da página e mantém a consulta de IP independente. */
(() => {
  'use strict';
  const label = document.getElementById('network-ip');
  const button = document.getElementById('network-refresh');
  if (!label || !button) return;
  let pending = false;
  async function refresh() {
    if (pending) return;
    pending = true;
    button.disabled = true;
    label.textContent = 'IP público: consultando…';
    try {
      const response = await fetch('/api/network', {
        cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('network');
      const data = await response.json();
      if (typeof data.ip !== 'string' || !/^[0-9a-fA-F:.]{2,45}$/.test(data.ip)) throw new Error('ip');
      label.textContent = `IP público: ${data.ip}`;
    } catch {
      label.textContent = 'IP público: indisponível. Tente atualizar.';
    } finally {
      pending = false;
      button.disabled = false;
    }
  }
  fetch('/api/access-log', {
    method: 'POST', credentials: 'omit', keepalive: true, headers: {'X-Farol-Request': '1'}
  }).catch(() => {});
  button.addEventListener('click', refresh);
  window.addEventListener('online', refresh);
  refresh();
})();
