import { useCallback, useEffect, useState } from 'react';
import { API_URL, getEstudiantes, getMisiones } from './api';
import Tablero from './components/Tablero.jsx';
import Catalogo from './components/Catalogo.jsx';
import RegistroForm from './components/RegistroForm.jsx';

const TABS = [
  { id: 'tablero', label: 'Tablero de avance' },
  { id: 'catalogo', label: 'Catálogo de misiones' },
  { id: 'registro', label: 'Enviar registro' },
];

export default function App() {
  const [tab, setTab] = useState('tablero');
  const [misiones, setMisiones] = useState([]);
  const [datos, setDatos] = useState({ estudiantes: [], totalMisionesCatalogo: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [m, e] = await Promise.all([getMisiones(), getEstudiantes()]);
      setMisiones(m.misiones);
      setDatos(e);
    } catch (err) {
      setError(err.message || 'No se pudo conectar con la API.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Reto Maestro-Detalle</h1>
          <p className="muted">Catálogo de misiones y control de estado por estudiante</p>
        </div>
        <button className="btn ghost" onClick={cargar} disabled={cargando}>
          {cargando ? 'Cargando…' : 'Actualizar'}
        </button>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="alert error">
          <strong>Error:</strong> {error}
          <div className="muted small">API: {API_URL || '(VITE_API_URL no configurada)'}</div>
        </div>
      )}

      <main>
        {tab === 'tablero' && <Tablero datos={datos} misiones={misiones} cargando={cargando} />}
        {tab === 'catalogo' && <Catalogo misiones={misiones} cargando={cargando} />}
        {tab === 'registro' && <RegistroForm misiones={misiones} onEnviado={cargar} />}
      </main>

      <footer className="footer muted small">API: {API_URL || 'no configurada'}</footer>
    </div>
  );
}
