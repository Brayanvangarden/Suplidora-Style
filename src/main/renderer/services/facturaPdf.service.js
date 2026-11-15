import { jsPDF } from "jspdf";
import { formatDate } from "../utils/formatDate";

export const COMPANY_LOGO_URL = new URL(
  "../../../../assets/beyou-logo.svg",
  import.meta.url,
).href;

let companyLogoPromise;

function getCompanyLogo() {
  if (!companyLogoPromise) {
    companyLogoPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No se pudo preparar el logo de la empresa."));
          return;
        }
        context.drawImage(image, 0, 0);
        resolve({
          data: canvas.toDataURL("image/png"),
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = () =>
        reject(new Error("No se pudo cargar el logo de la empresa."));
      image.src = COMPANY_LOGO_URL;
    });
  }
  return companyLogoPromise;
}

function formatOrdenNumero(id) {
  return `N.º ${String(Number(id ?? 0)).padStart(4, "0")}`;
}

function obtenerLineasShipTo(documento) {
  const direccion = documento?.ship_to_direccion || documento?.notas;
  return String(direccion || "Address not provided")
    .split(/\r?\n/)
    .filter((line) => line.trim());
}

function obtenerLineasBillTo(documento) {
  const lineas = [documento?.cliente_nombre, documento?.cliente_direccion]
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  return lineas.length ? lineas : ["Address not provided"];
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
  pdf.text("Bill to:", billX + 10, y + 18);
  pdf.text("Ship to:", shipX + 10, y + 18);

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
 * Dibuja el bloque de "Payment method" (izquierda) y la caja de totales
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
    impuestosLabel = "Included",
  },
) {
  const totalsLabelX = pageWidth - 170;
  const totalsValueX = pageWidth - margin;
  const dividerX = totalsLabelX + 65;
  const rowHeight = 20;
  const lineTop = startY - 16;

  const rows = [{ label: "Subtotal", value: monedaCRC(subtotal) }];
  if (descuento > 0) {
    rows.push({ label: "Discount", value: `-${monedaCRC(descuento)}` });
  }
  rows.push(
    { label: "Shipping", value: monedaCRC(0) },
    { label: "Tax", value: impuestosLabel },
    { label: "Deposit", value: monedaCRC(0) },
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

  // Bloque "Payment method" (columna izquierda)
  pdf.setFontSize(9.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("Payment method", margin, startY + 4);
  pdf.setFont("helvetica", "normal");
  pdf.text("Checks may be sent ACH to:", margin, startY + 20);
  pdf.setFont("helvetica", "bold");
  pdf.text("NATUR VITALIA LLC", margin, startY + 36);
  pdf.setFont("helvetica", "normal");
  pdf.text("Wells Fargo Bank", margin, startY + 52);
  pdf.text("Account #2813330806", margin, startY + 68);
  pdf.text("For direct deposit routing #063107513", margin, startY + 84);
  pdf.text("For wire transfer routing #121000248", margin, startY + 100);
  pdf.text(
    `${monedaCRC(35)} Applies to all the checks returned for any reason`,
    margin,
    startY + 116,
  );

  const paymentBottom = startY + 116 + 14;
  return Math.max(totalY + 12, paymentBottom);
}

function dibujarNotas(pdf, { margin, pageWidth, pageHeight, startY }) {
  const noteParagraphs = [
    [
      `1) Any payments to Natur Vitalia LLC greater or equal to ${monedaCRC(5000)} will need to be made in`,
      "the form of a wire or credit card (CC 3% processing fee will be charged for any amount)",
      "to facilitate a commencement of the order.",
    ],
    [
      "2) Any payments via check (regardless of size) may delay commencement of the order",
      "and/or delivery by up to 10 days from the date Natur Vitalia LLC receives the check.",
    ],
    [
      "3) Payments must be done within 30 days after the order has been delivered.",
    ],
  ];

  // Si no cabe en la página actual, agrega una nueva
  const alturaEstimada =
    14 + noteParagraphs.reduce((acc, p) => acc + p.length * 12 + 24, 0);
  let y = startY;
  if (y + alturaEstimada > pageHeight - 30) {
    pdf.addPage();
    y = 60;
  }

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("*NOTE:", margin, y);
  const noteLabelWidth = pdf.getTextWidth("*NOTE:");
  pdf.setFont("helvetica", "normal");
  pdf.text(" All orders must be paid as follows:", margin + noteLabelWidth, y);

  let noteCursor = y + 14;
  noteParagraphs.forEach((paragraph, paragraphIndex) => {
    paragraph.forEach((line) => {
      pdf.text(String(line), margin, noteCursor);
      noteCursor += 12;
    });
    if (paragraphIndex < noteParagraphs.length - 1) {
      noteCursor += 6;
    }
  });
}

async function dibujarEncabezado(
  pdf,
  {
    pageWidth,
    margin,
    titulo,
    numero,
    layout = "horizontal",
    companyInfo = [
      "NATUR VITALIA LLC",
      "7980 W 25th Ct. Hialeah, FL 33016",
      "Tel. (754) 209-3195 / (954) 889-4019",
    ],
  },
) {
  const logo = await getCompanyLogo();
  const stacked = layout === "stacked";
  const maxLogoWidth = stacked ? 192 : 96;
  const maxLogoHeight = stacked ? 128 : 64;
  const logoScale = Math.min(
    maxLogoWidth / logo.width,
    maxLogoHeight / logo.height,
  );
  const logoWidth = logo.width * logoScale;
  const logoHeight = logo.height * logoScale;
  const logoX = margin;
  const logoY = stacked
    ? 24 + (maxLogoHeight - logoHeight) / 2
    : 32 + (64 - logoHeight) / 2;

  pdf.addImage(
    logo.data,
    "PNG",
    logoX,
    logoY,
    logoWidth,
    logoHeight,
  );

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  if (stacked) {
    const companyX = margin;
    companyInfo.forEach((line, index) => {
      pdf.text(line, companyX, 24 + maxLogoHeight + 18 + index * 14);
    });
  } else {
    const companyX = margin + maxLogoWidth + 12;
    companyInfo.forEach((line, index) => {
      pdf.text(line, companyX, 48 + index * 14);
    });
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(titulo, pageWidth - 150, 52);
  pdf.setFontSize(11);
  pdf.text(numero, pageWidth - 150, 72);
}

function dibujarDatosOrden(pdf, { orden, margin, pageWidth, startY }) {
  const labelX = margin;
  const valueX = margin + 52;
  const contentWidth = pageWidth - valueX - margin;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("Cliente:", labelX, startY);
  pdf.setFont("helvetica", "normal");
  const clienteLines = pdf.splitTextToSize(
    orden?.cliente_nombre || "Sin cliente",
    contentWidth,
  );
  pdf.text(clienteLines, valueX, startY);

  let y = startY + Math.max(18, clienteLines.length * 12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Fecha de emisión:", labelX, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(formatDate(orden?.fecha_creacion), valueX + 52, y);
  if (orden?.fecha_entrega) {
    const entregaX = pageWidth / 2 + 20;
    pdf.setFont("helvetica", "bold");
    pdf.text("Fecha de entrega:", entregaX, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(formatDate(orden.fecha_entrega), entregaX + 92, y);
  }
  y += 18;

  if (orden?.notas) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Notas:", labelX, y);
    pdf.setFont("helvetica", "normal");
    const notas = pdf.splitTextToSize(String(orden.notas), contentWidth);
    pdf.text(notas, valueX, y);
    y += notas.length * 12;
  }

  return y + 10;
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
  await dibujarEncabezado(pdf, {
    pageWidth,
    margin,
    titulo: "INVOICE",
    numero: `No. ${String(factura.orden_id ?? 0).padStart(4, "0")}`,
    layout: "stacked",
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
  pdf.text("Item No.", margin, y);
  pdf.text("Description", 120, y);
  pdf.text("Quantity", 350, y);
  pdf.text("Unit Price", 420, y);
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

    const description = item.descripcion || item.producto_nombre || "Product";
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
  });

  dibujarNotas(pdf, { margin, pageWidth, pageHeight, startY: bottomY + 34 });

  return pdf;
}

async function crearProformaPdf(orden) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;
  await dibujarEncabezado(pdf, {
    pageWidth,
    margin,
    titulo: "PROFORMA",
    numero: `Orden N.º ${String(orden?.id ?? 0).padStart(4, "0")}`,
    layout: "stacked",
    companyInfo: ["Suplidora y academia de belleza Style"],
  });

  let y = dibujarDatosOrden(pdf, {
    orden,
    margin,
    pageWidth,
    startY: 226,
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
