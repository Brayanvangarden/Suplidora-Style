import {
  generarFacturaPdf,
  generarProformaPdf,
  imprimirFactura,
} from "../services/facturaPdf.service";
import { useState } from "react";
import { formatCRC } from "../utils/currency";
import { formatDate } from "../utils/formatDate";
import { formatMetodoPago } from "../utils/formatMetodoPago";
import { useTienda } from "../hooks/useTienda";
import { getTiendaLineasDocumento } from "../utils/tiendaDocumento";
import logoBelleza from "@assets/Logo de Belleza factura.jpg?inline";

function moneda(value) {
  return formatCRC(value);
}

function formatNumeroOrden(id, esProforma = false) {
  const prefijo = "N.º ";
  return `${prefijo}${String(Number(id ?? 0)).padStart(4, "0")}`;
}

export default function Factura({
  factura,
  onClose,
  tipoDocumento = "factura",
}) {
  const [error, setError] = useState("");
  const { tienda, loading: cargandoTienda, error: errorTienda } = useTienda();
  if (!factura) return null;

  const esProforma = tipoDocumento === "proforma";
  const subtotal = Number(
    factura.subtotal ??
      factura.detalle?.reduce(
        (total, item) => total + Number(item.subtotal ?? 0),
        0,
      ) ??
      0,
  );
  const impuestos = Number(factura.impuestos ?? 0);
  const total = Number(
    factura.total ?? subtotal - Number(factura.descuentos ?? 0) + impuestos,
  );
  const descuentos =
    Number(factura.descuentos ?? 0) ||
    Math.max(0, subtotal + impuestos - total);
  const billToLines = [
    factura.cliente_nombre,
    factura.cliente_direccion,
  ].filter((line) => typeof line === "string" && line.trim());
  if (billToLines.length === 0) billToLines.push("Dirección no proporcionada");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="factura-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="factura-actions">
          {!esProforma && (
            <button
              type="button"
              className="btn-secondary factura-imprimir"
              onClick={async () => {
                setError("");
                try {
                  await imprimirFactura(factura);
                } catch (actionError) {
                  setError(
                    actionError.message || "No se pudo imprimir la factura.",
                  );
                }
              }}
            >
              Imprimir
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              setError("");
              try {
                if (esProforma) {
                  await generarProformaPdf(factura);
                } else {
                  await generarFacturaPdf(factura);
                }
              } catch (actionError) {
                setError(
                  actionError.message ||
                    `No se pudo generar ${esProforma ? "la proforma" : "el PDF"}.`,
                );
              }
            }}
          >
            {esProforma ? "Descargar proforma (PDF)" : "Descargar PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary factura-cerrar"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        {error && <p className="message-error">{error}</p>}

        <article className="factura-documento factura-documento-proforma">
          <header className="factura-header-proforma">
            <div className="factura-brand-block">
              <img
                className="factura-brand-logo"
                src={logoBelleza}
                alt="Logo de belleza"
              />
              {tienda ? (
                getTiendaLineasDocumento(tienda).map((linea) => (
                  <p key={linea}>{linea}</p>
                ))
              ) : (
                <p>
                  {cargandoTienda
                    ? "Cargando información de la tienda…"
                    : errorTienda || "No se pudo cargar la información de la tienda."}
                </p>
              )}
            </div>
            <div className="factura-invoice-meta">
              <strong>{esProforma ? "PROFORMA" : "FACTURA"}</strong>
              <span>
                {esProforma ? "Orden " : ""}
                {formatNumeroOrden(
                  factura.orden_id ?? factura.id,
                  esProforma,
                )}
              </span>
            </div>
          </header>

          <div className="factura-box-grid">
            <div className="factura-box">
              <h2>Facturar a:</h2>
              {billToLines.map((line, index) => (
                <p key={`${index}-${line}`}>{line}</p>
              ))}
              <p>
                <strong>Fecha de emisión:</strong>{" "}
                {formatDate(factura.fecha_creacion)}
              </p>
              {factura.fecha_entrega && (
                <p>
                  <strong>Fecha de entrega:</strong>{" "}
                  {formatDate(factura.fecha_entrega)}
                </p>
              )}
            </div>
            <div className="factura-box">
              <h2>Enviar a:</h2>
              <p>
                {factura.ship_to_direccion ||
                  factura.cliente_direccion ||
                  factura.notas ||
                  "Dirección no proporcionada"}
              </p>
            </div>
          </div>

          <table className="factura-tabla factura-tabla-proforma">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {factura.detalle.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.codigo_producto ||
                      item.producto_sku ||
                      item.producto_id ||
                      "—"}
                  </td>
                  <td>
                    {item.descripcion ||
                      item.producto_nombre ||
                      "Producto"}
                  </td>
                  <td>{item.cantidad}</td>
                  <td>{moneda(item.precio_unitario ?? item.precio ?? 0)}</td>
                  <td>{moneda(item.subtotal ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="factura-totales factura-totales-proforma">
            <div className="factura-totales-row">
              <span>Subtotal</span>
              <strong>{moneda(subtotal)}</strong>
            </div>
            {descuentos > 0 && (
              <div className="factura-totales-row">
                <span>Descuento</span>
                <strong>-{moneda(descuentos)}</strong>
              </div>
            )}
            {!esProforma && (
              <>
                <div className="factura-totales-row">
                  <span>Envío</span>
                  <strong>{moneda(0)}</strong>
                </div>
                <div className="factura-totales-row">
                  <span>Impuesto</span>
                  <strong>{moneda(impuestos || 0)}</strong>
                </div>
                <div className="factura-totales-row">
                  <span>Depósito</span>
                  <strong>{moneda(0)}</strong>
                </div>
              </>
            )}
            <div className="factura-totales-row factura-total-row">
              <span>Total</span>
              <strong>{moneda(total)}</strong>
            </div>
          </div>

          {!esProforma && (
            <div className="factura-payment-block">
              <p>
                <strong>Método de pago utilizado:</strong>{" "}
                {formatMetodoPago(factura.metodo_pago)}
              </p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
