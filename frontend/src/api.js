export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  if (!res.ok) {
    const err = new Error(data?.mensaje || `Error HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { status: res.status, data };
}

export const getMisiones = () => request('/api/misiones').then((r) => r.data);
export const getEstudiantes = () => request('/api/estudiantes').then((r) => r.data);
export const postRegistro = (payload) =>
  request('/api/registro', { method: 'POST', body: JSON.stringify(payload) });
