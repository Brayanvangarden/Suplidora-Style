import { useClientes } from "../hooks/useClientes";
import { clientesService } from "../services/clientes.service";
import { useState, useEffect, useRef } from "react";
import CrudFormFrame from "../components/CrudFormFrame";
import { formatCRC } from "../utils/currency";

function PencilIcon(props) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .622.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function EyeIcon(props) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function TrashIcon(props) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
function UploadIcon(props) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function DownloadIcon(props) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
const EMPTY_FORM = {
  nombre: "",
  empresa: "",
  tipo_cliente: "otro",
  tipo_identificacion: "otro",
  numero_identificacion: "",
  telefono: "",
  telefono_secundario: "",
  correo: "",
  correo_facturacion: "",
  persona_contacto: "",
  direccion: "",
  provincia: "",
  canton: "",
  distrito: "",
  barrio: "",
  codigo_postal: "",
  actividad_economica: "",
  codigo_actividad_economica: "",
  requiere_factura_electronica: false,
  notas: "",
  tiene_descuento: false,
  descuento_porcentaje: 0,
  estado: "activo",
};

const bloquearTeclasNoNumericas = (event) => {
  if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
};

const aceptarPorcentaje = (value) =>
  /^\d*(\.\d*)?$/.test(value) ? value : null;

const CLIENTES_POR_PAGINA = 10;

