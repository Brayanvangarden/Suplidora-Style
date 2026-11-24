import { useCallback, useEffect, useState } from "react";
import { proveedoresService } from "../services/proveedores.service";

export function useProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try { setProveedores(await proveedoresService.getAll()); setError(""); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchProveedores(); }, [fetchProveedores]);
  const guardar = async (data) => {
    try {
      const proveedor = data.id ? await proveedoresService.update(data) : await proveedoresService.create(data);
      setProveedores((items) => data.id ? items.map((item) => item.id === proveedor.id ? proveedor : item) : [...items, proveedor]);
      return { ok: true, data: proveedor };
    } catch (err) { return { ok: false, message: err.message }; }
  };
  const toggleEstado = async (id, estado) => {
    try { const proveedor = await proveedoresService.toggleEstado(id, estado); setProveedores((items) => items.map((item) => item.id === id ? proveedor : item)); return { ok: true }; }
    catch (err) { return { ok: false, message: err.message }; }
  };
  return { proveedores, loading, error, fetchProveedores, guardar, toggleEstado };
}
