const { ipcMain } = require("electron");
const repo = require("../database/repositories/proveedores.repository");
const { validarProveedor } = require("../shared/validators/proveedor.validator");

function registerProveedoresIpc() {
  ipcMain.handle("proveedores:getAll", async (_, options = {}) => {
    try { return { ok: true, data: repo.getAll(options.includeInactive !== false) }; }
    catch (error) { return { ok: false, message: error.message }; }
  });
  ipcMain.handle("proveedores:getById", async (_, id) => {
    try { const data = repo.getById(id); return data ? { ok: true, data } : { ok: false, message: "Proveedor no encontrado" }; }
    catch (error) { return { ok: false, message: error.message }; }
  });
  ipcMain.handle("proveedores:create", async (_, payload) => {
    try { const valid = validarProveedor(payload); if (!valid.ok) return valid; return { ok: true, data: repo.create(valid.data), message: "Proveedor creado correctamente" }; }
    catch (error) { return { ok: false, message: error.message }; }
  });
  ipcMain.handle("proveedores:update", async (_, { id, ...payload }) => {
    try { if (!repo.getById(id)) return { ok: false, message: "Proveedor no encontrado" }; const valid = validarProveedor(payload); if (!valid.ok) return valid; return { ok: true, data: repo.update(id, valid.data), message: "Proveedor actualizado correctamente" }; }
    catch (error) { return { ok: false, message: error.message }; }
  });
  ipcMain.handle("proveedores:toggleEstado", async (_, { id, estado }) => {
    try { if (!["activo", "inactivo"].includes(estado)) return { ok: false, message: "Estado no permitido" }; const data = repo.toggleEstado(id, estado); return data ? { ok: true, data } : { ok: false, message: "Proveedor no encontrado" }; }
    catch (error) { return { ok: false, message: error.message }; }
  });
}

module.exports = { registerProveedoresIpc };
