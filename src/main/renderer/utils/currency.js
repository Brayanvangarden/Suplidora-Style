export const formatCRC = (monto) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(Number(monto ?? 0));

export const parseCRC = (str) =>
  parseFloat(String(str).replace(/[^0-9.-]+/g, "")) || 0;
