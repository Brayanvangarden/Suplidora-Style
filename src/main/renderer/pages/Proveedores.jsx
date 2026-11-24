import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useProveedores } from "../hooks/useProveedores";
import CrudFormFrame from "../components/CrudFormFrame";

const EMPTY = { tipo_proveedor: "otro", tipo_identificacion: "otro", numero_identificacion: "", nombre: "", nombre_comercial: "", persona_contacto: "", telefono: "", telefono_secundario: "", correo: "", correo_pedidos: "", sitio_web: "", provincia: "", canton: "", distrito: "", barrio: "", direccion: "", condiciones_pago: "", dias_credito: "", notas: "", estado: "activo" };
const labelTipo = (value) => ({ persona_fisica: "Persona física", persona_juridica: "Persona jurídica", extranjero: "Extranjero", otro: "Otro" })[value] ?? value;

function EyeIcon(props) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>;
}

function PencilIcon(props) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .622.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </svg>;
}

function TrashIcon(props) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>;
}

function Proveedores() {
  const { isAdmin } = useAuth();
  const { proveedores, loading, error, guardar, toggleEstado } = useProveedores();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState(EMPTY);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [proveedorToDelete, setProveedorToDelete] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const lista = useMemo(() => proveedores.filter((p) => {
    const q = busqueda.trim().toLocaleLowerCase();
    const matches = !q || [p.nombre, p.nombre_comercial, p.numero_identificacion, p.telefono, p.telefono_secundario, p.correo, p.correo_pedidos].some((v) => String(v ?? "").toLocaleLowerCase().includes(q));
    return matches && (filtro === "todos" || p.estado === filtro);
  }), [proveedores, busqueda, filtro]);

  const abrir = (proveedor = null) => {
    setMensaje("");
    setMensajeError("");
    setForm(proveedor ? { ...EMPTY, ...proveedor, dias_credito: proveedor.dias_credito ?? "" } : EMPTY);
    setEditando(Boolean(proveedor));
    setDetalle(null);
    setModal(true);
  };
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setGuardando(true);
    const result = await guardar({ ...form, ...(editando ? { id: form.id } : {}) });
    setGuardando(false);
    if (!result.ok) { setMensaje(result.message); return; }
    setMensaje(editando ? "Proveedor actualizado correctamente." : "Proveedor creado correctamente.");
    setForm(EMPTY);
    setEditando(false);
    setModal(false);
  };
  const handleEliminar = async () => {
    if (!proveedorToDelete || proveedorToDelete.estado === "inactivo") return;
    setEliminando(true);
    const result = await toggleEstado(proveedorToDelete.id, "inactivo");
    setEliminando(false);
    setProveedorToDelete(null);
    if (!result.ok) {
      setMensajeError(result.message || "No se pudo eliminar el proveedor.");
      return;
    }
    setMensajeError("");
    setMensaje("Proveedor eliminado correctamente.");
  };
  const field = (name, label, options = {}) => (
    <div className="form-group" key={name}>
      <label htmlFor={`proveedor-${name}`}>{label}{options.required ? " *" : ""}</label>
      {options.choices ? <select id={`proveedor-${name}`} name={name} value={form[name]} onChange={change} required={options.required}>{options.choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
        : options.textarea ? <textarea id={`proveedor-${name}`} name={name} value={form[name]} onChange={change} rows={options.rows ?? 3} maxLength={options.maxLength} />
          : <input id={`proveedor-${name}`} name={name} type={options.type ?? "text"} value={form[name] ?? ""} onChange={change} required={options.required} maxLength={options.maxLength} min={options.min} max={options.max} />}
    </div>
  );

  return <div className="page-container">
    <div className="page-header"><div><h1>Proveedores</h1><p>Directorio de proveedores y sus condiciones comerciales.</p></div>{isAdmin && <button className="btn-primary" onClick={() => abrir()}>+ Nuevo proveedor</button>}</div>
    {mensaje && <div className="message-success-banner" role="status">{mensaje}</div>}
    {mensajeError && <div className="message-error" role="alert">{mensajeError}</div>}
    {error && <div className="message-error" role="alert">{error}</div>}
    <div className="list-container">
      <div className="search-bar provider-search-bar"><input aria-label="Buscar proveedores" placeholder="Buscar por nombre, identificación, teléfono o correo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /><select className="provider-status-filter" aria-label="Filtrar por estado" value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></div>
      {loading ? <p className="empty-state">Cargando proveedores...</p> : lista.length === 0 ? <p className="empty-state">No se encontraron proveedores.</p> : <div className="table-responsive"><table className="data-table"><thead><tr><th>Proveedor</th><th>Identificación</th><th>Contacto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{lista.map((p) => <tr key={p.id}><td><strong>{p.nombre}</strong>{p.nombre_comercial && <small className="provider-subtitle">{p.nombre_comercial}</small>}</td><td>{p.numero_identificacion || "—"}</td><td>{[p.telefono, p.correo].filter(Boolean).map((value) => <small className="provider-subtitle" key={value}>{value}</small>)}</td><td><span className={`pill ${p.estado === "activo" ? "pill-si" : "pill-no"}`}>{p.estado === "activo" ? "Activo" : "Inactivo"}</span></td><td className="action-buttons"><button className="btn-view" onClick={() => setDetalle(p)} aria-label={`Ver ${p.nombre}`} title="Ver"><EyeIcon /></button>{isAdmin && <><button className="btn-edit" onClick={() => abrir(p)} aria-label={`Editar ${p.nombre}`} title="Editar"><PencilIcon /></button><button className="btn-danger" onClick={() => setProveedorToDelete(p)} aria-label={p.estado === "inactivo" ? `${p.nombre} ya está inactivo` : `Eliminar ${p.nombre}`} title={p.estado === "inactivo" ? "Proveedor inactivo" : "Eliminar"} disabled={p.estado === "inactivo"}><TrashIcon /></button></>}</td></tr>)}</tbody></table></div>}
    </div>

    {modal && <CrudFormFrame title={editando ? "Editar proveedor" : "Nuevo proveedor"} onClose={() => { setForm(EMPTY); setEditando(false); setModal(false); }}>
      <form className="modal-form provider-form" onSubmit={submit}>
        <fieldset><legend>1. Información general</legend><div className="provider-grid">
          {field("tipo_proveedor", "Tipo de proveedor", { choices: [["persona_fisica", "Persona física"], ["persona_juridica", "Persona jurídica"], ["extranjero", "Extranjero"], ["otro", "Otro"]] })}
          {field("tipo_identificacion", "Tipo de identificación", { choices: [["cedula_fisica", "Cédula física"], ["cedula_juridica", "Cédula jurídica"], ["dimex", "DIMEX"], ["nite", "NITE"], ["otro", "Otro"]] })}
          {field("numero_identificacion", "Número de identificación", { maxLength: 40 })}{field("nombre", "Nombre o razón social", { required: true, maxLength: 200 })}{field("nombre_comercial", "Nombre comercial", { maxLength: 200 })}
          {field("estado", "Estado", { choices: [["activo", "Activo"], ["inactivo", "Inactivo"]] })}
        </div></fieldset>
        <fieldset><legend>2. Contacto</legend><div className="provider-grid">{field("persona_contacto", "Contacto principal", { maxLength: 200 })}{field("telefono", "Teléfono principal", { type: "tel", maxLength: 30 })}{field("telefono_secundario", "Teléfono secundario", { type: "tel", maxLength: 30 })}{field("correo", "Correo electrónico", { type: "email", maxLength: 254 })}{field("correo_pedidos", "Correo para pedidos", { type: "email", maxLength: 254 })}{field("sitio_web", "Sitio web", { type: "url", maxLength: 300 })}</div></fieldset>
        <fieldset><legend>3. Dirección</legend><div className="provider-grid">{field("provincia", "Provincia", { maxLength: 100 })}{field("canton", "Cantón", { maxLength: 100 })}{field("distrito", "Distrito", { maxLength: 100 })}{field("barrio", "Barrio", { maxLength: 100 })}{field("direccion", "Otras señas", { maxLength: 500 })}</div></fieldset>
        <fieldset><legend>4. Información comercial</legend><div className="provider-grid">{field("condiciones_pago", "Condiciones de pago", { maxLength: 200 })}{field("dias_credito", "Días de crédito", { type: "number", min: 0, max: 3650 })}</div></fieldset>
        <fieldset><legend>5. Notas</legend>{field("notas", "Notas", { textarea: true, maxLength: 2000 })}</fieldset>
        {mensaje && <div className="message-error" role="alert">{mensaje}</div>}
        <div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => { setForm(EMPTY); setEditando(false); setModal(false); }}>Cancelar</button><button type="submit" className="btn-primary" disabled={guardando}>{guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear proveedor"}</button></div>
      </form>
    </CrudFormFrame>}

    {detalle && <CrudFormFrame title="Ficha del proveedor" onClose={() => setDetalle(null)}><div className="provider-detail"><h2>{detalle.nombre}</h2><p>{labelTipo(detalle.tipo_proveedor)} · {detalle.estado === "activo" ? "Activo" : "Inactivo"}</p><dl>{[["Identificación", detalle.numero_identificacion], ["Nombre comercial", detalle.nombre_comercial], ["Contacto", detalle.persona_contacto], ["Teléfono", detalle.telefono], ["Teléfono secundario", detalle.telefono_secundario], ["Correo", detalle.correo], ["Correo para pedidos", detalle.correo_pedidos], ["Sitio web", detalle.sitio_web], ["Dirección", [detalle.provincia, detalle.canton, detalle.distrito, detalle.barrio, detalle.direccion].filter(Boolean).join(", ")], ["Condiciones de pago", detalle.condiciones_pago], ["Días de crédito", detalle.dias_credito], ["Creado", detalle.creado_en], ["Actualizado", detalle.actualizado], ["Notas", detalle.notas]].map(([label, value]) => value ? <div key={label}><dt>{label}</dt><dd>{value}</dd></div> : null)}</dl></div></CrudFormFrame>}

    {proveedorToDelete && <div className="modal-overlay" onClick={() => setProveedorToDelete(null)}>
      <div className="modal-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-provider-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-confirm-icon"><TrashIcon width={26} height={26} /></div>
        <h3 id="delete-provider-title">¿Eliminar proveedor?</h3>
        <p>Estás a punto de desactivar a <span className="modal-confirm-name">{proveedorToDelete.nombre}</span>. Sus datos se conservarán y podrás reactivarlo desde su edición.</p>
        <div className="modal-confirm-actions">
          <button className="btn-secondary" onClick={() => setProveedorToDelete(null)} disabled={eliminando}>Cancelar</button>
          <button className="btn-confirm-danger" onClick={handleEliminar} disabled={eliminando}>
            <TrashIcon width={15} height={15} />
            {eliminando ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>}
  </div>;
}

export default Proveedores;
