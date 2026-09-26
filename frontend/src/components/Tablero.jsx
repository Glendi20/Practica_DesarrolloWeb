import { useMemo, useState } from 'react';

export default function Tablero({ datos, misiones, cargando }) {
  const [filtro, setFiltro] = useState('');
  const [abierto, setAbierto] = useState(null);

  const total = datos.totalMisionesCatalogo || misiones.length;

  const lista = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return datos.estudiantes
      .filter((e) => !q || [e.carnet, e.nombre, e.correo].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => b.completadas - a.completadas || a.nombre.localeCompare(b.nombre));
  }, [datos.estudiantes, filtro]);

  const kpis = useMemo(() => {
    const est = datos.estudiantes;
    const completos = est.filter((e) => total > 0 && e.completadas >= total).length;
    const prom = est.length ? Math.round(est.reduce((s, e) => s + e.porcentaje, 0) / est.length) : 0;
    return { estudiantes: est.length, completos, prom };
  }, [datos.estudiantes, total]);

  if (cargando && !datos.estudiantes.length) return <p className="muted">Cargando estudiantes…</p>;

  return (
    <section>
      <div className="kpis">
        <Kpi label="Estudiantes" valor={kpis.estudiantes} />
        <Kpi label="Misiones en catálogo" valor={total} />
        <Kpi label="Con todas completas" valor={kpis.completos} />
        <Kpi label="Avance promedio" valor={`${kpis.prom}%`} />
      </div>

      <input
        className="input search"
        placeholder="Buscar por carnet, nombre o correo…"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />

      {!lista.length && <p className="muted">No hay estudiantes que mostrar.</p>}

      <div className="cards">
        {lista.map((e) => {
          const estadoPorId = new Map(e.misiones.map((m) => [m.misionId, m.estado]));
          const expandido = abierto === e.carnet;
          return (
            <article key={e.carnet} className="card">
              <button className="card-head" onClick={() => setAbierto(expandido ? null : e.carnet)}>
                <div className="who">
                  <strong>{e.nombre}</strong>
                  <span className="muted small">{e.carnet} · {e.correo}</span>
                </div>
                <div className="stats">
                  <span className="badge ok">{e.completadas} completadas</span>
                  <span className="badge pend">{e.pendientes} pendientes</span>
                </div>
              </button>

              <div className="progress" aria-label={`Avance ${e.porcentaje}%`}>
                <div className="bar" style={{ width: `${e.porcentaje}%` }} />
              </div>
              <div className="muted small right">{e.porcentaje}%</div>

              {expandido && (
                <ul className="misiones">
                  {misiones.map((m) => {
                    const est = estadoPorId.get(m.misionId);
                    const cls = est === true ? 'ok' : est === false ? 'pend' : 'none';
                    const txt = est === true ? 'Completada' : est === false ? 'Pendiente' : 'Sin enviar';
                    return (
                      <li key={m.misionId}>
                        <span>#{m.misionId} · {m.nombre}</span>
                        <span className={`badge ${cls}`}>{txt}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Kpi({ label, valor }) {
  return (
    <div className="kpi">
      <div className="kpi-val">{valor}</div>
      <div className="muted small">{label}</div>
    </div>
  );
}
