function CrudFormFrame({
  title,
  children,
  size = "",
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={["modal", size].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="modal-close"
            aria-label={`Cerrar ${title}`}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default CrudFormFrame;
