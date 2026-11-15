function prepararVendedor(data) {
  const vendedorId = Number(data?.vendedor_id);
  if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
    throw new Error("Selecciona un vendedor antes de guardar la orden.");
  }
  return { ...data, vendedor_id: vendedorId };
}

function verificarVendedorGuardado(orden, vendedorId) {
  if (Number(orden?.vendedor_id) !== vendedorId) {
    throw new Error(
      "No se guardó el vendedor. Cierra y vuelve a abrir la aplicación para actualizar el proceso de órdenes.",
    );
  }
  return orden;
}

export const ordenesService = {
  /**
   * @param {Object} filtros - { cliente_id, estado, estado_pago, fecha_desde, fecha_hasta }
   */
  getAll: async (filtros = {}) => {
    const res = await window.api.ordenes.getAll(filtros);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  getById: async (id) => {
    const res = await window.api.ordenes.getById(id);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  /**
   * Crear orden con detalle
   * @param {{
   *   cliente_id: number,
   *   vendedor_id: number,
   *   usuario_id: number,
   *   detalle: Array<{ producto_id, cantidad, precio_unitario, subtotal }>,
   *   descuento_porcentaje?: number,
   *   descuento_orden_porcentaje?: number,
   *   ship_to_cliente_id?: number | null,
   *   fecha_entrega?: string | null,
   *   notas?: string
   * }} data
   */
  create: async (data) => {
    const payload = prepararVendedor(data);
    const res = await window.api.ordenes.create(payload);
    if (!res.ok) throw new Error(res.message);
    return verificarVendedorGuardado(res.data, payload.vendedor_id);
  },

  update: async (id, data) => {
    const payload = prepararVendedor(data);
    const res = await window.api.ordenes.update(id, payload);
    if (!res.ok) throw new Error(res.message);
    return verificarVendedorGuardado(res.data, payload.vendedor_id);
  },

  updateEstadoPago: async (id, estadoPago) => {
    const res = await window.api.ordenes.updateEstadoPago(id, estadoPago);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  getResumen: async () => {
    const res = await window.api.ordenes.resumen();
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },
};
