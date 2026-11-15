export const vendedoresService = {
  getResumen: async (solicitanteId, vendedorId = null) => {
    const res = await window.api.vendedores.getResumen({
      solicitanteId,
      vendedorId,
    });
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  getDetalle: async (solicitanteId, vendedorId) => {
    const res = await window.api.vendedores.getDetalle({
      solicitanteId,
      vendedorId,
    });
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  getPagos: async (solicitanteId, vendedorId) => {
    const res = await window.api.vendedores.getPagos({
      solicitanteId,
      vendedorId,
    });
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },

  registrarPago: async (data) => {
    const res = await window.api.vendedores.registrarPago(data);
    if (!res.ok) throw new Error(res.message);
    return res.data;
  },
};
