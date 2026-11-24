import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTienda } from "../hooks/useTienda";

const DEFAULT_PREFERENCES = {
  tema: "light",
  notificaciones: true,
};

function Configuracion() {
  const { isAdmin } = useAuth();
  const {
    tienda,
    loading: cargandoTienda,
    saving,
    error: errorTienda,
    guardarTienda,
  } = useTienda();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [tiendaForm, setTiendaForm] = useState(null);
  const [tab, setTab] = useState("preferencias");
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState("success");

  useEffect(() => {
    const raw = window.localStorage.getItem("beyou-config");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      setPreferences({
        tema: saved.tema === "dark" ? "dark" : "light",
        notificaciones: saved.notificaciones !== false,
      });
    } catch (error) {
      console.warn("No se pudieron leer las preferencias locales:", error);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", preferences.tema === "dark");
  }, [preferences.tema]);

  useEffect(() => {
    if (!tienda) return;
    setTiendaForm(tienda);
  }, [tienda]);

  const handlePreferenceChange = (field, value) => {
    setPreferences((current) => ({ ...current, [field]: value }));
    setMensaje("");
  };

  const handleTiendaChange = (field, value) => {
    setTiendaForm((current) => ({ ...current, [field]: value }));
    setMensaje("");
  };

  const guardarPreferencias = (event) => {
    event.preventDefault();
    try {
      window.localStorage.setItem(
        "beyou-config",
        JSON.stringify(preferences),
      );
      setMensajeTipo("success");
      setMensaje("Preferencias guardadas correctamente.");
    } catch (error) {
      setMensajeTipo("error");
      setMensaje(error.message || "No se pudieron guardar las preferencias.");
    }
  };

  const restaurarPreferencias = () => {
    try {
      window.localStorage.setItem(
        "beyou-config",
        JSON.stringify(DEFAULT_PREFERENCES),
      );
      setPreferences(DEFAULT_PREFERENCES);
      setMensajeTipo("success");
      setMensaje("Preferencias restauradas.");
    } catch (error) {
      setMensajeTipo("error");
      setMensaje(error.message || "No se pudieron restaurar las preferencias.");
    }
  };

  const guardarInformacionTienda = async (event) => {
    event.preventDefault();
    setMensaje("");
    const resultado = await guardarTienda(tiendaForm);
    setMensajeTipo(resultado.ok ? "success" : "error");
    setMensaje(
      resultado.ok
        ? "Información de la tienda guardada correctamente."
        : resultado.message,
    );
  };

  const campoTienda = (name, label, options = {}) => (
    <div className="form-group" key={name}>
      <label htmlFor={`tienda-${name}`}>{label}</label>
      <input
        id={`tienda-${name}`}
        type={options.type || "text"}
        value={tiendaForm?.[name] ?? ""}
        maxLength={options.maxLength}
        readOnly={options.readOnly}
        disabled={!isAdmin || saving || cargandoTienda}
        required={options.required !== false}
        onChange={(event) => handleTiendaChange(name, event.target.value)}
      />
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>⚙️ Configuración</h1>
          <p>Administra la información de la tienda y las preferencias del sistema.</p>
        </div>
        {tienda && (
          <div className="status-pill">{tienda.nombreComercial}</div>
        )}
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Secciones de configuración">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preferencias"}
          className={tab === "preferencias" ? "settings-tab active" : "settings-tab"}
          onClick={() => {
            setTab("preferencias");
            setMensaje("");
          }}
        >
          Preferencias
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tienda"}
          className={tab === "tienda" ? "settings-tab active" : "settings-tab"}
          onClick={() => {
            setTab("tienda");
            setMensaje("");
          }}
        >
          Información de la tienda
        </button>
      </div>

      {tab === "preferencias" ? (
        <div className="settings-grid">
          <section className="settings-card">
            <div className="settings-card-header">
              <h2>Información comercial</h2>
            </div>
            <ul className="settings-summary">
              <li>
                <strong>Nombre comercial</strong>
                <span>{tienda?.nombreComercial || (cargandoTienda ? "Cargando…" : "No disponible")}</span>
              </li>
              <li>
                <strong>Moneda</strong>
                <span>
                  {tienda
                    ? `${tienda.monedaCodigo} (${tienda.simboloMoneda})`
                    : "—"}
                </span>
              </li>
            </ul>
            {errorTienda && <p className="message-error">{errorTienda}</p>}
          </section>

          <form className="settings-form" onSubmit={guardarPreferencias}>
            <section className="settings-section">
              <h2>Preferencias de visualización</h2>
              <p className="field-description">
                Estas preferencias se guardan en este equipo.
              </p>

              <div className="form-group">
                <label>Tema</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="tema"
                      value="light"
                      checked={preferences.tema === "light"}
                      onChange={() => handlePreferenceChange("tema", "light")}
                    />
                    Claro
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="tema"
                      value="dark"
                      checked={preferences.tema === "dark"}
                      onChange={() => handlePreferenceChange("tema", "dark")}
                    />
                    Oscuro
                  </label>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={preferences.notificaciones}
                    onChange={(event) =>
                      handlePreferenceChange("notificaciones", event.target.checked)
                    }
                  />
                  Activar notificaciones de alertas
                </label>
              </div>
            </section>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={restaurarPreferencias}
              >
                Restaurar preferencias
              </button>
              <button type="submit" className="btn-primary">
                Guardar preferencias
              </button>
            </div>
            {mensaje && <p className={`message-${mensajeTipo}`}>{mensaje}</p>}
          </form>
        </div>
      ) : (
        <form className="settings-form tienda-settings-form" onSubmit={guardarInformacionTienda}>
          {cargandoTienda && <p className="form-note">Cargando información de la tienda…</p>}
          {errorTienda && <p className="message-error">{errorTienda}</p>}
          {!isAdmin && (
            <p className="form-note">
              Solo un administrador puede modificar la información de la tienda.
            </p>
          )}

          {tiendaForm && (
            <>
              <div className="tienda-form-sections">
                <details className="tienda-form-section" open>
                  <summary>1. Información general</summary>
                  <div className="form-grid">
                    {campoTienda("nombreComercial", "Nombre comercial", { maxLength: 160 })}
                    {campoTienda("nombreTitular", "Nombre del titular", { maxLength: 160 })}
                    {campoTienda("tipoTitular", "Tipo de titular", { maxLength: 60 })}
                    {campoTienda("tipoIdentificacion", "Tipo de identificación", { maxLength: 60 })}
                    {campoTienda("numeroIdentificacion", "Número de identificación", { maxLength: 40 })}
                    {campoTienda("actividadEconomica", "Actividad económica", { maxLength: 40 })}
                    {campoTienda("regimenTributario", "Régimen tributario", { maxLength: 100 })}
                  </div>
                </details>

                <details className="tienda-form-section">
                  <summary>2. Contacto</summary>
                  <div className="form-grid">
                    {campoTienda("telefono", "Teléfono comercial", { maxLength: 40 })}
                    {campoTienda("correo", "Correo electrónico", { type: "email", maxLength: 160 })}
                  </div>
                </details>

                <details className="tienda-form-section">
                  <summary>3. Dirección comercial</summary>
                  <div className="form-grid">
                    {campoTienda("pais", "País", { maxLength: 100 })}
                    {campoTienda("provincia", "Provincia", { maxLength: 100 })}
                    {campoTienda("canton", "Cantón", { maxLength: 100 })}
                    {campoTienda("distrito", "Distrito", { maxLength: 100, required: false })}
                    {campoTienda("ubicacionReferencia", "Ubicación de referencia", { maxLength: 200, required: false })}
                    {campoTienda("direccion", "Dirección o señas", { maxLength: 300 })}
                  </div>
                </details>

                <details className="tienda-form-section">
                  <summary>4. Métodos de pago aceptados</summary>
                  <p className="field-description">
                    Estos métodos indican lo que acepta el negocio. El pago registrado conserva el método utilizado en esa transacción.
                  </p>
                  <div className="tienda-payment-options">
                    {[
                      ["efectivo", "Efectivo"],
                      ["sinpe", "SINPE"],
                      ["tarjeta", "Tarjeta"],
                    ].map(([key, label]) => (
                      <label className="tienda-payment-option" key={key}>
                        <input
                          type="checkbox"
                          checked={tiendaForm.metodosPago[key]}
                          disabled={!isAdmin || saving}
                          onChange={(event) =>
                            setTiendaForm((current) => ({
                              ...current,
                              metodosPago: {
                                ...current.metodosPago,
                                [key]: event.target.checked,
                              },
                            }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </details>

                <details className="tienda-form-section">
                  <summary>5. Configuración comercial</summary>
                  <div className="form-grid">
                    {campoTienda("monedaCodigo", "Moneda predeterminada", { readOnly: true })}
                    {campoTienda("simboloMoneda", "Símbolo de moneda", { readOnly: true })}
                  </div>
                </details>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!isAdmin || saving || cargandoTienda}
                >
                  {saving ? "Guardando…" : "Guardar información de la tienda"}
                </button>
              </div>
            </>
          )}

          {mensaje && <p className={`message-${mensajeTipo}`}>{mensaje}</p>}
        </form>
      )}
    </div>
  );
}

export default Configuracion;
