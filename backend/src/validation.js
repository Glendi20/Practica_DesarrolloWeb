const { ApiError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida la forma del JSON maestro-detalle y devuelve una versión normalizada.
 * Lanza ApiError(400) con la lista de problemas encontrados.
 */
function validarRegistro(body) {
  const errores = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'JSON_INVALIDO', 'El cuerpo debe ser un objeto JSON con "maestro" y "detalle".');
  }

  const { maestro, detalle } = body;

  // ---- Maestro ----
  let carnet = '';
  let nombre = '';
  let correo = '';
  if (!maestro || typeof maestro !== 'object' || Array.isArray(maestro)) {
    errores.push('"maestro" es obligatorio y debe ser un objeto.');
  } else {
    carnet = typeof maestro.carnet === 'string' ? maestro.carnet.trim() : '';
    nombre = typeof maestro.nombre === 'string' ? maestro.nombre.trim() : '';
    correo = typeof maestro.correo === 'string' ? maestro.correo.trim() : '';

    if (!carnet) errores.push('maestro.carnet es obligatorio (texto).');
    else if (carnet.length > 25) errores.push('maestro.carnet no puede exceder 25 caracteres.');

    if (!nombre) errores.push('maestro.nombre es obligatorio (texto).');
    else if (nombre.length > 150) errores.push('maestro.nombre no puede exceder 150 caracteres.');

    if (!correo) errores.push('maestro.correo es obligatorio (texto).');
    else if (correo.length > 150) errores.push('maestro.correo no puede exceder 150 caracteres.');
    else if (!EMAIL_RE.test(correo)) errores.push('maestro.correo no tiene un formato válido.');
  }

  // ---- Detalle ----
  const items = [];
  if (!Array.isArray(detalle)) {
    errores.push('"detalle" es obligatorio y debe ser un arreglo.');
  } else if (detalle.length === 0) {
    errores.push('"detalle" debe contener al menos una misión.');
  } else {
    const vistos = new Set();
    detalle.forEach((d, i) => {
      if (!d || typeof d !== 'object') {
        errores.push(`detalle[${i}] debe ser un objeto.`);
        return;
      }
      const { misionId, estado } = d;
      if (!Number.isInteger(misionId) || misionId <= 0) {
        errores.push(`detalle[${i}].misionId debe ser un entero positivo.`);
        return;
      }
      if (typeof estado !== 'boolean') {
        errores.push(`detalle[${i}].estado debe ser true o false.`);
        return;
      }
      if (vistos.has(misionId)) {
        errores.push(`detalle[${i}].misionId ${misionId} está repetido en el mismo envío.`);
        return;
      }
      vistos.add(misionId);
      items.push({ misionId, estado });
    });
  }

  if (errores.length) {
    throw new ApiError(400, 'VALIDACION', 'El JSON enviado no es válido.', errores);
  }

  return { maestro: { carnet, nombre, correo }, detalle: items };
}

module.exports = { validarRegistro };
