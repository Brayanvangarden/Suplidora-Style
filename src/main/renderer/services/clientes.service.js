const normalizeCliente = (cliente = {}) => ({
  ...cliente,
  empresa: cliente.empresa ?? "",
  nombre: cliente.nombre ?? "",
  tipo_cliente: cliente.tipo_cliente ?? "otro",
  tipo_identificacion: cliente.tipo_identificacion ?? "otro",
  numero_identificacion: cliente.numero_identificacion ?? "",
  telefono: cliente.telefono ?? "",
  telefono_secundario: cliente.telefono_secundario ?? "",
  correo: cliente.correo ?? "",
  correo_facturacion: cliente.correo_facturacion ?? "",
  persona_contacto: cliente.persona_contacto ?? "",
  direccion: cliente.direccion ?? "",
  provincia: cliente.provincia ?? "",
  canton: cliente.canton ?? "",
  distrito: cliente.distrito ?? "",
  barrio: cliente.barrio ?? "",
  codigo_postal: cliente.codigo_postal ?? "",
  actividad_economica: cliente.actividad_economica ?? "",
  codigo_actividad_economica: cliente.codigo_actividad_economica ?? "",
  requiere_factura_electronica: Boolean(cliente.requiere_factura_electronica),
  notas: cliente.notas ?? "",
  balance_pendiente: Number(cliente.balance_pendiente ?? 0),
  tiene_descuento: Boolean(cliente.tiene_descuento),
  descuento_porcentaje: Number(cliente.descuento_porcentaje ?? 0),
  estado: cliente.estado ?? "activo",
});

const normalizePayload = (data = {}) => ({
  ...data,
  empresa: data.empresa ?? "",
  nombre: data.nombre ?? "",
  tipo_cliente: data.tipo_cliente ?? "otro",
  tipo_identificacion: data.tipo_identificacion ?? "otro",
  numero_identificacion: data.numero_identificacion ?? "",
  telefono: data.telefono ?? "",
  telefono_secundario: data.telefono_secundario ?? "",
  correo: data.correo ?? "",
  correo_facturacion: data.correo_facturacion ?? "",
  persona_contacto: data.persona_contacto ?? "",
  direccion: data.direccion ?? "",
  provincia: data.provincia ?? "",
  canton: data.canton ?? "",
  distrito: data.distrito ?? "",
  barrio: data.barrio ?? "",
  codigo_postal: data.codigo_postal ?? "",
  actividad_economica: data.actividad_economica ?? "",
  codigo_actividad_economica: data.codigo_actividad_economica ?? "",
  requiere_factura_electronica: Boolean(data.requiere_factura_electronica),
  notas: data.notas ?? "",
  balance_pendiente: Number(data.balance_pendiente ?? 0),
  tiene_descuento: Boolean(data.tiene_descuento),
  descuento_porcentaje: Number(data.descuento_porcentaje ?? 0),
  estado: data.estado ?? "activo",
});
export const clientesService = {
  importBulk: async (filas) => {
    const res = await window.api.clientes.importBulk(filas);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  getAll: async (includeInactive = false) => {
    const res = await window.api.clientes.getAll(includeInactive);
    if (!res.ok) throw new Error(res.message);
    return (res.data ?? []).map(normalizeCliente);
  },

  getById: async (id) => {
    const res = await window.api.clientes.getById(id);
    if (!res.ok) {
      if (res.message === "Cliente no encontrado") return null;
      throw new Error(res.message);
    }
    return normalizeCliente(res.data);
  },

  create: async (data) => {
    const payload = normalizePayload(data);
    const res = await window.api.clientes.create(payload);
    if (!res.ok) throw new Error(res.message);
    return normalizeCliente(res.data);
  },

  update: async (data) => {
    const payload = normalizePayload(data);
    const res = await window.api.clientes.update(payload);
    if (!res.ok) throw new Error(res.message);
    return normalizeCliente(res.data);
  },

  getPrecioEspecial: async (cliente_id, producto_id) => {
    const payload =
      typeof cliente_id === "object" && cliente_id !== null
        ? cliente_id
        : { cliente_id, producto_id };

    if (payload.cliente_id == null || payload.producto_id == null) {
      return null;
    }

    const res = await window.api.clientes.getPrecioEspecial(payload);
    if (!res.ok) throw new Error(res.message);
    return res.data?.precio_unitario ?? null;
  },

  getPreciosEspeciales: async () => {
    const res = await window.api.clientes.getPreciosEspeciales();
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  getPreciosEspecialesByCliente: async (cliente_id) => {
    const res =
      await window.api.clientes.getPreciosEspecialesByCliente(cliente_id);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  createPrecioEspecial: async (data) => {
    const res = await window.api.clientes.createPrecioEspecial(data);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  updatePrecioEspecial: async (data) => {
    const res = await window.api.clientes.updatePrecioEspecial(data);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  deletePrecioEspecial: async (id) => {
    const res = await window.api.clientes.deletePrecioEspecial(id);
    if (!res.ok) throw new Error(res.message);
    return res;
  },

  delete: async (id) => {
    const res = await window.api.clientes.delete(id);
    if (!res.ok) throw new Error(res.message);
    return {
      ...res,
      data: res.data ? normalizeCliente(res.data) : null,
    };
  },

  updateBalance: async (id, monto) => {
    const res = await window.api.clientes.updateBalance(id, monto);
    if (!res.ok) throw new Error(res.message);
    return res;
  },
};
