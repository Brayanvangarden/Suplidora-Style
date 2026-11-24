import { jsPDF } from "jspdf";
import { formatDate } from "../utils/formatDate";
import { tiendaService } from "./tienda.service";
import { getTiendaLineasDocumento } from "../utils/tiendaDocumento";
import { formatMetodoPago } from "../utils/formatMetodoPago";
import logoBelleza from "@assets/Logo de Belleza factura.jpg?inline";

function formatOrdenNumero(id) {
  return `N.º ${String(Number(id ?? 0)).padStart(4, "0")}`;
}

function obtenerLineasShipTo(documento) {
  const direccion = documento?.ship_to_direccion || documento?.notas;
  return String(direccion || "Dirección no proporcionada")
    .split(/\r?\n/)
    .filter((line) => line.trim());
}

function obtenerLineasBillTo(documento) {
  const lineas = [documento?.cliente_nombre, documento?.cliente_direccion]
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  return lineas.length ? lineas : ["Dirección no proporcionada"];
}

function dibujarCajasBillToShipTo(
  pdf,
  { billX, shipX, y, boxWidth, billToLines, shipToLines },
) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const contentWidth = boxWidth - 24;
  const wrapLines = (lines) =>
    lines.flatMap((line) =>
      String(line || "")
        .split(/\r?\n/)
        .filter((part) => part.trim())
        .flatMap((part) => pdf.splitTextToSize(part, contentWidth)),
    );
  const wrappedBill = wrapLines(billToLines);
  const wrappedShip = wrapLines(shipToLines);
  const lineCount = Math.max(wrappedBill.length, wrappedShip.length);
  const boxHeight = Math.max(108, 42 + lineCount * 12);

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.rect(billX, y, boxWidth, boxHeight);
  pdf.rect(shipX, y, boxWidth, boxHeight);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Facturar a:", billX + 10, y + 18);
  pdf.text("Enviar a:", shipX + 10, y + 18);

  pdf.setFont("helvetica", "normal");
  wrappedBill.forEach((line, index) => {
    pdf.text(String(line), billX + 18, y + 30 + index * 12);
  });
  wrappedShip.forEach((line, index) => {
    pdf.text(String(line), shipX + 18, y + 30 + index * 12);
  });

  return y + boxHeight + 10;
}

