export default function Catalogo({ misiones, cargando }) {
  if (cargando && !misiones.length) return <p className="muted">Cargando catálogo…</p>;
  if (!misiones.length) return <p className="muted">El catálogo está vacío.</p>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          {misiones.map((m) => (
            <tr key={m.misionId}>
              <td>{m.misionId}</td>
              <td>{m.nombre}</td>
              <td className="muted">{m.descripcion || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
