import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useProductos } from "../hooks/useProductos";
import { useClientes } from "../hooks/useClientes";
import { useOrdenes } from "../hooks/useOrdenes";
import { usePagos } from "../hooks/usePagos";
import { useInventario } from "../hooks/useInventario";
import { formatDate } from "../utils/formatDate";
import { formatCRC } from "../utils/currency";
import { formatMetodoPago } from "../utils/formatMetodoPago";
// NOTA: globals.css y theme.css deberían importarse una sola vez en main.jsx,
// no en cada página.

/* ── Configuración ── */
const moneda = formatCRC;

/* ── Íconos SVG: un solo wrapper en vez de repetir los atributos 9 veces ── */
const Icon = ({ size = 18, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const IconBox = () => (
  <Icon>
    <path d="M21 8V20a1 1 0 01-1 1H4a1 1 0 01-1-1V8" />
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <path d="M10 12h4" />
  </Icon>
);
const IconUsers = () => (
  <Icon>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </Icon>
);
const IconClip = () => (
  <Icon>
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" />
  </Icon>
);
const IconCard = ({ size }) => (
  <Icon size={size}>
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <path d="M1 10h22" />
  </Icon>
);
const IconAlert = () => (
  <Icon>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
);
const IconRefresh = () => (
  <Icon>
    <path d="M23 4v6h-6M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </Icon>
);
const IconList = () => (
  <Icon size={16}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </Icon>
);
const IconActivity = () => (
  <Icon size={16}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </Icon>
);

/* Colores de los KPI alineados con la paleta berry */
const STAT_ICONS = {
  card: { icon: <IconCard />, bg: "#fff1f2", color: "#be3560" },
  alert: { icon: <IconAlert />, bg: "#fffbeb", color: "#b45309" },
  clip: { icon: <IconClip />, bg: "#f5f3ff", color: "#7c3aed" },
  users: { icon: <IconUsers />, bg: "#f0fdf4", color: "#15803d" },
  box: { icon: <IconBox />, bg: "#fdf2f8", color: "#be185d" },
  refresh: { icon: <IconRefresh />, bg: "#ecfeff", color: "#0e7490" },
};

function StatCard({ type = "box", value, label }) {
  const { icon, bg, color } = STAT_ICONS[type];
  return (
    <div className="stat-card">
      <div className="stat-icon-wrap" style={{ background: bg, color }}>
        {icon}
      </div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}

/* Ahora sirve para cualquier alerta (antes decía "productos" fijo) */
function AlertaCard({ type, icon, title, label }) {
  return (
    <div className={`alerta alerta-${type}`}>
      <span className="alerta-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{label}</p>
      </div>
    </div>
  );
}

function EstadoBadge({ value, prefix = "" }) {
  const slug = value?.toLowerCase().replace(/\s+/g, "-") ?? "";
  return <span className={`badge badge-${prefix}${slug}`}>{value}</span>;
}

/* Devuelve los N más recientes sin depender del orden en que llegue la API */
const masRecientes = (lista = [], campo, n) =>
  [...lista]
    .sort((a, b) => new Date(b[campo]) - new Date(a[campo]))
    .slice(0, n);

const claveDia = (fecha) => new Date(fecha).toLocaleDateString("en-CA");

function Dashboard() {
  const { user } = useAuth();
  const { productos, stockBajo } = useProductos();
  const { clientes, clientesConDeuda } = useClientes();
  const { ordenes, ordenesPendientes, ordenesPorCobrar, fetchOrdenes } =
    useOrdenes();
  const { pagos, fetchPagos, fetchResumen: fetchResumenPagos } = usePagos();
  const { movimientos, fetchMovimientos } = useInventario();

  const [actualizando, setActualizando] = useState(false);

  /* ── Cálculos memoizados (antes se recalculaban en cada render) ── */
  const totalPorCobrar = useMemo(() => {
    const pagado = {};
    pagos.forEach((p) => {
      if (p.orden_id) pagado[p.orden_id] = (pagado[p.orden_id] ?? 0) + Number(p.monto);
    });
    return (ordenesPorCobrar ?? []).reduce(
      (total, o) => total + Math.max(0, Number(o.total) - (pagado[o.id] ?? 0)),
      0,
    );
  }, [pagos, ordenesPorCobrar]);

  const cobradoEsteMes = useMemo(() => {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    return pagos.reduce(
      (total, p) =>
        new Date(p.fecha_pago) >= inicioMes ? total + Number(p.monto) : total,
      0,
    );
  }, [pagos]);

  const movimientosHoy = useMemo(() => {
    const hoy = claveDia(new Date());
    return movimientos.filter((m) => m.fecha && claveDia(m.fecha) === hoy).length;
  }, [movimientos]);

  /* Cobros de los últimos 7 días para el gráfico (sin librerías) */
  const cobrosSemana = useMemo(() => {
    const totales = {};
    pagos.forEach((p) => {
      const k = claveDia(p.fecha_pago);
      totales[k] = (totales[k] ?? 0) + Number(p.monto);
    });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const key = claveDia(d);
      return {
        key,
        label: d.toLocaleDateString("es-CR", { weekday: "short" }),
        total: totales[key] ?? 0,
      };
    });
  }, [pagos]);
  const maxCobro = Math.max(...cobrosSemana.map((d) => d.total), 1);
  const totalSemana = cobrosSemana.reduce((s, d) => s + d.total, 0);

  const ordenesRecientes = useMemo(
    () => masRecientes(ordenes, "fecha_creacion", 8),
    [ordenes],
  );
  const pagosRecientes = useMemo(
    () => masRecientes(pagos, "fecha_pago", 5),
    [pagos],
  );
  const movimientosRecientes = useMemo(
    () => masRecientes(movimientos, "fecha", 5),
    [movimientos],
  );

  const hayAlertas = stockBajo.length > 0 || clientesConDeuda.length > 0;

  const actualizarDashboard = async () => {
    setActualizando(true);
    try {
      await Promise.all([
        fetchOrdenes(),
        fetchPagos(),
        fetchResumenPagos(),
        fetchMovimientos(),
      ]);
    } finally {
      setActualizando(false);
    }
  };

  const fecha = new Date().toLocaleDateString("es-CR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="dashboard">
      {/* ── Header (sin botón de logout: ya está en el sidebar) ── */}
      <div className="dashboard-header">
        <div>
          <p className="dashboard-welcome">Hola, {user?.nombre} 👋</p>
          <h1>Panel de control</h1>
        </div>
        <div className="dashboard-meta">
          <p>{fecha}</p>
          <div className="dashboard-header-actions">
            <button
              className="btn-refresh"
              onClick={actualizarDashboard}
              disabled={actualizando}
              title="Actualizar datos"
            >
              <IconRefresh /> {actualizando ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs: antes se calculaban pero nunca se mostraban ── */}
      <div className="stats-grid">
        <StatCard type="card" value={moneda(cobradoEsteMes)} label="Cobrado este mes" />
        <StatCard type="alert" value={moneda(totalPorCobrar)} label="Por cobrar" />
        <StatCard type="clip" value={ordenesPendientes?.length ?? 0} label="Órdenes pendientes" />
        <StatCard type="users" value={clientes.length} label="Clientes" />
        <StatCard type="box" value={productos.length} label="Productos" />
        <StatCard type="refresh" value={movimientosHoy} label="Movimientos hoy" />
      </div>

      {/* ── Alertas + gráfico ── */}
      <div className="dashboard-main-grid">
        <div className="dashboard-summary">
          {hayAlertas ? (
            <div className="alertas-section">
              <h2>Alertas activas</h2>
              <div className="alertas-grid">
                {stockBajo.length > 0 && (
                  <AlertaCard
                    type="warning"
                    icon="📦"
                    title={`${stockBajo.length} productos`}
                    label="con stock bajo"
                  />
                )}
                {clientesConDeuda.length > 0 && (
                  <AlertaCard
                    type="info"
                    icon="💰"
                    title={`${clientesConDeuda.length} clientes`}
                    label="con deuda pendiente"
                  />
                )}
              </div>

              {/* Qué productos son, no solo cuántos */}
              {stockBajo.length > 0 && (
                <ul className="low-stock-list">
                  {stockBajo.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <span>{p.nombre}</span>
                      <strong>{p.stock ?? p.cantidad ?? 0} uds</strong>
                    </li>
                  ))}
                  {stockBajo.length > 5 && (
                    <li className="low-stock-more">
                      <Link to="/inventario">Ver {stockBajo.length - 5} más →</Link>
                    </li>
                  )}
                </ul>
              )}
            </div>
          ) : (
            <p className="empty-msg">Todo en orden, sin alertas activas ✨</p>
          )}
        </div>

        <div className="dashboard-graph-card">
          <div className="widget-card">
            <div className="widget-card-header">
              <div>
                <p>Últimos 7 días</p>
                <h2>Cobros</h2>
              </div>
              <span className="badge badge-info">{moneda(totalSemana)}</span>
            </div>
            <div className="widget-card-body">
              <div className="bars-chart" role="img" aria-label="Cobros de los últimos 7 días">
                {cobrosSemana.map((d) => (
                  <div className="bar-col" key={d.key} title={`${d.label}: ${moneda(d.total)}`}>
                    <div className="bar-track">
                      <div className="bar" style={{ height: `${(d.total / maxCobro) * 100}%` }} />
                    </div>
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Órdenes recientes ── */}
      <div className="recent-section">
        <div className="section-header">
          <h2>
            <IconList />
            Órdenes recientes
          </h2>
          <Link to="/ordenes" className="btn-link">
            Ver todas →
          </Link>
        </div>

        {ordenesRecientes.length === 0 ? (
          <p className="empty-msg">No hay órdenes registradas aún.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ordenesRecientes.map((orden) => (
                  <tr key={orden.id}>
                    <td className="muted">#{orden.id}</td>
                    <td>{orden.cliente_nombre ?? "Sin cliente"}</td>
                    <td style={{ fontWeight: 600 }}>{moneda(orden.total)}</td>
                    <td>
                      <EstadoBadge value={orden.estado_pago} prefix="pago-" />
                    </td>
                    <td className="muted">{formatDate(orden.fecha_creacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Actividad reciente ── */}
      <div className="activity-grid">
        <div className="activity-section">
          <div className="section-header">
            <h2>
              <IconCard size={16} />
              Pagos recientes
            </h2>
            <span className="section-count">{pagos.length}</span>
          </div>
          {pagosRecientes.length === 0 ? (
            <p className="empty-msg">No hay pagos registrados aún.</p>
          ) : (
            <div className="activity-list">
              {pagosRecientes.map((pago) => (
                <div className="activity-row" key={pago.id}>
                  <div>
                    <strong>{pago.cliente_nombre ?? "Cliente sin nombre"}</strong>
                    <span>
                      Orden #{pago.orden_id} ·{" "}
                      {formatMetodoPago(pago.metodo_pago)}
                    </span>
                  </div>
                  <div className="activity-value">
                    <strong>{moneda(pago.monto)}</strong>
                    <span>{formatDate(pago.fecha_pago)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="activity-section">
          <div className="section-header">
            <h2>
              <IconActivity />
              Movimientos recientes
            </h2>
            <span className="section-count">{movimientos.length}</span>
          </div>
          {movimientosRecientes.length === 0 ? (
            <p className="empty-msg">No hay movimientos registrados aún.</p>
          ) : (
            <div className="activity-list">
              {movimientosRecientes.map((m) => (
                <div className="activity-row" key={m.id}>
                  <div>
                    <strong>{m.producto_nombre ?? "Producto sin nombre"}</strong>
                    <span>{m.observaciones || "Sin observaciones"}</span>
                  </div>
                  <div className="activity-value">
                    <strong className={`movement-${m.tipo}`}>
                      {m.tipo === "entrada" ? "+" : "-"}
                      {m.cantidad}
                    </strong>
                    <span>{formatDate(m.fecha)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;