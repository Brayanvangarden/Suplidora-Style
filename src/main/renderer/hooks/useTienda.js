import { useCallback, useEffect, useState } from "react";
import { tiendaService } from "../services/tienda.service";

export function useTienda() {
  const [tienda, setTienda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cargarTienda = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTienda(await tiendaService.get());
    } catch (loadError) {
      setError(loadError.message || "No se pudo cargar la información de la tienda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTienda();
  }, [cargarTienda]);

  const guardarTienda = async (data) => {
    setSaving(true);
    setError("");
    try {
      const actualizada = await tiendaService.update(data);
      setTienda(actualizada);
      return { ok: true, data: actualizada };
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar la información de la tienda.");
      return { ok: false, message: saveError.message };
    } finally {
      setSaving(false);
    }
  };

  return { tienda, loading, saving, error, cargarTienda, guardarTienda };
}
