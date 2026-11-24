import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useOrdenes } from "../hooks/useOrdenes";
import { useClientes } from "../hooks/useClientes";
import { useProductos } from "../hooks/useProductos";
import { usePagos } from "../hooks/usePagos";
import { useUsuarios } from "../hooks/useUsuarios";
import Factura from "../components/Factura";
import CrudFormFrame from "../components/CrudFormFrame";
import { clientesService } from "../services/clientes.service";
import { generarProformaPdf } from "../services/facturaPdf.service";
import { ordenesService } from "../services/ordenes.service";
import { formatDate } from "../utils/formatDate";
import { formatCRC } from "../utils/currency";

const NUEVA_LINEA = { productoId: "", cantidad: "1", precio: "0" };
const bloquearTeclasNoNumericas = (event) => {
  if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
};

const aceptarNumero = (value, decimal = false) => {
  const patron = decimal ? /^\d*(\.\d*)?$/ : /^\d*$/;
  return patron.test(value) ? value : null;
};

const ORDENES_POR_PAGINA = 10;

function Ordenes() {
  const { user, isAdmin } = useAuth();
  const {
    ordenes,
    ordenesPendientes,
    ordenesPorCobrar,
    ordenesProcesadas,
    resumen,
    loading,
    error,
    crearOrden,
    actualizarOrden,
  } = useOrdenes();

  const { clientes } = useClientes();
  const {
    productosActivos,
    fetchProductos,
    error: errorProductos,
  } = useProductos();
  const { pagos } = usePagos();
  const { vendedores } = useUsuarios();

  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    clienteId: "",
    vendedorId: isAdmin ? "" : String(user?.id ?? ""),
    shipToClienteId: "",
    fechaEntrega: "",
    notas: "",
    descuentoOrden: "0",
  });
  const vendedoresDisponibles = vendedores.filter(
    (vendedor) =>
      vendedor.estado === "activo" ||
      String(vendedor.id) === form.vendedorId,
  );
  const vendedorSeleccionado = vendedores.find(
    (vendedor) => String(vendedor.id) === form.vendedorId,
  );
  const [lineas, setLineas] = useState([NUEVA_LINEA]);
  const [filtroPago, setFiltroPago] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [proformaPreview, setProformaPreview] = useState(null);

  // Auto-limpia el mensaje
  useEffect(() => {
    if (!mensaje) return;
    const timer = setTimeout(() => setMensaje(""), 3000);
    return () => clearTimeout(timer);
  }, [mensaje]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => String(c.id) === form.clienteId),
    [clientes, form.clienteId],
  );
  const descuentoPorcentaje = clienteSeleccionado?.tiene_descuento
    ? Number(clienteSeleccionado.descuento_porcentaje ?? 0)
    : 0;

  // Calcula, por orden, cuánto se ha pagado y cuánto falta —
  // usando el historial real de pagos, no un simple flag.
  const saldoPorOrden = useMemo(() => {
    const mapa = new Map();
    for (const orden of ordenes) {
      const totalPagado = pagos
        .filter((pago) => String(pago.orden_id) === String(orden.id))
        .reduce((total, pago) => total + Number(pago.monto), 0);
      mapa.set(orden.id, {
        totalPagado,
        saldoPendiente: Math.max(0, Number(orden.total) - totalPagado),
      });
    }
    return mapa;
  }, [ordenes, pagos]);

  const ordenarVisible = useMemo(() => {
    let lista = ordenes;

    if (filtroPago !== "todos") {
      lista = lista.filter((o) => o.estado_pago === filtroPago);
    }

    if (!busqueda) return lista;

    const q = busqueda.toLowerCase();
    return lista.filter(
      (o) =>
        String(o.id).includes(q) ||
        o.cliente_nombre?.toLowerCase().includes(q) ||
        o.cliente_empresa?.toLowerCase().includes(q) ||
        o.estado?.toLowerCase().includes(q) ||
        o.estado_pago?.toLowerCase().includes(q),
    );
  }, [ordenes, filtroPago, busqueda]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(ordenarVisible.length / ORDENES_POR_PAGINA),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const ordenesVisibles = ordenarVisible.slice(
    (paginaActual - 1) * ORDENES_POR_PAGINA,
    paginaActual * ORDENES_POR_PAGINA,
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroPago]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const handleClienteSelect = (clienteId) => {
    setForm((prev) => ({ ...prev, clienteId }));
  };

  const actualizarLinea = (index, cambios) => {
    setLineas((prev) =>
      prev.map((linea, i) => (i === index ? { ...linea, ...cambios } : linea)),
    );
  };

  const handleProductoSelect = async (index, productoId) => {
    setMensaje("");
    if (
      productoId &&
      lineas.some(
        (linea, lineaIndex) =>
          lineaIndex !== index && linea.productoId === productoId,
      )
    ) {
      setMensaje("Ese producto ya está agregado a la orden.");
      return;
    }

    const producto = productosActivos.find(
      (item) => String(item.id) === productoId,
    );
    const precioInicial = producto ? String(producto.precio) : "0";

    actualizarLinea(index, { productoId, precio: precioInicial });

    if (!form.clienteId || !producto) return;

    const precioEspecial = await clientesService.getPrecioEspecial(
      Number(form.clienteId),
      producto.id,
    );

    if (precioEspecial != null) {
      actualizarLinea(index, { precio: String(precioEspecial) });
    }
  };

  const agregarLinea = () => setLineas((prev) => [...prev, NUEVA_LINEA]);
  const removerLinea = (index) =>
    setLineas((prev) => prev.filter((_, i) => i !== index));

  const lineasValidas = lineas.filter(
    (linea) => linea.productoId && Number(linea.cantidad) > 0,
  );

  const subtotalOrden = lineasValidas.reduce(
    (acc, linea) => acc + Number(linea.precio) * Number(linea.cantidad),
    0,
  );
  const descuentoOrdenPorcentaje = Number(form.descuentoOrden) || 0;
  const descuentoOrdenMaximo = Math.max(0, 100 - descuentoPorcentaje);
  const descuentoOrdenAplicado = Math.min(
    descuentoOrdenPorcentaje,
    descuentoOrdenMaximo,
  );
  const descuentoClienteMonto = subtotalOrden * (descuentoPorcentaje / 100);
  const descuentoOrdenMonto =
    subtotalOrden * (descuentoOrdenAplicado / 100);
  const descuentoMonto = descuentoClienteMonto + descuentoOrdenMonto;
  const totalOrden = subtotalOrden - descuentoMonto;

  useEffect(() => {
    if (!form.clienteId) return;
    const clienteId = Number(form.clienteId);
    const actualizarPrecios = async () => {
      const nuevasLineas = await Promise.all(
        lineas.map(async (linea) => {
          if (!linea.productoId) return linea;
          const precioEspecial = await clientesService.getPrecioEspecial(
            clienteId,
            Number(linea.productoId),
          );
          if (precioEspecial != null) {
            return { ...linea, precio: String(precioEspecial) };
          }
          return linea;
        }),
      );
      setLineas(nuevasLineas);
    };
    actualizarPrecios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.clienteId]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({
      clienteId: "",
      vendedorId: isAdmin ? "" : String(user?.id ?? ""),
      shipToClienteId: "",
      fechaEntrega: "",
      notas: "",
      descuentoOrden: "0",
    });
    setLineas([NUEVA_LINEA]);
    setMensaje("");
    setModal(true);
  };

  const abrirEditar = async (orden) => {
    try {
      setMensaje("");
      const ordenData = await ordenesService.getById(orden.id);
      const detalle = ordenData.detalle.map((item) => ({
        productoId: String(item.producto_id),
        cantidad: String(item.cantidad),
        precio: String(item.precio_unitario),
      }));

      setEditandoId(orden.id);
      setForm({
        clienteId: String(ordenData.cliente_id),
        vendedorId: String(
          ordenData.vendedor_id ?? (isAdmin ? "" : user?.id ?? ""),
        ),
        shipToClienteId: ordenData.ship_to_cliente_id
          ? String(ordenData.ship_to_cliente_id)
          : "",
        fechaEntrega: ordenData.fecha_entrega || "",
        notas: ordenData.notas || "",
        descuentoOrden: String(ordenData.descuento_orden_porcentaje ?? 0),
      });
      setLineas(detalle.length ? detalle : [NUEVA_LINEA]);
      setModal(true);
    } catch (err) {
      setMensaje(err.message || "No se pudo cargar la orden.");
    }
  };

  const generarProforma = async (orden) => {
    try {
      const ordenCompleta = await ordenesService.getById(orden.id);
      await generarProformaPdf(ordenCompleta);
      setMensaje(
        `Proforma de la orden N.º ${String(orden.id).padStart(4, "0")} descargada.`,
      );
    } catch (err) {
      setMensaje(err.message || "No se pudo generar la proforma.");
    }
  };

  const verProforma = async (orden) => {
    try {
      const ordenCompleta = await ordenesService.getById(orden.id);
      setProformaPreview(ordenCompleta);
    } catch (err) {
      setMensaje(err.message || "No se pudo cargar la proforma.");
    }
  };

  const cerrarModal = () => {
    setModal(false);
    setEditandoId(null);
    setForm({
      clienteId: "",
      vendedorId: isAdmin ? "" : String(user?.id ?? ""),
      shipToClienteId: "",
      fechaEntrega: "",
      notas: "",
      descuentoOrden: "0",
    });
    setLineas([NUEVA_LINEA]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMensaje("");

    if (!form.clienteId) {
      setMensaje("Selecciona un cliente para la orden.");
      return;
    }
    if (!form.vendedorId) {
      setMensaje("Selecciona un vendedor para la orden.");
      return;
    }

    if (
      !Number.isFinite(Number(form.descuentoOrden)) ||
      Number(form.descuentoOrden) < 0 ||
      descuentoPorcentaje + Number(form.descuentoOrden) > 100
    ) {
      setMensaje("La suma de los descuentos no puede superar el 100%.");
      return;
    }

    const lineaInvalida = lineas.find(
      (linea) =>
        linea.productoId &&
        (!Number.isInteger(Number(linea.cantidad)) ||
          Number(linea.cantidad) <= 0 ||
          !Number.isFinite(Number(linea.precio)) ||
          Number(linea.precio) < 0),
    );
    if (lineaInvalida) {
      setMensaje(
        "La cantidad y el precio deben ser valores numéricos válidos.",
      );
      return;
    }

    if (lineasValidas.length === 0) {
      setMensaje("Agrega al menos un producto a la orden.");
      return;
    }

    const productosDuplicados = new Set();
    const productosAgregados = new Set();
    for (const linea of lineasValidas) {
      if (productosAgregados.has(linea.productoId)) {
        productosDuplicados.add(linea.productoId);
      }
      productosAgregados.add(linea.productoId);
    }
    if (productosDuplicados.size > 0) {
      setMensaje("No puedes agregar el mismo producto más de una vez.");
      return;
    }

    const excedeStock = lineasValidas.find((linea) => {
      const producto = productosActivos.find(
        (p) => String(p.id) === linea.productoId,
      );
      return producto && Number(linea.cantidad) > Number(producto.cantidad);
    });

    if (excedeStock) {
      const producto = productosActivos.find(
        (p) => String(p.id) === excedeStock.productoId,
      );
      setMensaje(
        `La cantidad solicitada de ${producto?.nombre || "el producto"} excede el stock disponible.`,
      );
      return;
    }

    setGuardando(true);
    try {
      const detalle = lineasValidas.map((linea) => ({
        producto_id: Number(linea.productoId),
        cantidad: Number(linea.cantidad),
        precio_unitario: Number(linea.precio),
        subtotal: Number(linea.precio) * Number(linea.cantidad),
      }));

      if (editandoId) {
        const respuesta = await actualizarOrden(editandoId, {
          cliente_id: Number(form.clienteId),
          vendedor_id: Number(form.vendedorId),
          ship_to_cliente_id: form.shipToClienteId
            ? Number(form.shipToClienteId)
            : null,
          fecha_entrega: form.fechaEntrega || null,
          notas: form.notas,
          usuario_id: user?.id,
          descuento_porcentaje:
            descuentoPorcentaje + descuentoOrdenPorcentaje,
          descuento_orden_porcentaje: descuentoOrdenPorcentaje,
          detalle,
        });

        if (!respuesta.ok) {
          setMensaje(respuesta.message || "No se pudo actualizar la orden.");
          return;
        }

        await fetchProductos();
        cerrarModal();
        setMensaje(
          `Orden N.º ${String(respuesta.data.id).padStart(4, "0")} actualizada correctamente.`,
        );
      } else {
        const respuesta = await crearOrden({
          cliente_id: Number(form.clienteId),
          vendedor_id: Number(form.vendedorId),
          ship_to_cliente_id: form.shipToClienteId
            ? Number(form.shipToClienteId)
            : null,
          fecha_entrega: form.fechaEntrega || null,
          notas: form.notas,
          usuario_id: user?.id,
          descuento_porcentaje:
            descuentoPorcentaje + descuentoOrdenPorcentaje,
          descuento_orden_porcentaje: descuentoOrdenPorcentaje,
          detalle,
        });

        if (!respuesta.ok) {
          setMensaje(respuesta.message || "No se pudo crear la orden.");
          return;
        }

        await fetchProductos();
        cerrarModal();
        setMensaje("Orden creada correctamente.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const pillPago = (estadoPago) => {
    if (estadoPago === "pagado") return "pill-si";
    if (estadoPago === "parcial") return "pill-warn";
    return "pill-no"; // pendiente
  };

  if (loading) return <div className="page-loading">Cargando órdenes…</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🧾 Órdenes</h1>
        <div className="header-actions">
          <button className="btn-primary" onClick={abrirNuevo}>
            + Nueva orden
          </button>
        </div>
      </div>

      {error && <p className="message-error">{error}</p>}
      {errorProductos && <p className="message-error">{errorProductos}</p>}
      {mensaje && !modal && (
        <div className="message-success-banner">✅ {mensaje}</div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <h3>{ordenesPendientes.length}</h3>
            <p>Órdenes pendientes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{ordenesProcesadas.length}</h3>
            <p>Procesadas</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>{ordenesPorCobrar.length}</h3>
            <p>Por cobrar</p>
          </div>
        </div>
      </div>

      <div className="list-container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por ID, cliente o estado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              type="button"
              className="search-bar-clear"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filtros-grupo">
          <span className="filtros-label">Estado de pago:</span>
          <div className="filtros">
            {["todos", "pendiente", "parcial", "pagado"].map((item) => (
              <button
                key={item}
                type="button"
                className={`btn-filtro ${filtroPago === item ? "active" : ""}`}
                onClick={() => setFiltroPago(item)}
              >
                {item === "todos" ? "Todos" : item}
              </button>
            ))}
          </div>
        </div>

        {ordenarVisible.length === 0 ? (
          <p className="empty-state">
            No hay órdenes que coincidan con el filtro.
          </p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>N.º Orden</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Fecha de envío</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesVisibles.map((orden) => {
                    const saldo = saldoPorOrden.get(orden.id);
                    return (
                      <tr key={orden.id}>
                        <td className="orden-numero">
                          N.º {String(orden.id).padStart(4, "0")}
                        </td>
                        <td>
                          <strong>{orden.cliente_nombre ?? "Sin cliente"}</strong>
                          {orden.cliente_empresa && (
                            <>
                              <br />
                              <small className="text-muted">
                                {orden.cliente_empresa}
                              </small>
                            </>
                          )}
                        </td>
                        <td>{orden.vendedor_nombre || "Sin asignar"}</td>
                        <td>{formatCRC(orden.total)}</td>
                        <td>
                          <span className={`pill ${pillPago(orden.estado_pago)}`}>
                            {orden.estado_pago}
                          </span>
                          {orden.estado_pago !== "pagado" &&
                            saldo?.saldoPendiente > 0 && (
                              <div className="pago-faltante">
                                Faltan {formatCRC(saldo.saldoPendiente)}
                              </div>
                            )}
                        </td>
                        <td>{formatDate(orden.fecha_entrega)}</td>
                        <td>{formatDate(orden.fecha_creacion)}</td>
                        <td className="action-buttons">
                          <button
                            className="btn-action-outline"
                            type="button"
                            onClick={() => abrirEditar(orden)}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn-action-outline"
                            type="button"
                            onClick={() => generarProforma(orden)}
                          >
                            🧾 Descargar proforma
                          </button>
                          <button
                            className="btn-action-outline"
                            type="button"
                            onClick={() => verProforma(orden)}
                          >
                            👁️ Ver proforma
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <nav className="pagination" aria-label="Paginación de órdenes">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
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
                    aria-current={paginaActual === numero ? "page" : undefined}
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

      {modal && (
        <CrudFormFrame
          title={
            editandoId
              ? `Editar orden N.º ${String(editandoId).padStart(4, "0")}`
              : "Nueva orden"
          }
          size="modal-lg"
          onClose={cerrarModal}
        >
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Cliente *</label>
                <select
                  required
                  value={form.clienteId}
                  onChange={(e) => handleClienteSelect(e.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}{" "}
                      {cliente.empresa ? `- ${cliente.empresa}` : ""}
                      {cliente.tiene_descuento
                        ? ` (−${cliente.descuento_porcentaje}%)`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="orden-vendedor">Vendedor *</label>
                <select
                  id="orden-vendedor"
                  required
                  value={form.vendedorId}
                  disabled={!isAdmin}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      vendedorId: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona un vendedor</option>
                  {vendedoresDisponibles.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre}
                    </option>
                  ))}
                </select>
                {form.vendedorId && (
                  <small className="field-help">
                    Vendedor asignado:{" "}
                    {vendedorSeleccionado?.nombre || "cargando información..."}
                  </small>
                )}
                {!form.vendedorId && editandoId && (
                  <small className="field-help">
                    Esta orden todavía no tiene vendedor asignado.
                  </small>
                )}
                {!isAdmin && !form.vendedorId && (
                  <small className="field-help">
                    La orden quedará asignada a tu usuario.
                  </small>
                )}
              </div>

              <div className="settings-section">
                <div className="form-group">
                  <label htmlFor="descuento-orden">
                    Descuento adicional de la orden (%)
                  </label>
                  <input
                    id="descuento-orden"
                    required
                    type="number"
                    min="0"
                    max={descuentoOrdenMaximo}
                    step="0.01"
                    value={form.descuentoOrden}
                    onKeyDown={bloquearTeclasNoNumericas}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        descuentoOrden: e.target.value,
                      }))
                    }
                  />
                  <small className="field-help">
                    Se suma al descuento del cliente ({descuentoPorcentaje}%).
                    Máximo adicional: {descuentoOrdenMaximo}%.
                  </small>
                </div>
              </div>

              <div className="settings-section">
                <h3>Detalle de productos</h3>
                {lineas.map((linea, index) => (
                  <div key={index} className="product-row">
                    <div className="form-group">
                      <label>Producto</label>
                      <select
                        required
                        value={linea.productoId}
                        onChange={(e) =>
                          handleProductoSelect(index, e.target.value)
                        }
                      >
                        <option value="">Selecciona un producto</option>
                        {productosActivos.map((productoItem) => {
                          const yaAgregado = lineas.some(
                            (otraLinea, otroIndice) =>
                              otroIndice !== index &&
                              otraLinea.productoId === String(productoItem.id),
                          );
                          const stock = Number(productoItem.cantidad) || 0;
                          return (
                            <option
                              key={productoItem.id}
                              value={productoItem.id}
                              disabled={stock <= 0 || yaAgregado}
                            >
                              {productoItem.nombre} · Stock: {stock}
                              {stock <= 0 ? " (Agotado)" : ""}
                              {yaAgregado ? " (Ya agregado)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Stock actual</label>
                      <div className="readonly-field">
                        {linea.productoId
                          ? (productosActivos.find(
                              (p) => String(p.id) === linea.productoId,
                            )?.cantidad ?? "—")
                          : "—"}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Cantidad</label>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        value={linea.cantidad}
                        onKeyDown={bloquearTeclasNoNumericas}
                        onChange={(e) => {
                          const value = aceptarNumero(e.target.value);
                          if (value === null) return;
                          const producto = productosActivos.find(
                            (p) => String(p.id) === linea.productoId,
                          );
                          const stockDisponible = Number(
                            producto?.cantidad ?? 0,
                          );
                          const cantidad = Math.min(
                            Number(value) || 0,
                            stockDisponible,
                          );
                          actualizarLinea(index, {
                            cantidad: cantidad ? String(cantidad) : "",
                          });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Precio unitario (₡)</label>
                      <input
                        required
                        type="text"
                        inputMode="decimal"
                        value={linea.precio}
                        onKeyDown={bloquearTeclasNoNumericas}
                        onChange={(e) => {
                          const value = aceptarNumero(e.target.value, true);
                          if (value !== null) {
                            actualizarLinea(index, { precio: value });
                          }
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Subtotal</label>
                      <input
                        type="text"
                        readOnly
                        value={formatCRC(
                          Number(linea.precio) * Number(linea.cantidad),
                        )}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => removerLinea(index)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={agregarLinea}
                >
                  + Agregar producto
                </button>
              </div>

              <div className="orden-resumen">
                <div className="orden-resumen-row">
                  <span>Subtotal</span>
                  <span>{formatCRC(subtotalOrden)}</span>
                </div>
                {descuentoPorcentaje > 0 && (
                  <div className="orden-resumen-row orden-resumen-descuento">
                    <span>Descuento cliente ({descuentoPorcentaje}%)</span>
                    <span>−{formatCRC(descuentoClienteMonto)}</span>
                  </div>
                )}
                {descuentoOrdenAplicado > 0 && (
                  <div className="orden-resumen-row orden-resumen-descuento">
                    <span>
                      Descuento adicional ({descuentoOrdenAplicado}%)
                    </span>
                    <span>−{formatCRC(descuentoOrdenMonto)}</span>
                  </div>
                )}
                <div className="orden-resumen-row orden-resumen-total">
                  <span>Total orden</span>
                  <span>{formatCRC(totalOrden)}</span>
                </div>
              </div>

              {mensaje && modal && <p className="message-error">{mensaje}</p>}

              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                      ? "Actualizar orden"
                      : "Guardar orden"}
                </button>
              </div>
            </form>
        </CrudFormFrame>
      )}
      {proformaPreview && (
        <Factura
          factura={proformaPreview}
          tipoDocumento="proforma"
          onClose={() => setProformaPreview(null)}
        />
      )}
    </div>
  );
}

export default Ordenes;
