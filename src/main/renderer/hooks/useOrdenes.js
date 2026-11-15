import { useState, useEffect, useCallback, useRef } from "react";
import { ordenesService } from "../services/ordenes.service";

export function useOrdenes(filtrosIniciales = {}) {
  const [ordenes, setOrdenes] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ordenesVersion = useRef(0);

  // ── Cargar con filtros ──────────────────────────────
  const fetchOrdenes = useCallback(async (filtros = filtrosIniciales) => {
    const versionSolicitada = ordenesVersion.current;
    setLoading(true);
    setError(null);
    try {
      const data = await ordenesService.getAll(filtros);
      if (versionSolicitada === ordenesVersion.current) {
        setOrdenes(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Resumen general ─────────────────────────────────
  const fetchResumen = useCallback(async () => {
    try {
      const data = await ordenesService.getResumen();
      setResumen(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // ── Crear orden ─────────────────────────────────────
  const crearOrden = useCallback(async (data) => {
    try {
      const nueva = await ordenesService.create(data);
      ordenesVersion.current += 1;
      setOrdenes((prev) => [nueva, ...prev]);
      return { ok: true, data: nueva };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }, []);

  // ── Cambiar estado de pago ──────────────────────────
  const actualizarOrden = useCallback(async (id, data) => {
    try {
      const actualizada = await ordenesService.update(id, data);
      ordenesVersion.current += 1;
      setOrdenes((prev) => prev.map((o) => (o.id === id ? actualizada : o)));
      return { ok: true, data: actualizada };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }, []);

  const cambiarEstadoPago = useCallback(async (id, estadoPago) => {
    try {
      const actualizada = await ordenesService.updateEstadoPago(id, estadoPago);
      setOrdenes((prev) => prev.map((o) => (o.id === id ? actualizada : o)));
      return { ok: true, data: actualizada };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }, []);

  useEffect(() => {
    fetchOrdenes();
    fetchResumen();
  }, [fetchOrdenes, fetchResumen]);

  // ── Filtros locales ─────────────────────────────────
  const ordenesPendientes = ordenes.filter((o) => o.estado === "pendiente");
  const ordenesPorCobrar = ordenes.filter((o) => o.estado_pago === "pendiente");
  const ordenesProcesadas = ordenes.filter((o) => o.estado === "procesada");

  return {
    ordenes,
    ordenesPendientes,
    ordenesPorCobrar,
    ordenesProcesadas,
    resumen,
    loading,
    error,
    fetchOrdenes,
    fetchResumen,
    crearOrden,
    actualizarOrden,
    cambiarEstadoPago,
  };
}
