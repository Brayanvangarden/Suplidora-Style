import { useState } from "react";
import "../styles/polish-hero.css";

function PolishHero() {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      className={`polish-hero${open ? " is-open" : ""}`}
      title="Pasa el cursor para abrir el frasco"
      aria-label={open ? "Cerrar frasco de esmalte BeYou" : "Abrir frasco de esmalte BeYou"}
      aria-pressed={open}
      onClick={() => setOpen((value) => !value)}
    >
      <span className="polish-bottle" aria-hidden="true">
        <span className="polish-liquid" />
        <span className="polish-highlight" />
        <span className="polish-label">BeYou</span>
      </span>

      <span className="polish-neck" aria-hidden="true">
        <span className="polish-neck-rim" />
      </span>

      <span className="polish-drop" aria-hidden="true" />

      <span className="polish-cap" aria-hidden="true">
        <span className="polish-cap-tilt">
          <span className="polish-brush" />
          <span className="polish-cap-body" />
        </span>
      </span>
    </button>
  );
}

export default PolishHero;
