const { sql, getPool } = require('../db');
const { ApiError } = require('../errors');

/**
 * Procesa el JSON maestro-detalle dentro de UNA transacción:
 *  1. Valida que todos los misionId existan en el catálogo (si falta alguno → 422, no se guarda nada).
 *  2. Inserta o actualiza al estudiante (clave: Carnet).
 *  3. Inserta o actualiza cada misión del detalle (clave única: Carnet + MisionID).
 * Si algo falla se hace ROLLBACK completo, así múltiples POST nunca dejan datos a medias.
 */
async function procesarRegistro({ maestro, detalle }) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // ---------- 1. Validar referencias contra el catálogo ----------
    const ids = detalle.map((d) => d.misionId);
    const reqIds = new sql.Request(tx);
    const params = ids.map((id, i) => {
      reqIds.input(`m${i}`, sql.Int, id);
      return `@m${i}`;
    });
    const existentes = await reqIds.query(
      `SELECT MisionID FROM dbo.Misiones WHERE MisionID IN (${params.join(',')})`
    );
    const setExistentes = new Set(existentes.recordset.map((r) => r.MisionID));
    const inexistentes = ids.filter((id) => !setExistentes.has(id));
    if (inexistentes.length) {
      throw new ApiError(
        422,
        'ERROR_REFERENCIA',
        `Las siguientes misiones no existen en el catálogo: ${inexistentes.join(', ')}.`,
        { misionesInexistentes: inexistentes }
      );
    }

    // ---------- 2. Upsert del maestro (Estudiantes) ----------
    const rEst = await new sql.Request(tx)
      .input('carnet', sql.VarChar(25), maestro.carnet)
      .input('nombre', sql.NVarChar(150), maestro.nombre)
      .input('correo', sql.NVarChar(150), maestro.correo)
      .query(`
        DECLARE @nomAnt NVARCHAR(150), @corAnt NVARCHAR(150);

        SELECT @nomAnt = Nombre, @corAnt = Correo
        FROM dbo.Estudiantes WITH (UPDLOCK, HOLDLOCK)
        WHERE Carnet = @carnet;

        IF @@ROWCOUNT = 0
        BEGIN
          INSERT INTO dbo.Estudiantes (Carnet, Nombre, Correo)
          VALUES (@carnet, @nombre, @correo);
          SELECT 'insertado' AS accion;
        END
        -- comparación binaria: detecta también cambios de mayúsculas/tildes
        ELSE IF (@nomAnt = @nombre COLLATE Latin1_General_BIN2
                 AND @corAnt = @correo COLLATE Latin1_General_BIN2)
          SELECT 'sin cambios' AS accion;
        ELSE
        BEGIN
          UPDATE dbo.Estudiantes
          SET Nombre = @nombre, Correo = @correo
          WHERE Carnet = @carnet;
          SELECT 'actualizado' AS accion;
        END
      `);
    const accionEstudiante = rEst.recordset[0].accion;

    // ---------- 3. Upsert del detalle (EstudianteMisiones) ----------
    const resultadoDetalle = [];
    for (const d of detalle) {
      const r = await new sql.Request(tx)
        .input('carnet', sql.VarChar(25), maestro.carnet)
        .input('misionId', sql.Int, d.misionId)
        .input('estado', sql.Bit, d.estado)
        .query(`
          DECLARE @estAnt BIT;

          SELECT @estAnt = Estado
          FROM dbo.EstudianteMisiones WITH (UPDLOCK, HOLDLOCK)
          WHERE Carnet = @carnet AND MisionID = @misionId;

          IF @@ROWCOUNT = 0
          BEGIN
            INSERT INTO dbo.EstudianteMisiones (Carnet, MisionID, Estado)
            VALUES (@carnet, @misionId, @estado);
            SELECT 'insertado' AS accion, CAST(NULL AS BIT) AS estadoAnterior;
          END
          ELSE IF (@estAnt = @estado)
            SELECT 'sin cambios' AS accion, @estAnt AS estadoAnterior;
          ELSE
          BEGIN
            UPDATE dbo.EstudianteMisiones
            SET Estado = @estado
            WHERE Carnet = @carnet AND MisionID = @misionId;
            SELECT 'actualizado' AS accion, @estAnt AS estadoAnterior;
          END
        `);
      const { accion, estadoAnterior } = r.recordset[0];
      resultadoDetalle.push({
        misionId: d.misionId,
        estado: d.estado,
        estadoAnterior,
        accion,
      });
    }

    await tx.commit();

    const resumen = resultadoDetalle.reduce(
      (acc, d) => {
        acc[d.accion === 'sin cambios' ? 'sinCambios' : d.accion + 's'] += 1;
        return acc;
      },
      { insertados: 0, actualizados: 0, sinCambios: 0 }
    );

    return {
      maestro: { ...maestro, accion: accionEstudiante },
      detalle: resultadoDetalle,
      resumen,
    };
  } catch (err) {
    try {
      await tx.rollback();
    } catch (_) {
      /* la transacción pudo haberse abortado ya */
    }
    throw err;
  }
}

module.exports = { procesarRegistro };
