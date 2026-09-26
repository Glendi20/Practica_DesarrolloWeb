require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/api');
const { ApiError, mapSqlError } = require('./errors');

const app = express();

// CORS: lista separada por comas en CORS_ORIGINS, o "*" para permitir todo
const origins = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.includes('*') ? '*' : origins }));

app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({
    nombre: 'API Maestro-Detalle con Catálogo y Control de Estado',
    endpoints: {
      'POST /api/registro': 'Recibe { maestro, detalle } e inserta/actualiza',
      'GET /api/misiones': 'Catálogo de misiones',
      'GET /api/estudiantes': 'Estudiantes con misiones y estado (?carnet= opcional)',
      'GET /api/estudiantes/:carnet': 'Un estudiante',
      'GET /api/health': 'Estado del servicio y la BD',
    },
  });
});

app.use('/api', apiRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, codigo: 'RUTA_NO_ENCONTRADA', mensaje: `No existe ${req.method} ${req.path}` });
});

// Manejo centralizado de errores
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // JSON mal formado enviado por el cliente
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo no es un JSON válido.' });
  }
  const apiErr = err instanceof ApiError ? err : mapSqlError(err);
  if (apiErr) {
    return res.status(apiErr.status).json({
      ok: false,
      codigo: apiErr.codigo,
      mensaje: apiErr.message,
      detalles: apiErr.detalles,
    });
  }
  console.error(err);
  res.status(500).json({ ok: false, codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado en el servidor.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API escuchando en el puerto ${port}`));
