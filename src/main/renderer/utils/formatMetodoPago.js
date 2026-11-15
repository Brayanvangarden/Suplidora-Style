const METODOS_PAGO_LABELS = {
  efectivo: "Efectivo",
  cheque: "Cheque",
  datafono: "Datáfono",
  sinpe_movil: "Sinpe Móvil",
  sinpe: "Sinpe Móvil",
  zelle: "Sinpe Móvil",
  transferencia: "Transferencia",
  otro: "Otro",
};

export function formatMetodoPago(metodo) {
  return METODOS_PAGO_LABELS[metodo] ?? metodo ?? "—";
}
