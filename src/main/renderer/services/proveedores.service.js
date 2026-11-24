export const proveedoresService = {
  getAll: async (options) => {
    const result = await window.api.proveedores.getAll(options);
    if (!result.ok) throw new Error(result.message);
    return result.data;
  },
  getById: async (id) => {
    const result = await window.api.proveedores.getById(id);
    if (!result.ok) throw new Error(result.message);
    return result.data;
  },
  create: async (data) => {
    const result = await window.api.proveedores.create(data);
    if (!result.ok) throw new Error(result.message);
    return result.data;
  },
  update: async (data) => {
    const result = await window.api.proveedores.update(data);
    if (!result.ok) throw new Error(result.message);
    return result.data;
  },
  toggleEstado: async (id, estado) => {
    const result = await window.api.proveedores.toggleEstado(id, estado);
    if (!result.ok) throw new Error(result.message);
    return result.data;
  },
};
