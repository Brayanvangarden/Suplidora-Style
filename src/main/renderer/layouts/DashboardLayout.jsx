import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const navSections = [
  {
    title: "Principal",
    links: [{ label: "Inicio", path: "/", icon: "✨" }],
  },
  {
    title: "Ventas",
    links: [
      { label: "Clientes", path: "/clientes", icon: "💖" },
      { label: "Órdenes", path: "/ordenes", icon: "🛍️" },
      { label: "Pagos", path: "/pagos", icon: "💳" },
      { label: "Facturas", path: "/facturas", icon: "🧾" },
      { label: "Cuentas por Cobrar", path: "/cuentas-por-cobrar", icon: "💼" },
    ],
  },
  {
    title: "Catálogo",
    links: [
      { label: "Productos", path: "/productos", icon: "💅" },
      { label: "Categorías", path: "/categorias", icon: "🎨" },
      { label: "Inventario", path: "/inventario", icon: "📦" },
    ],
  },
  {
    title: "Gestión",
    links: [
      { label: "Reportes", path: "/reportes", icon: "📊" },
      { label: "Vendedores", path: "/vendedores", icon: "🧑‍💼" },
      { label: "Usuarios", path: "/usuarios", icon: "🧑‍💼", adminOnly: true },
      { label: "Configuración", path: "/configuracion", icon: "⚙️" },
    ],
  },
];

function DashboardLayout() {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 901px)").matches,
  );

  return (
    <div
      className={`dashboard-layout ${sidebarOpen ? "" : "sidebar-collapsed"}`}
    >
      <button
        type="button"
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-logo" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="28" height="28" fill="none">
              <defs>
                <linearGradient
                  id="sidebar-polish-fill"
                  x1="11"
                  y1="20"
                  x2="30"
                  y2="35"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#FDA4AF" />
                  <stop offset="1" stopColor="#FB7185" />
                </linearGradient>
              </defs>
              <rect x="16" y="3" width="8" height="12" rx="2.5" fill="white" />
              <path
                d="M15 15h10v4h2l4 5v9a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3v-9l4-5h2v-4Z"
                fill="url(#sidebar-polish-fill)"
                stroke="white"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
              <path
                d="M10 27h20v6a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2v-6Z"
                fill="#F43F5E"
                fillOpacity=".72"
              />
              <path
                d="M14 24v7"
                stroke="white"
                strokeLinecap="round"
                strokeOpacity=".8"
                strokeWidth="2"
              />
            </svg>
          </span>
          <div>
            <h2>BeYou</h2>
            <p>Suplidora de belleza</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(({ title, links }) => {
            const visible = links.filter((l) => !l.adminOnly || isAdmin);
            if (visible.length === 0) return null;

            return (
              <div key={title} className="sidebar-section">
                <p className="sidebar-section-title">{title}</p>
                {visible.map(({ label, path, icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === "/"}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? "active" : ""}`
                    }
                  >
                    <span className="sidebar-icon">{icon}</span>
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="user-avatar">
              {user?.nombre?.charAt(0) || "U"}
            </span>
            <div>
              <p>{user?.nombre || "Usuario"}</p>
              <small>{user?.rol || "Sin rol"}</small>
            </div>
          </div>
          <button className="sidebar-logout" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="navbar">
          <div className="navbar-heading">
            <button
              type="button"
              className="menu-toggle"
              aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((isOpen) => !isOpen)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <p className="navbar-path">BeYou / Dashboard</p>
              <h1 className="navbar-title">Panel administrativo</h1>
            </div>
          </div>
          <div className="navbar-user-info">
            <span>Bienvenido</span>
            <strong>{user?.nombre}</strong>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default DashboardLayout;