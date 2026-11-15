const { ipcMain } = require("electron");
const vendedoresRepo = require("../database/repositories/vendedores.repository");

function registerVendedoresIpc() {
  ipcMain.handle("vendedores:getResumen", async (_, { solicitanteId, vendedorId }) => {
    try {
      return {
        ok: true,
        data: vendedoresRepo.getResumen(solicitanteId, vendedorId),
      };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  ipcMain.handle("vendedores:getDetalle", async (_, { solicitanteId, vendedorId }) => {
    try {
      return {
        ok: true,
        data: vendedoresRepo.getDetalle(solicitanteId, vendedorId),
      };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  ipcMain.handle("vendedores:getPagos", async (_, { solicitanteId, vendedorId }) => {
    try {
      return {
        ok: true,
        data: vendedoresRepo.getPagos(solicitanteId, vendedorId),
      };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });

  ipcMain.handle("vendedores:registrarPago", async (_, data) => {
    try {
      return {
        ok: true,
        data: vendedoresRepo.registrarPago(data),
        message: "Pago de comisión registrado.",
      };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  });
}

module.exports = { registerVendedoresIpc };
