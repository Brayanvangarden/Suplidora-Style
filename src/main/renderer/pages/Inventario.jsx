import { useState, useMemo, useEffect } from "react";
import { useInventario } from "../hooks/useInventario";
import { useProductos } from "../hooks/useProductos";
import { useAuthStore } from "../store/auth.store";
import { formatDateTime } from "../utils/formatDate";

function ArrowDownIcon(props) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}
function ArrowUpIcon(props) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}
const EMPTY_FORM = { producto_id: "", cantidad: "", observaciones: "" };
const MOVIMIENTOS_POR_PAGINA = 10;

const getEstadoStock = (producto) => {
  const cantidad = Number(producto.cantidad) || 0;
  const minimo = Number(producto.stock_minimo) || 0;
  if (cantidad <= 0) return "agotado";
  if (cantidad <= minimo) return "bajo";
  return "disponible";
};

const formatCantidad = (cantidad) =>
  (Number(cantidad) || 0).toLocaleString("es-CR", {
    maximumFractionDigits: 2,
  });

function Inventario() {
  const { user } = useAuthStore();
  const {
    movimientos,
    loading: cargandoMovimientos,
    error: errorInventario,
    fetchMovimientos,
    registrarEntrada,
    registrarSalida,
  } = useInventario();
  const {
    productosActivos,
    loading: cargandoProductos,
    error: errorProductos,
    fetchProductos,
  } = useProductos();

  const [tab, setTab] = useState("existencias");
  const [formE, setFormE] = useState(EMPTY_FORM);
  const [formS, setFormS] = useState(EMPTY_FORM);
  const [loadingOp, setLoadingOp] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos | entrada | salida
  const [filtroProducto, setFiltroProducto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroStock, setFiltroStock] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const resumenStock = useMemo(() => {
    const agotados = productosActivos.filter(
      (producto) => getEstadoStock(producto) === "agotado",
    ).length;
    const bajos = productosActivos.filter(
      (producto) => getEstadoStock(producto) === "bajo",
    ).length;
    const unidades = productosActivos.reduce(
      (total, producto) => total + (Number(producto.cantidad) || 0),
      0,
    );
    return { agotados, bajos, unidades };
  }, [productosActivos]);

  const productosFiltrados = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase();
    return productosActivos.filter((producto) => {
      const coincideTexto =
        !consulta ||
        [
          producto.nombre,
          producto.sku,
          producto.categoria_nombre,
        ].some((valor) => String(valor ?? "").toLocaleLowerCase().includes(consulta));
      const coincideStock =
        filtroStock === "todos" || getEstadoStock(producto) === filtroStock;
      return coincideTexto && coincideStock;
    });
  }, [productosActivos, busqueda, filtroStock]);

  const movimientosFiltrados = movimientos.filter((m) => {
    const coincideTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
    const coincideProducto =
      !filtroProducto || String(m.producto_id) === filtroProducto;
    return coincideTipo && coincideProducto;
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(movimientosFiltrados.length / MOVIMIENTOS_POR_PAGINA),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const movimientosVisibles = movimientosFiltrados.slice(
    (paginaActual - 1) * MOVIMIENTOS_POR_PAGINA,
    paginaActual * MOVIMIENTOS_POR_PAGINA,
  );

  useEffect(() => {
    setPagina(1);
  }, [filtroTipo, filtroProducto]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const handleEntrada = async (e) => {
    e.preventDefault();
    setLoadingOp(true);
    setMensaje("");
    try {
      const resultado = await registrarEntrada({
        producto_id: parseInt(formE.producto_id),
        cantidad: parseFloat(formE.cantidad),
        observaciones: formE.observaciones,
        usuario_id: user?.id ?? null,
      });
      if (!resultado.ok) {
        setMensaje(resultado.message || "No se pudo registrar la entrada.");
        return;
      }
      setFormE(EMPTY_FORM);
      setTab("existencias");
      await Promise.all([fetchMovimientos(), fetchProductos()]);
    } finally {
      setLoadingOp(false);
    }
  };

  const handleSalida = async (e) => {
    e.preventDefault();
    setLoadingOp(true);
    setMensaje("");
    try {
      const resultado = await registrarSalida({
        producto_id: parseInt(formS.producto_id),
        cantidad: parseFloat(formS.cantidad),
        observaciones: formS.observaciones,
        usuario_id: user?.id ?? null,
      });
      if (!resultado.ok) {
        setMensaje(resultado.message || "No se pudo registrar la salida.");
        return;
      }
      setFormS(EMPTY_FORM);
      setTab("existencias");
      await Promise.all([fetchMovimientos(), fetchProductos()]);
    } finally {
      setLoadingOp(false);
    }
  };

  if (cargandoMovimientos || cargandoProductos) {
    return <div className="page-loading">Cargando inventario…</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📦 Inventario</h1>
          <p>Consulta las existencias actuales de cada producto.</p>
        </div>
        <div className="inventory-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setMensaje("");
              setTab("entrada");
            }}
          >
            <ArrowDownIcon /> Registrar entrada
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setMensaje("");
              setTab("salida");
            }}
          >
            <ArrowUpIcon /> Registrar salida
          </button>
        </div>
      </div>

      {errorInventario && <p className="message-error">{errorInventario}</p>}
      {errorProductos && <p className="message-error">{errorProductos}</p>}
      {mensaje && ["entrada", "salida"].includes(tab) && (
        <p className="message-error">{mensaje}</p>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon info">📦</div>
          <div className="stat-info">
            <h3>{productosActivos.length}</h3>
            <p>Productos activos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">🧮</div>
          <div className="stat-info">
            <h3>{formatCantidad(resumenStock.unidades)}</h3>
            <p>Unidades en existencia</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">⚠️</div>
          <div className="stat-info">
            <h3>{resumenStock.bajos}</h3>
            <p>Productos bajo el mínimo</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger">⛔</div>
          <div className="stat-info">
            <h3>{resumenStock.agotados}</h3>
            <p>Productos agotados</p>
          </div>
        </div>
      </div>

      <div className="inventory-tabs" role="tablist" aria-label="Vistas de inventario">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "existencias"}
          className={`btn-filtro ${tab === "existencias" ? "active" : ""}`}
          onClick={() => setTab("existencias")}
        >
          Existencias
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "movimientos"}
          className={`btn-filtro ${tab === "movimientos" ? "active" : ""}`}
          onClick={() => setTab("movimientos")}
        >
          Historial de movimientos
        </button>
      </div>

      {tab === "existencias" && (
        <div className="list-container">
          <div className="inventory-toolbar">
            <input
              type="search"
              className="search-input"
              aria-label="Buscar producto en inventario"
              placeholder="Buscar por producto, SKU o categoría…"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
            <select
              className="filtro-select"
              aria-label="Filtrar por estado del stock"
              value={filtroStock}
              onChange={(event) => setFiltroStock(event.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="bajo">Bajo el mínimo</option>
              <option value="agotado">Agotado</option>
            </select>
          </div>

          {productosActivos.length === 0 ? (
            <p className="empty-state">No hay productos activos para mostrar.</p>
          ) : productosFiltrados.length === 0 ? (
            <p className="empty-state">
              No hay productos que coincidan con la búsqueda o el filtro.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table inventory-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th>Existencia actual</th>
                    <th>Stock mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((producto) => {
                    const estado = getEstadoStock(producto);
                    return (
                      <tr
                        key={producto.id}
                        className={estado === "disponible" ? "" : "fila-alerta"}
                      >
                        <td>
                          <strong>{producto.nombre}</strong>
                        </td>
                        <td>{producto.sku || "—"}</td>
                        <td>{producto.categoria_nombre || "—"}</td>
                        <td>
                          <strong className="inventory-quantity">
                            {formatCantidad(producto.cantidad)}
                          </strong>
                        </td>
                        <td>{formatCantidad(producto.stock_minimo)}</td>
                        <td>
                          <span
                            className={`pill ${
                              estado === "disponible"
                                ? "pill-si"
                                : estado === "bajo"
                                  ? "pill-warn"
                                  : "pill-no"
                            }`}
                          >
                            {estado === "disponible"
                              ? "Disponible"
                              : estado === "bajo"
                                ? "Bajo el mínimo"
                                : "Agotado"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "movimientos" && (
        <div className="list-container">
          <h2 className="inventory-section-title">Historial de movimientos</h2>
          <div className="filtros">
            <button
              type="button"
              className={`btn-filtro ${filtroTipo === "todos" ? "active" : ""}`}
              onClick={() => setFiltroTipo("todos")}
            >
              Todos
            </button>
            <button
              type="button"
              className={`btn-filtro ${filtroTipo === "entrada" ? "active" : ""}`}
              onClick={() => setFiltroTipo("entrada")}
            >
              Entradas
            </button>
            <button
              type="button"
              className={`btn-filtro ${filtroTipo === "salida" ? "active" : ""}`}
              onClick={() => setFiltroTipo("salida")}
            >
              Salidas
            </button>

            <select
              className="filtro-select"
              value={filtroProducto}
              onChange={(e) => setFiltroProducto(e.target.value)}
            >
              <option value="">Todos los productos</option>
              {productosActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {movimientosFiltrados.length === 0 ? (
            <p className="empty-state">No hay movimientos registrados.</p>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Observaciones</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosVisibles.map((m) => (
                    <tr key={m.id}>
                      <td>{m.id}</td>
                      <td>
                        <span
                          className={`pill ${m.tipo === "entrada" ? "pill-si" : "pill-no"}`}
                        >
                          {m.tipo === "entrada" ? (
                            <ArrowDownIcon width={12} height={12} />
                          ) : (
                            <ArrowUpIcon width={12} height={12} />
                          )}{" "}
                          {m.tipo === "entrada" ? "Entrada" : "Salida"}
                        </span>
                      </td>
                      <td>{m.producto_nombre ?? "—"}</td>
                      <td>{m.cantidad}</td>
                      <td>{m.observaciones || "—"}</td>
                      <td>{formatDateTime(m.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                <nav
                  className="pagination"
                  aria-label="Paginación de movimientos"
                >
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() =>
                      setPagina((actual) => Math.max(1, actual - 1))
                    }
                    disabled={paginaActual === 1}
                  >
                    Anterior
                  </button>
                  {Array.from(
                    { length: totalPaginas },
                    (_, index) => index + 1,
                  ).map((numero) => (
                    <button
                      key={numero}
                      type="button"
                      className={`pagination-button ${paginaActual === numero ? "active" : ""}`}
                      onClick={() => setPagina(numero)}
                      aria-current={
                        paginaActual === numero ? "page" : undefined
                      }
                    >
                      {numero}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() =>
                      setPagina((actual) => Math.min(totalPaginas, actual + 1))
                    }
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      )}

      {tab === "entrada" && (
        <div className="form-section">
          <h2>📥 Registrar entrada de inventario</h2>
          <form onSubmit={handleEntrada} className="form-grid">
            <div className="form-group">
              <label>Producto *</label>
              <select
                required
                value={formE.producto_id}
                onChange={(e) =>
                  setFormE({ ...formE, producto_id: e.target.value })
                }
              >
                <option value="">Seleccionar producto</option>
                {productosActivos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (stock: {p.cantidad})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={formE.cantidad}
                onChange={(e) =>
                  setFormE({ ...formE, cantidad: e.target.value })
                }
              />
            </div>
            <div className="form-group full-width">
              <label>Observaciones</label>
              <textarea
                rows={2}
                value={formE.observaciones}
                onChange={(e) =>
                  setFormE({ ...formE, observaciones: e.target.value })
                }
                placeholder="Proveedor, motivo, etc."
              />
            </div>
            <div className="form-actions full-width">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTab("movimientos")}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loadingOp}
              >
                {loadingOp ? "Registrando…" : "✅ Registrar entrada"}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "salida" && (
        <div className="form-section">
          <h2>📤 Registrar salida de inventario</h2>
          <form onSubmit={handleSalida} className="form-grid">
            <div className="form-group">
              <label>Producto *</label>
              <select
                required
                value={formS.producto_id}
                onChange={(e) =>
                  setFormS({ ...formS, producto_id: e.target.value })
                }
              >
                <option value="">Seleccionar producto</option>
                {productosActivos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (stock: {p.cantidad})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={formS.cantidad}
                onChange={(e) =>
                  setFormS({ ...formS, cantidad: e.target.value })
                }
              />
            </div>
            <div className="form-group full-width">
              <label>Observaciones</label>
              <textarea
                rows={2}
                value={formS.observaciones}
                onChange={(e) =>
                  setFormS({ ...formS, observaciones: e.target.value })
                }
                placeholder="Motivo de salida, destino, etc."
              />
            </div>
            <div className="form-actions full-width">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTab("movimientos")}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loadingOp}
              >
                {loadingOp ? "Registrando…" : "✅ Registrar salida"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Inventario;
