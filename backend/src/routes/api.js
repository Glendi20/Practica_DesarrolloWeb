const express = require('express');
const { getPool } = require('../db');
const { validarRegistro } = require('../validation');
const { procesarRegistro } = require('../services/registro');
const { listarMisiones, listarEstudiantes } = require('../services/consultas');
const { ApiError } = require('../errors');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Salud del servicio y de la conexión a la BD
router.get('/health', wrap(async (req, res) => {
  const pool = await getPool();
  await pool.request().query('SELECT 1 AS ok');
  res.json({ ok: true, db: 'conectada', fecha: new Date().toISOString() });
}));

// POST /api/registro → JSON maestro-detalle
router.post('/registro', wrap(async (req, res) => {
  const datos = validarRegistro(req.body);
  const resultado = await procesarRegistro(datos);
  const status = resultado.maestro.accion === 'insertado' ? 201 : 200;
  res.status(status).json({
    ok: true,
    mensaje: resultado.maestro.accion === 'insertado'
      ? 'Estudiante registrado y misiones procesadas.'
      : 'Estudiante existente; datos y misiones procesados.',
    ...resultado,
  });
}));

// GET /api/misiones → catálogo
router.get('/misiones', wrap(async (req, res) => {
  const misiones = await listarMisiones();
  res.json({ ok: true, total: misiones.length, misiones });
}));

// GET /api/estudiantes → todos los estudiantes con sus misiones y estado
router.get('/estudiantes', wrap(async (req, res) => {
  const carnet = typeof req.query.carnet === 'string' ? req.query.carnet.trim() : '';
  const data = await listarEstudiantes(carnet || undefined);
  res.json({ ok: true, total: data.estudiantes.length, ...data });
}));

// GET /api/estudiantes/:carnet → un estudiante
router.get('/estudiantes/:carnet', wrap(async (req, res) => {
  const data = await listarEstudiantes(req.params.carnet.trim());
  if (!data.estudiantes.length) {
    throw new ApiError(404, 'NO_ENCONTRADO', `No existe el estudiante con carnet ${req.params.carnet}.`);
  }
  res.json({ ok: true, totalMisionesCatalogo: data.totalMisionesCatalogo, estudiante: data.estudiantes[0] });
}));

module.exports = router;
