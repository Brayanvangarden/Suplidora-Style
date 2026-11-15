import {
  COMPANY_LOGO_URL,
  generarFacturaPdf,
  generarProformaPdf,
  imprimirFactura,
} from "../services/facturaPdf.service";
import { useState } from "react";
import { formatCRC } from "../utils/currency";
import { formatDate } from "../utils/formatDate";

function moneda(value) {
  return formatCRC(value);
}

function formatNumeroOrden(id, esProforma = false) {
  const prefijo = esProforma ? "N.º " : "No. ";
  return `${prefijo}${String(Number(id ?? 0)).padStart(4, "0")}`;
}

export default function Factura({
  factura,
  onClose,
  tipoDocumento = "factura",
}) {
  const [error, setError] = useState("");
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
  if (billToLines.length === 0) billToLines.push("Address not provided");

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
              Print
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
            {esProforma ? "Descargar proforma (PDF)" : "Download PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary factura-cerrar"
            onClick={onClose}
          >
            {esProforma ? "Cerrar" : "Close"}
          </button>
        </div>

        {error && <p className="message-error">{error}</p>}

        <article className="factura-documento factura-documento-proforma">
          <header className="factura-header-proforma">
            <div className="factura-brand-block">
              <img
                className="factura-brand-logo"
                src={COMPANY_LOGO_URL}
                alt="Logo de BeYou"
              />
              {esProforma ? (
                <p>Suplidora y academia de belleza Style</p>
              ) : (
                <>
                  <p>NATUR VITALIA LLC</p>
                  <p>7980 W 25th Ct. Hialeah, FL 33016</p>
                  <p>Tel. (754) 209-3195 / (954) 889-4019</p>
                </>
              )}
            </div>
            <div className="factura-invoice-meta">
              <strong>{esProforma ? "PROFORMA" : "INVOICE"}</strong>
              <span>
                {esProforma ? "Orden " : ""}
                {formatNumeroOrden(
                  factura.orden_id ?? factura.id,
                  esProforma,
                )}
              </span>
            </div>
          </header>

          {esProforma ? (
            <div className="factura-detalles-orden">
              <p>
                <strong>Cliente:</strong>{" "}
                {factura.cliente_nombre || "Sin cliente"}
              </p>
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
              {factura.notas && (
                <p>
                  <strong>Notas:</strong> {factura.notas}
                </p>
              )}
            </div>
          ) : (
            <div className="factura-box-grid">
              <div className="factura-box">
                <h2>Bill to:</h2>
                {billToLines.map((line, index) => (
                  <p key={`${index}-${line}`}>{line}</p>
                ))}
              </div>
              <div className="factura-box">
                <h2>Ship to:</h2>
                <p>
                  {factura.ship_to_direccion ||
                    factura.notas ||
                    "Address not provided"}
                </p>
              </div>
            </div>
          )}

          <table className="factura-tabla factura-tabla-proforma">
            <thead>
              <tr>
                <th>{esProforma ? "Código" : "Item No."}</th>
                <th>{esProforma ? "Descripción" : "Description"}</th>
                <th>{esProforma ? "Cantidad" : "Quantity"}</th>
                <th>{esProforma ? "Precio unitario" : "Unit Price"}</th>
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
                      (esProforma ? "Producto" : "Product")}
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
                <span>{esProforma ? "Descuento" : "Discount"}</span>
                <strong>-{moneda(descuentos)}</strong>
              </div>
            )}
            {!esProforma && (
              <>
                <div className="factura-totales-row">
                  <span>Shipping</span>
                  <strong>{moneda(0)}</strong>
                </div>
                <div className="factura-totales-row">
                  <span>Tax</span>
                  <strong>{moneda(impuestos || 0)}</strong>
                </div>
                <div className="factura-totales-row">
                  <span>Deposit</span>
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
              <p>Payment method</p>
              <p>Checks may be sent ACH to:</p>
              <p>NATUR VITALIA LLC</p>
              <p>Wells Fargo Bank</p>
              <p>Account #2813330806</p>
              <p>For direct deposit routing #063107513</p>
              <p>For wire transfer routing #121000248</p>
              <p>
                {moneda(35)} Applies to all the checks returned for any reason
              </p>
            </div>
          )}

          {!esProforma && (
            <div className="factura-note-block">
              <p>
                <strong>*NOTE:</strong> All orders must be paid as follows:
              </p>
              <p>
                1) Any payments to Natur Vitalia LLC greater or equal to{" "}
                {moneda(5000)} will need to be made in the form of a wire or
                credit card (CC 3% processing fee will be charged for any
                amount) to facilitate a commencement of the order.
              </p>
              <p>
                2) Any payments via check (regardless of size) may delay
                commencement of the order and/or delivery by up to 10 days from
                the date Natur Vitalia LLC receives the check.
              </p>
              <p>
                3) Payments must be done within 30 days after the order has
                been delivered.
              </p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