function monedaCRC(value) {
  return `CRC ${Number(value ?? 0).toLocaleString("es-CR", {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Dibuja el bloque de "Método de pago" (izquierda) y la caja de totales
 * (derecha) con las líneas/bordes del formato solicitado:
 * - Línea horizontal completa arriba del bloque.
 * - Línea vertical separando etiquetas y montos en la caja de totales.
 * - Línea horizontal fina antes de "Total".
 * - Línea doble debajo de "Total".
 *
 * Devuelve el Y donde termina el bloque, para poder ubicar el
 * texto de notas debajo sin que se encime.
 */
function dibujarPieYPago(
  pdf,
  {
    margin,
    pageWidth,
    startY,
    subtotal,
    descuento = 0,
    total,
    metodoPago,
    impuestosLabel = "Incluido",
  },
) {
  const totalsLabelX = pageWidth - 170;
  const totalsValueX = pageWidth - margin;
  const dividerX = totalsLabelX + 65;
  const rowHeight = 20;
  const lineTop = startY - 16;

  const rows = [{ label: "Subtotal", value: monedaCRC(subtotal) }];
  if (descuento > 0) {
    rows.push({ label: "Descuento", value: `-${monedaCRC(descuento)}` });
  }
  rows.push(
    { label: "Envío", value: monedaCRC(0) },
    { label: "Impuesto", value: impuestosLabel },
    { label: "Depósito", value: monedaCRC(0) },
  );

  // Línea horizontal completa arriba de todo el bloque
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1);
  pdf.line(margin, lineTop, pageWidth - margin, lineTop);

  pdf.setFontSize(10);
  rows.forEach((row, i) => {
    const rowY = startY + i * rowHeight;
    pdf.setFont("helvetica", "bold");
    pdf.text(row.label, totalsLabelX, rowY);
    pdf.setFont("helvetica", "normal");
    pdf.text(row.value, totalsValueX, rowY, { align: "right" });
  });

  const totalY = startY + rows.length * rowHeight;

  // Línea fina arriba de "Total"
  pdf.setLineWidth(0.8);
  pdf.line(totalsLabelX - 10, totalY - 15, pageWidth - margin, totalY - 15);

  pdf.setFont("helvetica", "bold");
  pdf.text("Total", totalsLabelX, totalY);
  pdf.text(monedaCRC(total), totalsValueX, totalY, { align: "right" });

  // Línea vertical separando etiqueta / monto
  pdf.setLineWidth(0.6);
  pdf.line(dividerX, lineTop, dividerX, totalY + 12);

  // Línea doble debajo de "Total"
  pdf.setLineWidth(1);
  pdf.line(totalsLabelX - 10, totalY + 9, pageWidth - margin, totalY + 9);
  pdf.line(totalsLabelX - 10, totalY + 12, pageWidth - margin, totalY + 12);

  // Bloque "Método de pago" (columna izquierda)
  pdf.setFontSize(9.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("Método de pago:", margin, startY + 4);
  pdf.setFont("helvetica", "normal");
  const metodoLines = pdf.splitTextToSize(
    formatMetodoPago(metodoPago),
    totalsLabelX - margin - 10,
  );
  pdf.text(metodoLines, margin, startY + 20);

  const paymentBottom = startY + 20 + metodoLines.length * 12;
  return Math.max(totalY + 12, paymentBottom);
}

function dibujarNotas(pdf, { margin, pageWidth, pageHeight, startY, notas }) {
  const texto = String(notas ?? "").trim();
  if (!texto) return;

  const noteLines = pdf.splitTextToSize(texto, pageWidth - margin * 2 - 42);
  const alturaEstimada = noteLines.length * 12 + 14;
  let y = startY;
  if (y + alturaEstimada > pageHeight - 30) {
    pdf.addPage();
    y = 60;
  }

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Notas:", margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(noteLines, margin + 42, y);
}

function dibujarEncabezado(pdf, { pageWidth, margin, titulo, numero, companyInfo }) {
  pdf.addImage(logoBelleza, "JPEG", margin, 28, 150, 48);
  let infoY = 91;
  const infoWidth = pageWidth - margin * 2 - 150;
  companyInfo.slice(1).forEach((line) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const wrapped = pdf.splitTextToSize(String(line), infoWidth);
    pdf.text(wrapped, margin, infoY);
    infoY += wrapped.length * 12;
  });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(titulo, pageWidth - margin, 52, { align: "right" });
  pdf.setFontSize(11);
  pdf.text(numero, pageWidth - margin, 72, { align: "right" });
}

function dibujarTotalesProforma(
  pdf,
  { margin, pageWidth, startY, subtotal, descuento, total },
) {
  const labelX = pageWidth - 190;
  const valueX = pageWidth - margin;
  const rows = [{ label: "Subtotal", value: monedaCRC(subtotal) }];
  if (descuento > 0) {
    rows.push({ label: "Descuento", value: `-${monedaCRC(descuento)}` });
  }

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.line(labelX - 10, startY - 12, valueX, startY - 12);
  pdf.setFontSize(10);
  rows.forEach((row, index) => {
    const y = startY + index * 20;
    pdf.setFont("helvetica", "bold");
    pdf.text(row.label, labelX, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(row.value, valueX, y, { align: "right" });
  });

  const totalY = startY + rows.length * 20;
  pdf.setLineWidth(0.8);
  pdf.line(labelX - 10, totalY - 13, valueX, totalY - 13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total", labelX, totalY);
  pdf.text(monedaCRC(total), valueX, totalY, { align: "right" });
  pdf.setLineWidth(1);
  pdf.line(labelX - 10, totalY + 8, valueX, totalY + 8);
  pdf.line(labelX - 10, totalY + 11, valueX, totalY + 11);
}

async function crearPdf(factura) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;
  const boxWidth = pageWidth / 2 - 70;
  const tienda = await tiendaService.get();
  dibujarEncabezado(pdf, {
    pageWidth,
    margin,
    titulo: "FACTURA",
    numero: `N.º ${String(factura.orden_id ?? 0).padStart(4, "0")}`,
    companyInfo: getTiendaLineasDocumento(tienda),
  });

  const billX = margin;
  const shipX = pageWidth / 2 + 12;
  let y = 230;

  y = dibujarCajasBillToShipTo(pdf, {
    billX,
    shipX,
    y,
    boxWidth,
    billToLines: obtenerLineasBillTo(factura),
    shipToLines: obtenerLineasShipTo(factura),
  });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Código", margin, y);
  pdf.text("Descripción", 120, y);
  pdf.text("Cantidad", 350, y);
  pdf.text("Precio unitario", 420, y);
  pdf.text("Total", 500, y);
  pdf.setDrawColor(180, 180, 180);
  pdf.line(margin, y + 4, pageWidth - margin, y + 4);

  pdf.setFont("helvetica", "normal");
  y += 18;
  const detalle = Array.isArray(factura.detalle) ? factura.detalle : [];
  const subtotal = detalle.reduce(
    (sum, item) => sum + Number(item.subtotal ?? 0),
    0,
  );
  const total = Number(factura.total ?? subtotal);
  const impuestos = Number(factura.impuestos ?? 0);
  const descuento =
    Number(factura.descuentos ?? 0) ||
    Math.max(0, subtotal + impuestos - total);

  detalle.forEach((item) => {
    if (y > pageHeight - 220) {
      pdf.addPage();
      y = 40;
    }

    const description = item.descripcion || item.producto_nombre || "Producto";
    const itemNo = String(item.codigo_producto || item.producto_id || "-");
    const quantity = Number(item.cantidad ?? 0);
    const unitPrice = Number(item.precio_unitario ?? item.precio ?? 0);
    const lineTotal = Number(item.subtotal ?? quantity * unitPrice);

    pdf.text(itemNo, margin, y);
    const descriptionLines = pdf.splitTextToSize(description, 210);
    descriptionLines.forEach((line, lineIndex) => {
      pdf.text(String(line), 120, y + lineIndex * 10);
    });
    pdf.text(String(quantity), 356, y);
    pdf.text(monedaCRC(unitPrice), 420, y);
    pdf.text(monedaCRC(lineTotal), 500, y);
    y += 18;
  });

  const startY = Math.min(y + 48, pageHeight - 200);
  const bottomY = dibujarPieYPago(pdf, {
    margin,
    pageWidth,
    startY,
    subtotal,
    descuento,
    total,
    metodoPago: factura.metodo_pago,
  });

  dibujarNotas(pdf, {
    margin,
    pageWidth,
    pageHeight,
    startY: bottomY + 34,
    notas: factura.notas,
  });

  return pdf;
}

async function crearProformaPdf(orden) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;
  const tienda = await tiendaService.get();
  dibujarEncabezado(pdf, {
    pageWidth,
    margin,
    titulo: "PROFORMA",
    numero: `Orden N.º ${String(orden?.id ?? 0).padStart(4, "0")}`,
    companyInfo: getTiendaLineasDocumento(tienda),
  });

  const boxWidth = pageWidth / 2 - 70;
  let y = dibujarCajasBillToShipTo(pdf, {
    billX: margin,
    shipX: pageWidth / 2 + 12,
    y: 230,
    boxWidth,
    billToLines: obtenerLineasBillTo({
      cliente_nombre: orden?.cliente_nombre,
      cliente_direccion: orden?.cliente_direccion,
    }),
    shipToLines: obtenerLineasShipTo({
      ship_to_direccion: orden?.ship_to_direccion || orden?.cliente_direccion,
      notas: orden?.notas,
    }),
  });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Código", margin, y);
  pdf.text("Descripción", 120, y);
  pdf.text("Cantidad", 350, y);
  pdf.text("Precio unitario", 420, y);
  pdf.text("Total", 500, y);
  pdf.setDrawColor(180, 180, 180);
  pdf.line(margin, y + 4, pageWidth - margin, y + 4);

  pdf.setFont("helvetica", "normal");
  y += 18;
  const detalle = Array.isArray(orden?.detalle) ? orden.detalle : [];
  const subtotal = detalle.reduce(
    (sum, item) => sum + Number(item.subtotal ?? 0),
    0,
  );
  const total = Number(orden?.total ?? subtotal);
  const descuento = Math.max(0, subtotal - total);

  detalle.forEach((item) => {
    if (y > pageHeight - 220) {
      pdf.addPage();
      y = 40;
    }

    const description = item.producto_nombre || item.descripcion || "Producto";
    const itemNo = String(
      item.producto_sku || item.sku || item.codigo_producto || "-",
    );
    const quantity = Number(item.cantidad ?? 0);
    const unitPrice = Number(item.precio_unitario ?? item.precio ?? 0);
    const lineTotal = Number(item.subtotal ?? quantity * unitPrice);

    pdf.text(itemNo, margin, y);
    const descriptionLines = pdf.splitTextToSize(description, 210);
    descriptionLines.forEach((line, lineIndex) => {
      pdf.text(String(line), 120, y + lineIndex * 10);
    });
    pdf.text(String(quantity), 356, y);
    pdf.text(monedaCRC(unitPrice), 420, y);
    pdf.text(monedaCRC(lineTotal), 500, y);
    y += 18;
  });

  const startY = Math.min(y + 48, pageHeight - 200);
  dibujarTotalesProforma(pdf, {
    margin,
    pageWidth,
    startY,
    subtotal,
    descuento,
    total,
  });

  return pdf;
}

export async function generarFacturaPdf(factura) {
  (await crearPdf(factura)).save(`${factura.numero_factura}.pdf`);
}

export async function generarProformaPdf(orden) {
  if (!orden) return;
  (await crearProformaPdf(orden)).save(
    `PROFORMA-${String(orden.id).padStart(4, "0")}.pdf`,
  );
}

export async function imprimirFactura(factura) {
  const ventana = window.open("about:blank", "_blank");
  if (!ventana) {
    throw new Error("El navegador bloqueó la ventana de impresión.");
  }

  try {
    const pdf = await crearPdf(factura);
    const blobUrl = pdf.output("bloburl");
    ventana.addEventListener("load", () => ventana.print(), { once: true });
    ventana.location.href = blobUrl;
  } catch (error) {
    ventana.close();
    throw error;
  }
}
