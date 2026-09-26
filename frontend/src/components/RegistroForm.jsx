import { useEffect, useState } from 'react';
import { postRegistro } from '../api';

const EJEMPLO = {
  maestro: {
    carnet: '1890-20-11489',
    nombre: 'MERCEDES AZUCENA LÓPEZ PÉREZ',
    correo: 'mlopezp58@miumg.edu.gt',
  },
  detalle: [
    { misionId: 1, estado: true },
    { misionId: 2, estado: false },
    { misionId: 3, estado: true },
  ],
};

export default function RegistroForm({ misiones, onEnviado }) {
  const [modo, setModo] = useState('form'); // 'form' | 'json'
  const [maestro, setMaestro] = useState({ carnet: '', nombre: '', correo: '' });
  const [estados, setEstados] = useState({}); // { misionId: true|false } — ausente = no se envía
  const [json, setJson] = useState(JSON.stringify(EJEMPLO, null, 2));
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState(null);

  useEffect(() => {
    if (modo === 'json') setJson(JSON.stringify(construirPayload(), null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  function construirPayload() {
    return {
      maestro,
      detalle: Object.entries(estados).map(([id, estado]) => ({ misionId: Number(id), estado })),
    };
  }

  function cicloEstado(id) {
    setEstados((prev) => {
      const next = { ...prev };
      if (!(id in next)) next[id] = true;
      else if (next[id] === true) next[id] = false;
      else delete next[id];
      return next;
    });
  }

  async function enviar(e) {
    e.preventDefault();
    setRespuesta(null);
    let payload;
    if (modo === 'json') {
      try {
        payload = JSON.parse(json);
      } catch {
        setRespuesta({ ok: false, status: 0, data: { mensaje: 'El texto no es un JSON válido.' } });
        return;
      }
    } else {
      payload = construirPayload();
    }
    setEnviando(true);
    try {
      const r = await postRegistro(payload);
      setRespuesta({ ok: true, status: r.status, data: r.data });
      onEnviado?.();
    } catch (err) {
      setRespuesta({ ok: false, status: err.status, data: err.data || { mensaje: err.message } });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="registro">
      <div className="seg">
        <button className={modo === 'form' ? 'active' : ''} onClick={() => setModo('form')}>Formulario</button>
        <button className={modo === 'json' ? 'active' : ''} onClick={() => setModo('json')}>JSON</button>
      </div>

      <form onSubmit={enviar} className="panel">
        {modo === 'form' ? (
          <>
            <h3>Maestro</h3>
            <div className="grid3">
              <label>Carnet
                <input className="input" required maxLength={25} value={maestro.carnet}
                  onChange={(e) => setMaestro({ ...maestro, carnet: e.target.value })} />
              </label>
              <label>Nombre
                <input className="input" required maxLength={150} value={maestro.nombre}
                  onChange={(e) => setMaestro({ ...maestro, nombre: e.target.value })} />
              </label>
              <label>Correo
                <input className="input" type="email" required maxLength={150} value={maestro.correo}
                  onChange={(e) => setMaestro({ ...maestro, correo: e.target.value })} />
              </label>
            </div>

            <h3>Detalle <span className="muted small">(clic para alternar: sin enviar → completada → pendiente)</span></h3>
            <ul className="misiones selectable">
              {misiones.map((m) => {
                const est = estados[m.misionId];
                const cls = est === true ? 'ok' : est === false ? 'pend' : 'none';
                const txt = est === true ? 'true' : est === false ? 'false' : 'no enviar';
                return (
                  <li key={m.misionId} onClick={() => cicloEstado(m.misionId)}>
                    <span>#{m.misionId} · {m.nombre}</span>
                    <span className={`badge ${cls}`}>{txt}</span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <h3>JSON a enviar a <code>POST /api/registro</code></h3>
            <textarea className="input code" rows={18} value={json} onChange={(e) => setJson(e.target.value)} />
            <button type="button" className="btn ghost" onClick={() => setJson(JSON.stringify(EJEMPLO, null, 2))}>
              Cargar ejemplo del enunciado
            </button>
          </>
        )}

        <div className="actions">
          <button className="btn" type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar POST'}
          </button>
        </div>
      </form>

      {respuesta && (
        <div className={`alert ${respuesta.ok ? 'success' : 'error'}`}>
          <strong>HTTP {respuesta.status || '—'}</strong> — {respuesta.data?.mensaje}
          <pre className="code">{JSON.stringify(respuesta.data, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