function Clientes() {
  const {
    clientes,
    loading,
    error,
    fetchClientes,
    crearCliente,
    actualizarCliente,
    eliminarCliente,
    buscarClientes,
  } = useClientes();

  const [tab, setTab] = useState("lista");
  const [form, setForm] = useState(EMPTY_FORM);
  const [clienteEdit, setClienteEdit] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [loadingOp, setLoadingOp] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [clienteToDelete, setClienteToDelete] = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [filtroDescuento, setFiltroDescuento] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const clientesFiltrados = buscarClientes(busqueda).filter((c) => {
    if (filtroDescuento === "con") return c.tiene_descuento;
    if (filtroDescuento === "sin") return !c.tiene_descuento;
    return true;
  });
  const totalPaginas = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const clientesVisibles = clientesFiltrados.slice(
    (paginaActual - 1) * CLIENTES_POR_PAGINA,
    paginaActual * CLIENTES_POR_PAGINA,
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroDescuento]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);
  const abrirNuevo = () => {
    setClienteEdit(null);
    setForm(EMPTY_FORM);
    setMensaje("");
    setTab("nuevo");
  };

  const abrirEditar = (cliente) => {
    setClienteEdit(cliente);
    setForm({
      nombre: cliente.nombre || "",
      empresa: cliente.empresa || "",
      tipo_cliente: cliente.tipo_cliente || "otro",
      tipo_identificacion: cliente.tipo_identificacion || "otro",
      numero_identificacion: cliente.numero_identificacion || "",
      telefono: cliente.telefono || "",
      telefono_secundario: cliente.telefono_secundario || "",
      correo: cliente.correo || "",
      correo_facturacion: cliente.correo_facturacion || "",
      persona_contacto: cliente.persona_contacto || "",
      direccion: cliente.direccion || "",
      provincia: cliente.provincia || "",
      canton: cliente.canton || "",
      distrito: cliente.distrito || "",
      barrio: cliente.barrio || "",
      codigo_postal: cliente.codigo_postal || "",
      actividad_economica: cliente.actividad_economica || "",
      codigo_actividad_economica: cliente.codigo_actividad_economica || "",
      requiere_factura_electronica: Boolean(
        cliente.requiere_factura_electronica,
      ),
      notas: cliente.notas || "",
      tiene_descuento: cliente.tiene_descuento || false,
      descuento_porcentaje: cliente.descuento_porcentaje ?? 0,
      estado: cliente.estado || "activo",
    });
    setMensaje("");
    setTab("editar");
  };

  const cerrarFormulario = () => {
    setClienteEdit(null);
    setForm(EMPTY_FORM);
    setTab("lista");
  };

  // Autolimpia el mensaje de éxito/error después de unos segundos
  useEffect(() => {
    if (!mensaje) return;
    const timer = setTimeout(() => setMensaje(""), 3000);
    return () => clearTimeout(timer);
  }, [mensaje]);
  const handleCrear = async (event) => {
    event.preventDefault();
    setMensaje("");

    const porcentaje = Number(form.descuento_porcentaje);
    if (
      form.tiene_descuento &&
      (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100)
    ) {
      setMensaje("El porcentaje de descuento debe estar entre 0 y 100.");
      return;
    }

    setLoadingOp(true);
    try {
      const resultado = await crearCliente(form);
      if (!resultado.ok) {
        setMensaje(resultado.message || "No se pudo crear el cliente.");
        return;
      }
      setMensaje("Cliente creado correctamente.");
      cerrarFormulario();
    } finally {
      setLoadingOp(false);
    }
  };

  const handleActualizar = async (event) => {
    event.preventDefault();
    setMensaje("");

    const porcentaje = Number(form.descuento_porcentaje);
    if (
      form.tiene_descuento &&
      (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100)
    ) {
      setMensaje("El porcentaje de descuento debe estar entre 0 y 100.");
      return;
    }

    setLoadingOp(true);
    try {
      const resultado = await actualizarCliente({
        id: clienteEdit.id,
        ...form,
      });
      if (!resultado.ok) {
        setMensaje(resultado.message || "No se pudo actualizar el cliente.");
        return;
      }
      setMensaje("Cliente actualizado correctamente.");
      cerrarFormulario();
    } finally {
      setLoadingOp(false);
    }
  };

  const handleEliminar = async () => {
    if (!clienteToDelete) return;

    const resultado = await eliminarCliente(clienteToDelete.id);
    if (!resultado.ok) {
      setMensaje(resultado.message || "No se pudo eliminar el cliente.");
      setClienteToDelete(null);
      return;
    }

    setMensaje("Cliente eliminado correctamente.");
    setClienteToDelete(null);
  };

  const exportarCSV = () => {
    const columnas = [
      "Nombre",
      "Empresa",
      "Teléfono",
      "Correo",
      "Dirección",
      "Balance pendiente",
      "Tiene descuento",
      "Descuento porcentaje",
      "Estado",
      "Notas",
      "Tipo de cliente",
      "Tipo de identificación",
      "Número de identificación",
      "Teléfono secundario",
      "Correo para comprobantes",
      "Persona de contacto",
      "Provincia",
      "Cantón",
      "Distrito",
      "Barrio",
      "Código postal",
      "Actividad económica",
      "Código de actividad económica",
      "Requiere factura electrónica",
    ];

    const escapar = (valor) => {
      const texto = String(valor ?? "");
      if (/[";\n]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`;
      }
      return texto;
    };

    const filas = clientesFiltrados.map((c) =>
      [
        c.nombre,
        c.empresa,
        c.telefono,
        c.correo,
        c.direccion,
        c.balance_pendiente,
        c.tiene_descuento ? "true" : "false",
        c.descuento_porcentaje,
        c.estado,
        c.notas,
        c.tipo_cliente,
        c.tipo_identificacion,
        c.numero_identificacion,
        c.telefono_secundario,
        c.correo_facturacion,
        c.persona_contacto,
        c.provincia,
        c.canton,
        c.distrito,
        c.barrio,
        c.codigo_postal,
        c.actividad_economica,
        c.codigo_actividad_economica,
        c.requiere_factura_electronica ? "true" : "false",
      ]
        .map(escapar)
        .join(";"),
    );

    const contenido = "\uFEFF" + [columnas.join(";"), ...filas].join("\r\n");

    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);

    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes_${fecha}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const inputImportRef = useRef(null);

  const parsearCSV = (texto) => {
    const limpio = texto.replace(/^\uFEFF/, "");
    const lineas = limpio.split(/\r\n|\n/).filter((l) => l.trim() !== "");
    if (lineas.length < 2) return [];

    const parsearLinea = (linea) => {
      const campos = [];
      let actual = "";
      let entreComillas = false;
      for (let i = 0; i < linea.length; i++) {
        const char = linea[i];
        if (char === '"') {
          if (entreComillas && linea[i + 1] === '"') {
            actual += '"';
            i++;
          } else {
            entreComillas = !entreComillas;
          }
        } else if (char === ";" && !entreComillas) {
          campos.push(actual);
          actual = "";
        } else {
          actual += char;
        }
      }
      campos.push(actual);
      return campos;
    };

    const filas = lineas.slice(1).map((linea) => {
      const [
        nombre,
        empresa,
        telefono,
        correo,
        direccion,
        balance_pendiente,
        tiene_descuento,
        descuento_porcentaje,
        estado,
        notas,
        tipo_cliente,
        tipo_identificacion,
        numero_identificacion,
        telefono_secundario,
        correo_facturacion,
        persona_contacto,
        provincia,
        canton,
        distrito,
        barrio,
        codigo_postal,
        actividad_economica,
        codigo_actividad_economica,
        requiere_factura_electronica,
      ] = parsearLinea(linea);
      return {
        nombre,
        empresa,
        telefono,
        correo,
        direccion,
        balance_pendiente,
        tiene_descuento,
        descuento_porcentaje,
        estado,
        notas,
        tipo_cliente,
        tipo_identificacion,
        numero_identificacion,
        telefono_secundario,
        correo_facturacion,
        persona_contacto,
        provincia,
        canton,
        distrito,
        barrio,
        codigo_postal,
        actividad_economica,
        codigo_actividad_economica,
        requiere_factura_electronica,
      };
    });

    return filas;
  };

  const handleImportarCSV = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    setLoadingOp(true);
    setMensaje("");
    try {
      const texto = await archivo.text();
      const filas = parsearCSV(texto);

      if (filas.length === 0) {
        setMensaje("El archivo no tiene datos para importar.");
        return;
      }

      const resultado = await clientesService.importBulk(filas);
      setMensaje(`Importación completa: ${resultado.creados} creados.`);
      if (resultado.errores.length) console.warn(resultado.errores);

      await fetchClientes();
    } catch (err) {
      setMensaje(err.message || "No se pudo importar el archivo.");
    } finally {
      setLoadingOp(false);
      event.target.value = "";
    }
  };

  const renderFormulario = (onSubmit) => (
    <form onSubmit={onSubmit} className="modal-form">
      <div className="customer-form-sections">
        <details className="customer-form-section" open>
          <summary>1. Información general</summary>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cliente-tipo">Tipo de cliente</label>
              <select
                id="cliente-tipo"
                value={form.tipo_cliente}
                onChange={(e) =>
                  setForm({ ...form, tipo_cliente: e.target.value })
                }
              >
                <option value="persona_fisica">Persona física</option>
                <option value="persona_juridica">Persona jurídica</option>
                <option value="extranjero">Extranjero</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="cliente-identificacion-tipo">
                Tipo de identificación
              </label>
              <select
                id="cliente-identificacion-tipo"
                value={form.tipo_identificacion}
                onChange={(e) =>
                  setForm({ ...form, tipo_identificacion: e.target.value })
                }
              >
                <option value="cedula_fisica">Cédula física</option>
                <option value="cedula_juridica">Cédula jurídica</option>
                <option value="dimex">DIMEX</option>
                <option value="nite">NITE</option>
                <option value="otro">Otro tipo de identificación</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="cliente-identificacion-numero">
                Número de identificación
              </label>
              <input
                id="cliente-identificacion-numero"
                type="text"
                value={form.numero_identificacion}
                onChange={(e) =>
                  setForm({ ...form, numero_identificacion: e.target.value })
                }
                placeholder="Opcional"
                maxLength={40}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-nombre">
                {form.tipo_cliente === "persona_fisica"
                  ? "Nombre completo *"
                  : form.tipo_cliente === "persona_juridica"
                    ? "Razón social *"
                    : "Nombre o razón social *"}
              </label>
              <input
                id="cliente-nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo o razón social"
                maxLength={200}
                required
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="cliente-comercial">
                Nombre comercial (opcional)
              </label>
              <input
                id="cliente-comercial"
                type="text"
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                placeholder="Nombre comercial o empresa"
                maxLength={200}
              />
            </div>
          </div>
        </details>

        <details className="customer-form-section">
          <summary>2. Contacto</summary>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cliente-telefono">Teléfono principal</label>
              <input
                id="cliente-telefono"
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="Ej.: 8888-8888"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-telefono-secundario">
                Teléfono secundario
              </label>
              <input
                id="cliente-telefono-secundario"
                type="tel"
                value={form.telefono_secundario}
                onChange={(e) =>
                  setForm({ ...form, telefono_secundario: e.target.value })
                }
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-correo">Correo general</label>
              <input
                id="cliente-correo"
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                placeholder="correo@ejemplo.com"
                maxLength={254}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-persona-contacto">
                Persona de contacto
              </label>
              <input
                id="cliente-persona-contacto"
                type="text"
                value={form.persona_contacto}
                onChange={(e) =>
                  setForm({ ...form, persona_contacto: e.target.value })
                }
                placeholder="Nombre de contacto"
                maxLength={200}
              />
            </div>
          </div>
        </details>

        <details className="customer-form-section">
          <summary>3. Dirección</summary>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cliente-provincia">Provincia</label>
              <input
                id="cliente-provincia"
                type="text"
                value={form.provincia}
                onChange={(e) => setForm({ ...form, provincia: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-canton">Cantón</label>
              <input
                id="cliente-canton"
                type="text"
                value={form.canton}
                onChange={(e) => setForm({ ...form, canton: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-distrito">Distrito</label>
              <input
                id="cliente-distrito"
                type="text"
                value={form.distrito}
                onChange={(e) => setForm({ ...form, distrito: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-barrio">Barrio</label>
              <input
                id="cliente-barrio"
                type="text"
                value={form.barrio}
                onChange={(e) => setForm({ ...form, barrio: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-codigo-postal">Código postal</label>
              <input
                id="cliente-codigo-postal"
                type="text"
                value={form.codigo_postal}
                onChange={(e) =>
                  setForm({ ...form, codigo_postal: e.target.value })
                }
                maxLength={20}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="cliente-direccion">
                Otras señas / dirección actual
              </label>
              <textarea
                id="cliente-direccion"
                rows={2}
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Se conserva el campo de dirección existente"
                maxLength={500}
              />
            </div>
          </div>
        </details>

        <details className="customer-form-section">
          <summary>4. Información tributaria</summary>
          <div className="form-grid">
            <div className="form-group full-width">
              <label
                className="checkbox-inline"
                htmlFor="requiere-factura-electronica"
              >
                <input
                  id="requiere-factura-electronica"
                  type="checkbox"
                  checked={form.requiere_factura_electronica}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiere_factura_electronica: e.target.checked,
                    })
                  }
                />
                <span>El cliente solicita comprobantes electrónicos</span>
              </label>
            </div>
            <div className="form-group">
              <label htmlFor="cliente-correo-facturacion">
                Correo para comprobantes electrónicos
              </label>
              <input
                id="cliente-correo-facturacion"
                type="email"
                value={form.correo_facturacion}
                onChange={(e) =>
                  setForm({ ...form, correo_facturacion: e.target.value })
                }
                placeholder="facturacion@ejemplo.com"
                maxLength={254}
              />
            </div>
            <div className="form-group">
              <label htmlFor="cliente-codigo-actividad">
                Código de actividad económica
              </label>
              <input
                id="cliente-codigo-actividad"
                type="text"
                value={form.codigo_actividad_economica}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codigo_actividad_economica: e.target.value,
                  })
                }
                maxLength={40}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="cliente-actividad">Actividad económica</label>
              <input
                id="cliente-actividad"
                type="text"
                value={form.actividad_economica}
                onChange={(e) =>
                  setForm({ ...form, actividad_economica: e.target.value })
                }
                maxLength={250}
              />
            </div>
            <p className="customer-form-note full-width">
              Datos opcionales para preparar el registro; no se validan contra
              catálogos ni reglas de Hacienda.
            </p>
          </div>
        </details>

        <details className="customer-form-section">
          <summary>5. Información comercial</summary>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cliente-estado">Estado del cliente</label>
              <select
                id="cliente-estado"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="form-group customer-balance">
              <span className="detail-label">Balance pendiente</span>
              <strong>
                {formatCRC(clienteEdit?.balance_pendiente ?? 0)}
              </strong>
            </div>
            <div className="form-group full-width">
              <label className="checkbox-inline" htmlFor="tiene_descuento">
                <input
                  id="tiene_descuento"
                  type="checkbox"
                  checked={form.tiene_descuento}
                  onChange={(e) =>
                    setForm({ ...form, tiene_descuento: e.target.checked })
                  }
                />
                <span>Aplica descuento</span>
              </label>
            </div>
            {form.tiene_descuento && (
              <div className="form-group">
                <label htmlFor="cliente-descuento">
                  Porcentaje de descuento (%)
                </label>
                <input
                  id="cliente-descuento"
                  type="text"
                  inputMode="decimal"
                  value={form.descuento_porcentaje}
                  required
                  onKeyDown={bloquearTeclasNoNumericas}
                  onChange={(e) => {
                    const value = aceptarPorcentaje(e.target.value);
                    if (value !== null) {
                      setForm({ ...form, descuento_porcentaje: value });
                    }
                  }}
                  placeholder="Ej.: 5"
                />
              </div>
            )}
          </div>
        </details>

        <details className="customer-form-section">
          <summary>6. Notas</summary>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="cliente-notas">Notas internas</label>
              <textarea
                id="cliente-notas"
                rows={3}
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Observaciones o información comercial adicional"
                maxLength={2000}
              />
            </div>
          </div>
        </details>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={cerrarFormulario}
        >
          ✖ Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={loadingOp}>
          {loadingOp
            ? "Guardando..."
            : tab === "editar"
              ? "✏️ Actualizar cliente"
              : "✅ Registrar cliente"}
        </button>
      </div>

      {mensaje && ["nuevo", "editar"].includes(tab) && (
        <p className="message-success">{mensaje}</p>
      )}
    </form>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Gestión de Clientes</h1>
        <div className="header-actions">
          {tab === "lista" && (
            <>
              <input
                ref={inputImportRef}
                type="file"
                accept=".csv"
                onChange={handleImportarCSV}
                style={{ display: "none" }}
              />
              <button
                className="btn-secondary"
                onClick={() => inputImportRef.current?.click()}
              >
                <UploadIcon /> Importar CSV
              </button>
              <button className="btn-secondary" onClick={exportarCSV}>
                <DownloadIcon /> Exportar CSV
              </button>
              <button className="btn-primary" onClick={abrirNuevo}>
                ➕ Nuevo Cliente
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="message-error">{error}</p>}

      {mensaje && !["nuevo", "editar"].includes(tab) && (
        <div className="message-success-banner">✅ {mensaje}</div>
      )}

      {tab === "lista" && (
        <div className="list-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar por nombre, identificación o contacto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="search-bar-clear"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="filtros">
            <button
              type="button"
              className={`btn-filtro ${filtroDescuento === "todos" ? "active" : ""}`}
              onClick={() => setFiltroDescuento("todos")}
            >
              Todos
            </button>
            <button
              type="button"
              className={`btn-filtro ${filtroDescuento === "con" ? "active" : ""}`}
              onClick={() => setFiltroDescuento("con")}
            >
              Con descuento
            </button>
            <button
              type="button"
              className={`btn-filtro ${filtroDescuento === "sin" ? "active" : ""}`}
              onClick={() => setFiltroDescuento("sin")}
            >
              Sin descuento
            </button>
          </div>
          {clientesFiltrados.length === 0 ? (
            <p className="empty-state">
              No se encontraron clientes registrados.
            </p>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Descuento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesVisibles.map((cliente, index) => (
                    <tr key={cliente.id}>
                      <td>
                        {(paginaActual - 1) * CLIENTES_POR_PAGINA + index + 1}
                      </td>
                      <td>
                        <strong>{cliente.nombre}</strong>
                        <br />
                        <small>{cliente.empresa || "Sin empresa"}</small>
                      </td>
                      <td>{cliente.telefono || "—"}</td>
                      <td>{cliente.correo || "—"}</td>
                      <td>
                        {cliente.tiene_descuento ? (
                          <span className="pill pill-si">
                            Sí · {cliente.descuento_porcentaje}%
                          </span>
                        ) : (
                          <span className="pill pill-no">No</span>
                        )}
                      </td>
                      <td className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => setClienteDetalle(cliente)}
                          aria-label="Ver detalles"
                        >
                          <EyeIcon />
                        </button>
                        <button
                          className="btn-edit"
                          onClick={() => abrirEditar(cliente)}
                          aria-label="Editar cliente"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setClienteToDelete(cliente)}
                          aria-label="Eliminar cliente"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                <nav className="pagination" aria-label="Paginación de clientes">
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() =>
                      setPagina((actual) => Math.max(1, actual - 1))
                    }
                    disabled={paginaActual === 1}
                  >
                    Anterior
                  </button>
                  {Array.from(
                    { length: totalPaginas },
                    (_, index) => index + 1,
                  ).map((numero) => (
                    <button
                      key={numero}
                      type="button"
                      className={`pagination-button ${paginaActual === numero ? "active" : ""}`}
                      onClick={() => setPagina(numero)}
                      aria-current={
                        paginaActual === numero ? "page" : undefined
                      }
                    >
                      {numero}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="pagination-button"
                    onClick={() =>
                      setPagina((actual) => Math.min(totalPaginas, actual + 1))
                    }
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      )}
      {clienteDetalle && (
        <div className="modal-overlay" onClick={() => setClienteDetalle(null)}>
          <div
            className="modal-card modal-detalle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{clienteDetalle.nombre}</h2>
              <button
                className="modal-close"
                onClick={() => setClienteDetalle(null)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="detail-grid">
              {[
                [
                  "Tipo de cliente",
                  {
                    persona_fisica: "Persona física",
                    persona_juridica: "Persona jurídica",
                    extranjero: "Extranjero",
                    otro: "Otro",
                  }[clienteDetalle.tipo_cliente],
                ],
                [
                  "Identificación",
                  `${{
                    cedula_fisica: "Cédula física",
                    cedula_juridica: "Cédula jurídica",
                    dimex: "DIMEX",
                    nite: "NITE",
                    otro: "Otro tipo",
                  }[clienteDetalle.tipo_identificacion] || "—"}${
                    clienteDetalle.numero_identificacion
                      ? ` · ${clienteDetalle.numero_identificacion}`
                      : ""
                  }`,
                ],
                ["Nombre comercial", clienteDetalle.empresa],
                ["Teléfono principal", clienteDetalle.telefono],
                ["Teléfono secundario", clienteDetalle.telefono_secundario],
                ["Correo general", clienteDetalle.correo],
                ["Persona de contacto", clienteDetalle.persona_contacto],
                [
                  "Correo para comprobantes",
                  clienteDetalle.correo_facturacion,
                ],
                ["Provincia", clienteDetalle.provincia],
                ["Cantón", clienteDetalle.canton],
                ["Distrito", clienteDetalle.distrito],
                ["Barrio", clienteDetalle.barrio],
                ["Código postal", clienteDetalle.codigo_postal],
                ["Otras señas / dirección", clienteDetalle.direccion],
                ["Actividad económica", clienteDetalle.actividad_economica],
                [
                  "Código de actividad",
                  clienteDetalle.codigo_actividad_economica,
                ],
                [
                  "Solicita comprobantes electrónicos",
                  clienteDetalle.requiere_factura_electronica ? "Sí" : "No",
                ],
                ["Balance pendiente", formatCRC(clienteDetalle.balance_pendiente)],
                [
                  "Descuento",
                  clienteDetalle.tiene_descuento
                    ? `${clienteDetalle.descuento_porcentaje}%`
                    : "Sin descuento",
                ],
                ["Estado", clienteDetalle.estado],
                ["Fecha de creación", clienteDetalle.creado_en],
                ["Última actualización", clienteDetalle.actualizado],
              ].map(([label, value]) => (
                <div className="detail-row" key={label}>
                  <span className="detail-label">{label}</span>
                  <span className="detail-value">{value || "—"}</span>
                </div>
              ))}
              {clienteDetalle.notas && (
                <div className="detail-row detail-row-full">
                  <span className="detail-label">Notas</span>
                  <span className="detail-value">{clienteDetalle.notas}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setClienteDetalle(null)}
              >
                Cerrar
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setClienteDetalle(null);
                  abrirEditar(clienteDetalle);
                }}
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}
      {clienteToDelete && (
        <div className="modal-overlay" onClick={() => setClienteToDelete(null)}>
          <div className="modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-confirm-icon">
              <TrashIcon width={26} height={26} />
            </div>

            <h3>¿Eliminar cliente?</h3>
            <p>
              Estás a punto de desactivar a{" "}
              <span className="modal-confirm-name">
                {clienteToDelete.nombre}
              </span>
              . Esta acción no se puede deshacer.
            </p>

            <div className="modal-confirm-actions">
              <button
                className="btn-secondary"
                onClick={() => setClienteToDelete(null)}
              >
                Cancelar
              </button>
              <button className="btn-confirm-danger" onClick={handleEliminar}>
                <TrashIcon width={15} height={15} />
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {tab === "nuevo" && (
        <CrudFormFrame
          title="➕ Registrar Nuevo Cliente"
          size="modal-lg"
          onClose={() => cerrarFormulario()}
        >
          {renderFormulario(handleCrear)}
        </CrudFormFrame>
      )}

      {tab === "editar" && (
        <CrudFormFrame
          title={`✏️ Editar Cliente — ${clienteEdit?.nombre}`}
          size="modal-lg"
          onClose={() => cerrarFormulario()}
        >
          {renderFormulario(handleActualizar)}
        </CrudFormFrame>
      )}
    </div>
  );
}

export default Clientes;
