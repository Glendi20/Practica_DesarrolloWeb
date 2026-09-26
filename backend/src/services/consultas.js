const { sql, getPool } = require('../db');

async function listarMisiones() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT MisionID AS misionId, Nombre AS nombre, Descripcion AS descripcion
    FROM dbo.Misiones
    ORDER BY MisionID
  `);
  return r.recordset;
}

/**
 * Lista estudiantes con sus misiones y estado.
 * Si se pasa carnet, devuelve solo ese estudiante.
 * "pendientes" = misiones del catálogo que el estudiante aún no tiene en true
 * (incluye las que están en false y las que nunca ha enviado).
 */
async function listarEstudiantes(carnet) {
  const pool = await getPool();

  const totalReq = pool.request().query('SELECT COUNT(*) AS total FROM dbo.Misiones');

  const req = pool.request();
  let filtro = '';
  if (carnet) {
    req.input('carnet', sql.VarChar(25), carnet);
    filtro = 'WHERE e.Carnet = @carnet';
  }
  const datosReq = req.query(`
    SELECT e.Carnet, e.Nombre, e.Correo,
           em.DetalleID, em.MisionID, m.Nombre AS MisionNombre,
           em.Estado, em.FechaRegistro
    FROM dbo.Estudiantes e
    LEFT JOIN dbo.EstudianteMisiones em ON em.Carnet = e.Carnet
    LEFT JOIN dbo.Misiones m ON m.MisionID = em.MisionID
    ${filtro}
    ORDER BY e.Nombre, em.MisionID
  `);

  const [totalRes, datos] = await Promise.all([totalReq, datosReq]);
  const totalCatalogo = totalRes.recordset[0].total;

  const mapa = new Map();
  for (const row of datos.recordset) {
    if (!mapa.has(row.Carnet)) {
      mapa.set(row.Carnet, {
        carnet: row.Carnet,
        nombre: row.Nombre,
        correo: row.Correo,
        misiones: [],
      });
    }
    if (row.MisionID != null) {
      mapa.get(row.Carnet).misiones.push({
        detalleId: row.DetalleID,
        misionId: row.MisionID,
        nombre: row.MisionNombre,
        estado: row.Estado,
        fechaRegistro: row.FechaRegistro,
      });
    }
  }

  return {
    totalMisionesCatalogo: totalCatalogo,
    estudiantes: [...mapa.values()].map((e) => {
      const completadas = e.misiones.filter((m) => m.estado === true).length;
      return {
        ...e,
        completadas,
        pendientes: Math.max(totalCatalogo - completadas, 0),
        porcentaje: totalCatalogo ? Math.round((completadas / totalCatalogo) * 100) : 0,
      };
    }),
  };
}

module.exports = { listarMisiones, listarEstudiantes };
