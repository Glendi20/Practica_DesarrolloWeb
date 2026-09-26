class ApiError extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

/** Traduce errores de SQL Server a respuestas HTTP entendibles. */
function mapSqlError(err) {
  if (err && ['ESOCKET', 'ETIMEOUT', 'ELOGIN', 'ECONNCLOSED'].includes(err.code)) {
    return new ApiError(503, 'BD_NO_DISPONIBLE', 'No fue posible conectar con la base de datos.');
  }
  switch (err && err.number) {
    case 2627: // violación de UNIQUE / PK
    case 2601: // índice único duplicado
      return new ApiError(409, 'DUPLICADO',
        'El dato viola una restricción única (p. ej. el correo ya pertenece a otro carnet).',
        err.message);
    case 547: // violación de FOREIGN KEY
      return new ApiError(422, 'ERROR_REFERENCIA',
        'Uno de los valores no existe en la tabla referenciada.', err.message);
    case 8152: // String or binary data would be truncated
    case 2628:
      return new ApiError(400, 'LONGITUD_EXCEDIDA',
        'Uno de los campos excede la longitud permitida.', err.message);
    default:
      return null;
  }
}

module.exports = { ApiError, mapSqlError };
