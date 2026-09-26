# API Maestro-Detalle con Catálogo y Control de Estado

API en **Node.js + Express + SQL Server** que recibe un JSON maestro-detalle (estudiante + misiones) en un solo POST, y un **tablero en React (Vite)** que muestra el avance de cada estudiante.

| Parte | Tecnología | Hosting |
|---|---|---|
| `backend/` | Node 20, Express, `mssql` | Azure App Service (Linux) |
| `frontend/` | React 18 + Vite | GitHub Pages |
| BD | SQL Server `db_WebDevUMG` | Azure (provista por el catedrático) |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/registro` | Recibe `{ maestro, detalle }`. Inserta o actualiza al estudiante y cada misión. |
| GET | `/api/misiones` | Catálogo de misiones. |
| GET | `/api/estudiantes` | Estudiantes con sus misiones, estado, completadas y pendientes (`?carnet=` opcional). |
| GET | `/api/estudiantes/:carnet` | Un estudiante. |
| GET | `/api/health` | Verifica que la API y la BD respondan. |

### Reglas del `POST /api/registro`

Todo ocurre en **una transacción**: si algo falla, no se guarda nada.

1. Valida el JSON (campos obligatorios, longitudes del ERD, formato de correo, `misionId` entero, `estado` booleano, sin misiones repetidas) → **400**.
2. Verifica que cada `misionId` exista en `Misiones`. Si falta alguno → **422 `ERROR_REFERENCIA`** con la lista de IDs inexistentes.
3. Si el carnet no existe → inserta el estudiante (**201**). Si existe → actualiza nombre/correo (**200**).
4. Por cada misión: si no existe el par (Carnet, MisionID) → inserta; si existe → actualiza `Estado`.
5. La respuesta indica qué pasó con cada registro: `insertado`, `actualizado` o `sin cambios`.

Otros errores: correo ya usado por otro carnet → **409 `DUPLICADO`**; BD caída → **503**.

Ejemplo de respuesta:

```json
{
  "ok": true,
  "mensaje": "Estudiante existente; datos y misiones procesados.",
  "maestro": { "carnet": "1890-20-11489", "nombre": "...", "correo": "...", "accion": "sin cambios" },
  "detalle": [
    { "misionId": 1, "estado": true,  "estadoAnterior": false, "accion": "actualizado" },
    { "misionId": 2, "estado": false, "estadoAnterior": false, "accion": "sin cambios" },
    { "misionId": 3, "estado": true,  "estadoAnterior": null,  "accion": "insertado" }
  ],
  "resumen": { "insertados": 1, "actualizados": 1, "sinCambios": 1 }
}
```

## Ejecutar en local

```bash
# Backend
cd backend
cp .env.example .env      # y coloca la contraseña de la BD
npm install
npm run dev               # http://localhost:3000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev               # usa VITE_API_URL de .env.development
```

`backend/requests.http` tiene peticiones listas para probar con la extensión REST Client de VS Code (o cópialas a Postman).

## Despliegue

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Reto API maestro-detalle"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

> `.env` está en `.gitignore`: la contraseña **no** se sube al repositorio.

### 2. Backend en Azure App Service

1. Portal de Azure → **Create a resource → Web App**.
   - Publish: **Code** · Runtime: **Node 20 LTS** · OS: **Linux** · Plan: **Free F1** (o B1).
2. En la Web App → **Settings → Environment variables** agrega:
   `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT=true`, `DB_TRUST_CERT=true`, `CORS_ORIGINS=https://<tu-usuario>.github.io`
3. **Configuration → General settings → Startup Command**: `npm start`
4. **Overview → Download publish profile**.
5. En GitHub → **Settings → Secrets and variables → Actions**:
   - Secret `AZURE_WEBAPP_PUBLISH_PROFILE` = contenido del archivo descargado.
   - Variable `AZURE_WEBAPP_NAME` = nombre de tu Web App.
   - (Si Azure pide habilitar “SCM Basic Auth Publishing” para el publish profile, actívalo en *Configuration → General settings*.)
6. Haz push o ejecuta el workflow **Backend → Azure App Service**. Prueba `https://<app>.azurewebsites.net/api/health`.

### 3. Frontend en GitHub Pages

1. GitHub → **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: `VITE_API_URL` = `https://<app>.azurewebsites.net`
3. Haz push o ejecuta el workflow **Frontend → GitHub Pages**. Quedará en `https://<tu-usuario>.github.io/<tu-repo>/`.

## Estructura

```
backend/
  src/index.js              servidor Express, CORS y manejo de errores
  src/db.js                 pool de conexiones a SQL Server
  src/validation.js         validación del JSON
  src/services/registro.js  lógica maestro-detalle (transacción + upserts)
  src/services/consultas.js catálogo y listado de estudiantes
  src/routes/api.js         endpoints
frontend/
  src/components/Tablero.jsx      avance por estudiante (completadas vs pendientes)
  src/components/Catalogo.jsx     catálogo de misiones
  src/components/RegistroForm.jsx envío del POST (formulario o JSON)
sql/schema.sql              esquema del ERD (solo referencia; en la BD ya existe)
.github/workflows/          despliegue automático a Azure y GitHub Pages
```
