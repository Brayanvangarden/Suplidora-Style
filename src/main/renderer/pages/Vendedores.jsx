import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { vendedoresService } from "../services/vendedores.service";
import { formatCRC } from "../utils/currency";
import { formatDate } from "../utils/formatDate";
import { formatMetodoPago } from "../utils/formatMetodoPago";

const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "datafono", label: "Datáfono" },
  { value: "sinpe_movil", label: "Sinpe Móvil" },
];

function Vendedores() {
  const { user, isAdmin } = useAuth();
  const [resumen, setResumen] = useState([]);
  const [vendedorId, setVendedorId] = useState(
    isAdmin ? "" : String(user?.id ?? ""),
  );
  const [ventas, setVentas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [form, setForm] = useState({
    monto: "",
    metodoPago: "efectivo",
    notas: "",
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const vendedorSeleccionado = resumen.find(
    (vendedor) => String(vendedor.id) === String(vendedorId),
  );

  useEffect(() => {
    let activo = true;
    const cargarResumen = async () => {
      setCargando(true);
      setError("");
      try {
        const datos = await vendedoresService.getResumen(
          user.id,
          isAdmin ? null : user.id,
        );
        if (!activo) return;
        setResumen(datos);
        if (isAdmin) {
          setVendedorId((actual) =>
            datos.some((vendedor) => String(vendedor.id) === actual)
              ? actual
              : String(datos[0]?.id ?? ""),
          );
        }
      } catch (loadError) {
        if (activo) {
          setError(loadError.message || "No se pudo cargar la información.");
        }
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargarResumen();
    return () => {
      activo = false;
    };
  }, [user.id, isAdmin]);

  useEffect(() => {
    if (!vendedorId) {
      setVentas([]);
      setPagos([]);
      return undefined;
    }

    let activo = true;
    const cargarDetalle = async () => {
      try {
        const [ventasData, pagosData] = await Promise.all([
          vendedoresService.getDetalle(user.id, Number(vendedorId)),
          isAdmin
            ? vendedoresService.getPagos(user.id, Number(vendedorId))
            : Promise.resolve([]),
        ]);
        if (!activo) return;
        setVentas(ventasData);
        setPagos(pagosData);
      } catch (loadError) {
        if (activo) {
          setError(loadError.message || "No se pudo cargar el detalle.");
        }
      }
    };
    cargarDetalle();
    return () => {
      activo = false;
    };
  }, [user.id, isAdmin, vendedorId]);

  const refrescarResumen = async () => {
    const datos = await vendedoresService.getResumen(
      user.id,
      isAdmin ? null : user.id,
    );
    setResumen(datos);
  };

  const registrarPago = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");
    const monto = Number(form.monto);
    if (!vendedorSeleccionado || !Number.isFinite(monto) || monto <= 0) {
      setError("Ingresa un monto válido para el pago.");
      return;
    }

    setGuardando(true);
    try {
      const pago = await vendedoresService.registrarPago({
        vendedor_id: Number(vendedorId),
        monto,
        metodo_pago: form.metodoPago,
        notas: form.notas,
        admin_id: user.id,
      });
      setPagos((actuales) => [pago, ...actuales]);
      setForm({ monto: "", metodoPago: "efectivo", notas: "" });
      await refrescarResumen();
      setMensaje("Pago de comisión registrado.");
    } catch (saveError) {
      setError(saveError.message || "No se pudo registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="page-loading">Cargando vendedores...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Vendedores</h1>
          <p>Ventas y comisiones por vendedor</p>
        </div>
      </div>

      {error && <p className="message-error">{error}</p>}
      {mensaje && <div className="message-success-banner">{mensaje}</div>}

      {resumen.length === 0 ? (
        <p className="empty-state">No hay usuarios con rol vendedor.</p>
      ) : (
        <>
          <section className="panel-card">
            <h2>Resumen de vendedores</h2>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Comisión</th>
                    <th>Ventas facturadas</th>
                    <th>Total facturado</th>
                    <th>Comisiones</th>
                    {isAdmin && (
                      <>
                        <th>Pagado</th>
                        <th>Por pagar</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((vendedor) => (
                    <tr
                      key={vendedor.id}
                      className={
                        String(vendedor.id) === String(vendedorId)
                          ? "active"
                          : ""
                      }
                      onClick={() => setVendedorId(String(vendedor.id))}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{vendedor.nombre}</td>
                      <td>{Number(vendedor.comision_porcentaje)}%</td>
                      <td>{vendedor.ventas_facturadas}</td>
                      <td>{formatCRC(vendedor.total_facturado)}</td>
                      <td>{formatCRC(vendedor.total_comisiones)}</td>
                      {isAdmin && (
                        <>
                          <td>{formatCRC(vendedor.total_pagado)}</td>
                          <td>{formatCRC(vendedor.saldo_por_pagar)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {vendedorSeleccionado && (
            <>
              <section className="stats-grid">
                <div className="stat-card">
                  <div>
                    <h3>{vendedorSeleccionado.ventas_facturadas}</h3>
                    <p>Ventas facturadas</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <h3>{formatCRC(vendedorSeleccionado.total_facturado)}</h3>
                    <p>Total facturado</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div>
                    <h3>{formatCRC(vendedorSeleccionado.total_comisiones)}</h3>
                    <p>Comisiones generadas</p>
                  </div>
                </div>
              </section>

              <section className="panel-card">
                <h2>Ventas y comisiones de {vendedorSeleccionado.nombre}</h2>
                {ventas.length === 0 ? (
                  <p className="empty-msg">Este vendedor aún no tiene órdenes.</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Orden</th>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Total</th>
                          <th>Factura</th>
                          <th>Comisión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.map((venta) => (
                          <tr key={venta.orden_id}>
                            <td>
                              N.º {String(venta.orden_id).padStart(4, "0")}
                            </td>
                            <td>{formatDate(venta.fecha_creacion)}</td>
                            <td>{venta.cliente_nombre || "—"}</td>
                            <td>
                              {formatCRC(
                                venta.total_facturado ?? venta.total_orden,
                              )}
                            </td>
                            <td>
                              {venta.numero_factura || "Pendiente de facturar"}
                            </td>
                            <td>
                              {venta.comision == null
                                ? "—"
                                : `${formatCRC(venta.comision)} (${Number(
                                    venta.porcentaje_comision,
                                  )}%)`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {isAdmin && (
                <section className="panel-card">
                  <h2>Pagos de comisiones</h2>
                  <p>
                    Saldo pendiente:{" "}
                    <strong>
                      {formatCRC(vendedorSeleccionado.saldo_por_pagar)}
                    </strong>
                  </p>
                  {Number(vendedorSeleccionado.saldo_por_pagar) > 0 && (
                    <form className="modal-form" onSubmit={registrarPago}>
                      <div className="form-group">
                        <label htmlFor="pago-comision-monto">Monto *</label>
                        <input
                          id="pago-comision-monto"
                          type="number"
                          min="0.01"
                          max={vendedorSeleccionado.saldo_por_pagar}
                          step="0.01"
                          value={form.monto}
                          onChange={(event) =>
                            setForm({ ...form, monto: event.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="pago-comision-metodo">
                          Método de pago
                        </label>
                        <select
                          id="pago-comision-metodo"
                          value={form.metodoPago}
                          onChange={(event) =>
                            setForm({ ...form, metodoPago: event.target.value })
                          }
                        >
                          {METODOS_PAGO.map((metodo) => (
                            <option key={metodo.value} value={metodo.value}>
                              {metodo.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="pago-comision-notas">Notas</label>
                        <textarea
                          id="pago-comision-notas"
                          rows={2}
                          value={form.notas}
                          onChange={(event) =>
                            setForm({ ...form, notas: event.target.value })
                          }
                        />
                      </div>
                      <button
                        className="btn-primary"
                        type="submit"
                        disabled={guardando}
                      >
                        {guardando ? "Registrando..." : "Registrar pago"}
                      </button>
                    </form>
                  )}

                  <h3>Historial de pagos</h3>
                  {pagos.length === 0 ? (
                    <p className="empty-msg">Todavía no hay pagos registrados.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Método</th>
                            <th>Registrado por</th>
                            <th>Notas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagos.map((pago) => (
                            <tr key={pago.id}>
                              <td>{formatDate(pago.fecha_pago)}</td>
                              <td>{formatCRC(pago.monto)}</td>
                              <td>{formatMetodoPago(pago.metodo_pago)}</td>
                              <td>{pago.admin_nombre || "—"}</td>
                              <td>{pago.notas || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Vendedores;
