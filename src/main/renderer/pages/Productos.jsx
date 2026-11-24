import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useProductos } from "../hooks/useProductos";
import { useCategorias } from "../hooks/useCategorias";
import { useProveedores } from "../hooks/useProveedores";
import { productosService } from "../services/productos.service";
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

const EMPTY = {
  nombre: "",
  descripcion: "",
  precio: "",
  costoCompra: "",
  stock: "",
  stockMinimo: "",
  stockMaximo: "",
  unidadVenta: "unidad",
  categoriaId: "",
  sku: "",
  material: "",
  color: "",
  marca: "",
  modelo: "",
  talla: "",
  codigoBarras: "",
  tipoImpuesto: "",
  impuestoTarifa: "",
  tratamientoTributario: "",
  codigoCabys: "",
  proveedorId: "",
  codigoProductoProveedor: "",
  unidadCompra: "",
  factorConversion: "1",
  estado: "activo",
};

const bloquearTeclasNoNumericas = (event) => {
  if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault();
};

const aceptarNumero = (value, decimal = false) => {
  const patron = decimal ? /^\d*(\.\d*)?$/ : /^\d*$/;
  return patron.test(value) ? value : null;
};

const PRODUCTOS_POR_PAGINA = 10;

function Productos() {
  const { isAdmin } = useAuth();
  const {
    productos,
    stockBajo,
    loading,
    fetchProductos,
    fetchAlertas,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    obtenerProducto,
  } = useProductos();

  const { categorias } = useCategorias();
  const { proveedores } = useProveedores();

  const [busqueda, setBusqueda] = useState("");
  const [tab, setTab] = useState("lista");
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [detalleModal, setDetalleModal] = useState(false);
  const [detalleProducto, setDetalleProducto] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("activo");
  const [confirmId, setConfirmId] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState("success");
  const [loadingOp, setLoadingOp] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const inputImportRef = useRef(null);

  // ── Filtros ──────────────────────────────────────────
  const listaFiltrada = productos.filter((producto) => {
    const query = busqueda.trim().toLocaleLowerCase();
    const coincideEstado =
      estadoFiltro === "todos" || producto.estado === estadoFiltro;
    const coincideBusqueda =
      !query ||
      [
        producto.nombre,
        producto.descripcion,
        producto.sku,
        producto.codigo_barras,
        producto.marca,
        producto.modelo,
        producto.color,
        producto.categoria_nombre,
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
    const coincideStockBajo =
      filtro !== "stockBajo" ||
      stockBajo.some((item) => item.id === producto.id);
    return coincideEstado && coincideBusqueda && coincideStockBajo;
  });

  const totalPaginas = Math.max(
    1,
    Math.ceil(listaFiltrada.length / PRODUCTOS_POR_PAGINA),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const productosVisibles = listaFiltrada.slice(
    (paginaActual - 1) * PRODUCTOS_POR_PAGINA,
    paginaActual * PRODUCTOS_POR_PAGINA,
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtro, estadoFiltro]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  // ── Handlers ─────────────────────────────────────────
  const abrirCrear = () => {
    if (!isAdmin) return;
    setForm(EMPTY);
    setEditando(null);
    setMensaje("");
    setTab("nuevo");
  };

  const abrirEditar = (p) => {
    if (!isAdmin) return;
    setMensaje("");
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      precio: p.precio,
      costoCompra: p.costoCompra ?? "",
      stock: p.stock,
      stockMinimo: p.stockMinimo ?? "",
      stockMaximo: p.stockMaximo ?? "",
      unidadVenta: p.unidadVenta ?? "unidad",
      categoriaId: p.categoriaId ?? "",
      sku: p.sku ?? "",
      material: p.material ?? "",
      color: p.color ?? "",
      marca: p.marca ?? "",
      modelo: p.modelo ?? "",
      talla: p.talla ?? "",
      codigoBarras: p.codigoBarras ?? "",
      tipoImpuesto: p.tipoImpuesto ?? "",
      impuestoTarifa: p.impuestoTarifa ?? "",
      tratamientoTributario: p.tratamientoTributario ?? "",
      codigoCabys: p.codigoCabys ?? "",
      proveedorId: p.proveedorId ?? "",
      codigoProductoProveedor: p.codigoProductoProveedor ?? "",
      unidadCompra: p.unidadCompra ?? "",
      factorConversion: p.factorConversion ?? 1,
      estado: p.estado ?? "activo",
    });
    setEditando(p.id);
    setTab("editar");
  };

  const cerrarFormulario = (clearMessage = true) => {
    setEditando(null);
    setForm(EMPTY);
    setTab("lista");
    if (clearMessage) setMensaje("");
  };

  const exportarCSV = () => {
    const columnas = [
      "Nombre",
      "Descripción",
      "Categoría",
      "Precio (CRC)",
      "Stock",
      "Stock mínimo",
      "SKU",
      "Material",
      "Código de barras",
      "Marca",
      "Modelo",
      "Color",
      "Talla",
      "Unidad de venta",
      "Stock máximo",
      "Costo por presentación de compra",
      "Tipo de impuesto",
      "Tarifa de impuesto (%)",
      "Tratamiento tributario",
      "Código CABYS",
      "Proveedor",
      "Código del proveedor",
      "Unidad de compra",
      "Factor de conversión",
      "Estado",
    ];

    const escapar = (valor) => {
      const texto = String(valor ?? "");
      if (/['";\n]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`;
      }
      return texto;
    };

    const filas = listaFiltrada.map((p) =>
      [
        p.nombre,
        p.descripcion,
        categorias.find((c) => c.id === p.categoriaId)?.nombre ??
          p.categoria_nombre ??
          "Sin categoría",
        p.precio,
        p.stock,
        p.stockMinimo ?? 0,
        p.sku ?? "",
        p.material ?? "",
        p.codigo_barras ?? "",
        p.marca ?? "",
        p.modelo ?? "",
        p.color ?? "",
        p.talla ?? "",
        p.unidad_venta ?? "unidad",
        p.stock_maximo ?? "",
        p.costo_compra ?? "",
        p.tipo_impuesto ?? "",
        p.impuesto_tarifa ?? "",
        p.tratamiento_tributario ?? "",
        p.codigo_cabys ?? "",
        proveedores.find((proveedor) => proveedor.id === p.proveedor_id)?.nombre ?? "",
        p.codigo_producto_proveedor ?? "",
        p.unidad_compra ?? "",
        p.cantidad_paquete ?? 1,
        p.estado ?? "activo",
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
    link.download = `productos_${fecha}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

    return lineas.slice(1).map((linea) => {
      const [
        nombre,
        descripcion,
        categoria,
        precio,
        stock,
        stockMinimo,
        sku,
        material,
        codigoBarras,
        marca,
        modelo,
        color,
        talla,
        unidadVenta,
        stockMaximo,
        costoCompra,
        tipoImpuesto,
        impuestoTarifa,
        tratamientoTributario,
        codigoCabys,
        proveedorNombre,
        codigoProductoProveedor,
        unidadCompra,
        factorConversion,
        estado,
      ] = parsearLinea(linea);

      const normalizar = (value) => String(value ?? "").trim().toLocaleLowerCase();
      const categoriaEncontrada = categorias.find(
        (c) => normalizar(c.nombre) === normalizar(categoria),
      );
      const proveedorEncontrado = proveedores.find(
        (proveedor) =>
          normalizar(proveedor.nombre) === normalizar(proveedorNombre) ||
          normalizar(proveedor.nombre_comercial) === normalizar(proveedorNombre),
      );
      const numero = (value, optional = false) => {
        const normalized = String(value ?? "").trim();
        return normalized ? Number(normalized) : optional ? null : 0;
      };

      return {
        nombre,
        descripcion,
        categoriaId: categoria ? categoriaEncontrada?.id ?? -1 : null,
        precio: numero(precio),
        stock: numero(stock),
        stockMinimo: numero(stockMinimo),
        sku: String(sku ?? "").trim() || null,
        material,
        codigoBarras,
        marca,
        modelo,
        color,
        talla,
        unidadVenta: unidadVenta || "unidad",
        stockMaximo: numero(stockMaximo, true),
        costoCompra: numero(costoCompra, true),
        tipoImpuesto,
        impuestoTarifa: numero(impuestoTarifa, true),
        tratamientoTributario,
        codigoCabys,
        proveedorId: proveedorNombre ? proveedorEncontrado?.id ?? -1 : null,
        codigoProductoProveedor,
        unidadCompra,
        factorConversion: String(factorConversion ?? "").trim()
          ? numero(factorConversion)
          : 1,
        estado: estado || "activo",
      };
    });
  };

  const handleImportarCSV = async (event) => {
    if (!isAdmin) return;
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    setLoadingOp(true);
    setMensaje("");
    try {
      const texto = await archivo.text();
      const filas = parsearCSV(texto);
      if (filas.length === 0) {
        setMensajeTipo("error");
        setMensaje("El archivo no tiene datos para importar.");
        return;
      }

      const resultado = await productosService.importBulk(filas);

      setMensajeTipo(resultado.fallidos ? "error" : "success");
      setMensaje(
        `Importación: ${resultado.creados} creados, ${resultado.fallidos} fallidos.${
          resultado.errores[0] ? ` ${resultado.errores[0]}` : ""
        }`,
      );
      if (resultado.errores.length) console.warn(resultado.errores);
      await Promise.all([fetchProductos(), fetchAlertas()]);
    } catch (err) {
      setMensajeTipo("error");
      setMensaje(err.message || "No se pudo importar el archivo.");
    } finally {
      setLoadingOp(false);
      if (event.target) event.target.value = "";
    }
  };

  // Auto-limpia mensaje
  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(""), 3000);
    return () => clearTimeout(t);
  }, [mensaje]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    if (!isAdmin) {
      setMensajeTipo("error");
      setMensaje("No tienes permiso para modificar productos.");
      return;
    }

    const { stock: stockInicial, ...campos } = form;
    const data = {
      ...campos,
      precio: Number(form.precio),
      ...(tab === "nuevo" ? { stock: Number(stockInicial) } : {}),
      costoCompra: form.costoCompra === "" ? null : Number(form.costoCompra),
      stockMinimo: form.stockMinimo === "" ? 0 : Number(form.stockMinimo),
      stockMaximo: form.stockMaximo === "" ? null : Number(form.stockMaximo),
      impuestoTarifa: form.impuestoTarifa === "" ? null : Number(form.impuestoTarifa),
      factorConversion: Number(form.factorConversion),
      categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
      proveedorId: form.proveedorId ? Number(form.proveedorId) : null,
      sku: String(form.sku ?? "").trim(),
      codigoBarras: String(form.codigoBarras ?? "").trim(),
      nombre: String(form.nombre ?? "").trim(),
      unidadVenta: String(form.unidadVenta ?? "").trim(),
      material: form.material || null,
      color: form.color || null,
      marca: form.marca || null,
      modelo: form.modelo || null,
      talla: form.talla || null,
      tipoImpuesto: form.tipoImpuesto || null,
      tratamientoTributario: form.tratamientoTributario || null,
      codigoCabys: form.codigoCabys || null,
      codigoProductoProveedor: form.codigoProductoProveedor || null,
      unidadCompra: form.unidadCompra || null,
    };

    const errores = [];
    if (!data.nombre) errores.push("El nombre es obligatorio.");
    if (!Number.isFinite(data.precio) || data.precio < 0) {
      errores.push("El precio debe ser un número mayor o igual a 0.");
    }
    if (tab === "nuevo" && (!Number.isFinite(data.stock) || data.stock < 0)) {
      errores.push("El stock inicial debe ser un número mayor o igual a 0.");
    }
    if (!Number.isFinite(data.stockMinimo) || data.stockMinimo < 0) {
      errores.push("El stock mínimo debe ser un número mayor o igual a 0.");
    }
    if (data.stockMaximo != null && (!Number.isFinite(data.stockMaximo) || data.stockMaximo < data.stockMinimo)) {
      errores.push("El stock máximo debe ser mayor o igual que el stock mínimo.");
    }
    if (data.costoCompra != null && (!Number.isFinite(data.costoCompra) || data.costoCompra < 0)) {
      errores.push("El costo de compra debe ser un número mayor o igual a 0.");
    }
    if (data.impuestoTarifa != null && (!Number.isFinite(data.impuestoTarifa) || data.impuestoTarifa < 0 || data.impuestoTarifa > 100)) {
      errores.push("La tarifa informativa debe estar entre 0 y 100%.");
    }
    if (!Number.isFinite(data.factorConversion) || data.factorConversion <= 0) {
      errores.push("El factor de conversión debe ser mayor que cero.");
    }
    if (!data.unidadVenta) {
      errores.push("La unidad de venta es obligatoria.");
    }
    if (tab === "nuevo" && !form.categoriaId) {
      errores.push("La categoría es obligatoria.");
    } else if (form.categoriaId) {
      const categoriaId = Number(form.categoriaId);
      const categoria = categorias.find((item) => item.id === categoriaId);
      const categoriaInactivaExistente =
        editando &&
        productos.find((producto) => producto.id === editando)?.categoriaId === categoriaId;
      if (
        !Number.isInteger(categoriaId) ||
        !categoria ||
        (categoria.estado !== "activo" && !categoriaInactivaExistente)
      ) {
        errores.push("Seleccione una categoría válida.");
      }
    }

    const skuNormalizado = data.sku.toLowerCase();
    const codigoBarrasNormalizado = data.codigoBarras.toLowerCase();
    const nombreNormalizado = data.nombre.trim().toLowerCase();
    if (
      productos.some(
        (producto) =>
          producto.estado === "activo" &&
          producto.id !== editando &&
          String(producto.nombre ?? "")
            .trim()
            .toLowerCase() === nombreNormalizado,
      )
    ) {
      errores.push("Ya existe un producto con ese nombre.");
    }

    if (!data.sku) {
      errores.push("El SKU es obligatorio para identificar el producto.");
    } else if (
      productos.some(
        (producto) =>
          producto.estado === "activo" &&
          producto.id !== editando &&
          String(producto.sku ?? "")
            .trim()
            .toLowerCase() === skuNormalizado,
      )
    ) {
      errores.push("Ya existe un producto con ese SKU.");
    }
    if (
      data.codigoBarras &&
      productos.some(
        (producto) =>
          producto.id !== editando &&
          String(producto.codigo_barras ?? "").trim().toLowerCase() ===
            codigoBarrasNormalizado,
      )
    ) {
      errores.push("Ya existe un producto con ese código de barras.");
    }
    if (
      data.proveedorId &&
      !proveedores.some((proveedor) => proveedor.id === data.proveedorId)
    ) {
      errores.push("Seleccione un proveedor válido.");
    }

    if (errores.length) {
      setMensajeTipo("error");
      setMensaje(errores.join(" "));
      return;
    }

    setLoadingOp(true);
    try {
      const resultado = editando
        ? await actualizarProducto({ id: editando, ...data })
        : await crearProducto(data);

      if (!resultado.ok) {
        setMensajeTipo("error");
        setMensaje(resultado.message || "No se pudo guardar el producto.");
        return;
      }

      setMensajeTipo("success");
      setMensaje(
        editando
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );
      cerrarFormulario(false);
    } finally {
      setLoadingOp(false);
    }
  };

  const renderFormulario = (onSubmit) => {
    const cambiar = (name, value) =>
      setForm((actual) => ({ ...actual, [name]: value }));
    const campoTexto = (name, label, options = {}) => (
      <div className={`form-group ${options.fullWidth ? "full-width" : ""}`} key={name}>
        <label htmlFor={`producto-${name}`}>{label}{options.required ? " *" : ""}</label>
        <input
          id={`producto-${name}`}
          required={options.required}
          maxLength={options.maxLength}
          type="text"
          inputMode={options.numeric ? "decimal" : undefined}
          value={form[name] ?? ""}
          onKeyDown={options.numeric ? bloquearTeclasNoNumericas : undefined}
          onChange={(event) => {
            if (!options.numeric) {
              cambiar(name, event.target.value);
              return;
            }
            const value = aceptarNumero(event.target.value, true);
            if (value !== null) cambiar(name, value);
          }}
          placeholder={options.placeholder}
        />
      </div>
    );
    const categoriaActual = categorias.find(
      (categoria) => categoria.id === Number(form.categoriaId),
    );
    const categoriasDisponibles = categorias.filter(
      (categoria) =>
        categoria.estado === "activo" || categoria.id === categoriaActual?.id,
    );
    const proveedoresDisponibles = proveedores.filter(
      (proveedor) =>
        proveedor.estado === "activo" ||
        proveedor.id === Number(form.proveedorId),
    );
    const factorConversion = Number(form.factorConversion);
    const costoUnitario =
      form.costoCompra !== "" && factorConversion > 0
        ? Number(form.costoCompra) / factorConversion
        : null;
    const precioVenta = Number(form.precio);
    const margenBruto =
      costoUnitario != null && Number.isFinite(precioVenta)
        ? precioVenta - costoUnitario
        : null;
    const margenPorcentaje =
      margenBruto != null && precioVenta > 0
        ? (margenBruto / precioVenta) * 100
        : null;

    return (
      <form onSubmit={onSubmit} className="modal-form product-form">
        <div className="product-form-sections">
          <details className="product-form-section" open>
            <summary>1. Información general</summary>
            <div className="form-grid">
              {campoTexto("nombre", "Nombre del producto", { required: true, maxLength: 200 })}
              <div className="form-group">
                <label htmlFor="producto-categoria">Categoría{tab === "nuevo" ? " *" : ""}</label>
                <select
                  id="producto-categoria"
                  required={tab === "nuevo"}
                  value={form.categoriaId}
                  onChange={(event) => cambiar("categoriaId", event.target.value)}
                >
                  <option value="">{tab === "nuevo" ? "Seleccione una categoría" : "Sin categoría"}</option>
                  {categoriasDisponibles.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}{categoria.estado === "inactivo" ? " (inactiva)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {campoTexto("sku", "SKU / código interno", { required: true, maxLength: 200 })}
              {campoTexto("codigoBarras", "Código de barras", { maxLength: 100 })}
              {campoTexto("marca", "Marca", { maxLength: 100 })}
              {campoTexto("modelo", "Modelo", { maxLength: 100 })}
              <div className="form-group full-width">
                <label htmlFor="producto-descripcion">Descripción</label>
                <textarea
                  id="producto-descripcion"
                  rows={3}
                  maxLength={2000}
                  value={form.descripcion}
                  onChange={(event) => cambiar("descripcion", event.target.value)}
                  placeholder="Descripción del producto"
                />
              </div>
              <div className="form-group">
                <label htmlFor="producto-estado">Estado</label>
                <select
                  id="producto-estado"
                  value={form.estado}
                  onChange={(event) => cambiar("estado", event.target.value)}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </details>

          <details className="product-form-section" open>
            <summary>2. Inventario</summary>
            <div className="form-grid">
              {tab === "nuevo" ? (
                campoTexto("stock", "Stock inicial", { required: true, numeric: true })
              ) : (
                <div className="form-group">
                  <label>Existencia actual</label>
                  <div className="readonly-field">{form.stock} {form.unidadVenta}</div>
                  <small className="product-form-note">Para cambiar existencias, registra un movimiento en Inventario. La edición del producto no altera el stock.</small>
                </div>
              )}
              {campoTexto("stockMinimo", "Stock mínimo", { numeric: true })}
              {campoTexto("stockMaximo", "Stock máximo (opcional)", { numeric: true })}
              {campoTexto("unidadVenta", "Unidad de venta", { required: true, maxLength: 30, placeholder: "unidad, kg, litro..." })}
            </div>
          </details>

          <details className="product-form-section">
            <summary>3. Costos y precios</summary>
            <div className="form-grid">
              {campoTexto("precio", "Precio de venta (₡)", { required: true, numeric: true })}
              {campoTexto("costoCompra", "Último costo de compra por presentación (₡)", { numeric: true })}
              <div className="product-form-summary full-width">
                <strong>Margen bruto estimado</strong>
                <span>
                  {margenBruto == null || !Number.isFinite(margenBruto)
                    ? "Ingrese precio y costo para calcularlo."
                    : `${formatCRC(margenBruto)}${margenPorcentaje == null ? "" : ` · ${margenPorcentaje.toFixed(1)}%`}`}
                </span>
                <small>El costo se convierte a unidad de venta usando el factor de conversión. El margen se calcula, no se almacena.</small>
              </div>
            </div>
          </details>

          <details className="product-form-section">
            <summary>4. Impuestos (referencia)</summary>
            <p className="product-form-note">Estos datos son informativos; no calculan impuestos ni cambian precios, ventas o facturas.</p>
            <div className="form-grid">
              {campoTexto("tipoImpuesto", "Tipo de impuesto", { maxLength: 50 })}
              {campoTexto("impuestoTarifa", "Tarifa (%)", { numeric: true })}
              {campoTexto("tratamientoTributario", "Tratamiento tributario", { maxLength: 100 })}
              {campoTexto("codigoCabys", "Código CABYS", { maxLength: 20 })}
            </div>
          </details>

          <details className="product-form-section">
            <summary>5. Compras y proveedor</summary>
            <p className="product-form-note">La presentación y conversión quedan como referencia. No se registra una compra ni se ajusta inventario desde aquí.</p>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="producto-proveedor">Proveedor principal</label>
                <select
                  id="producto-proveedor"
                  value={form.proveedorId}
                  onChange={(event) => cambiar("proveedorId", event.target.value)}
                >
                  <option value="">Sin proveedor principal</option>
                  {proveedoresDisponibles.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre_comercial || proveedor.nombre}
                      {proveedor.estado === "inactivo" ? " (inactivo)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {campoTexto("codigoProductoProveedor", "Código del producto del proveedor", { maxLength: 100 })}
              {campoTexto("unidadCompra", "Presentación de compra", { maxLength: 50, placeholder: "caja, paquete..." })}
              {campoTexto("factorConversion", "Unidades de venta por presentación", { required: true, numeric: true })}
            </div>
          </details>

          <details className="product-form-section">
            <summary>6. Características adicionales</summary>
            <div className="form-grid">
              {campoTexto("color", "Color", { maxLength: 100 })}
              {campoTexto("talla", "Tamaño / talla", { maxLength: 50 })}
              {campoTexto("material", "Material", { maxLength: 100 })}
            </div>
          </details>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={cerrarFormulario}>
            ✖ Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loadingOp}>
            {loadingOp
              ? "Guardando..."
              : editando
                ? "✏️ Actualizar producto"
                : "✅ Registrar producto"}
          </button>
        </div>
        {mensaje && (
          <p className={mensajeTipo === "success" ? "message-success" : "message-error"}>
            {mensaje}
          </p>
        )}
      </form>
    );
  };

  const handleEliminar = async (id) => {
    if (!isAdmin || !id) return;
    const resultado = await eliminarProducto(id);
    if (!resultado.ok) {
      setMensajeTipo("error");
      setMensaje(resultado.message || "No se pudo eliminar el producto.");
      setConfirmId(null);
      return;
    }
    setMensajeTipo("success");
    setMensaje("Producto eliminado correctamente.");
    setConfirmId(null);
  };

  if (loading) return <div className="page-loading">Cargando productos…</div>;

  return (
    <div className="page">
      {/* Cabecera */}
      <div className="page-header">
        <div>
          <h1>📦 Productos</h1>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={abrirCrear}>
            ➕ Nuevo producto
          </button>
        )}
      </div>

      {mensaje && !["nuevo", "editar"].includes(tab) && (
        <div className={mensajeTipo === "success" ? "message-success-banner" : "message-error"} role={mensajeTipo === "success" ? "status" : "alert"}>
          {mensajeTipo === "success" ? "✅ " : ""}{mensaje}
        </div>
      )}

      {/* Alertas rápidas */}
      {stockBajo.length > 0 && (
        <div className="alertas-row">
          <div
            className="alerta alerta-warning"
            onClick={() => {
              setEstadoFiltro("activo");
              setFiltro("stockBajo");
            }}
          >
            ⚠️ <strong>{stockBajo.length}</strong> con stock bajo
          </div>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="🔍 Buscar productos…"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setFiltro("todos");
          }}
          className="search-input"
        />
        <div className="toolbar-actions">
          {isAdmin && (
            <button
              className="btn-secondary"
              onClick={() => inputImportRef.current?.click()}
            >
              📤 Importar CSV
            </button>
          )}
          <button className="btn-secondary" onClick={exportarCSV}>
            📥 Exportar CSV
          </button>
          {isAdmin && (
            <input
              ref={inputImportRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleImportarCSV}
            />
          )}
        </div>
        <div className="filtros">
          <select
            className="filtro-select"
            aria-label="Filtrar productos por estado"
            value={estadoFiltro}
            onChange={(event) => setEstadoFiltro(event.target.value)}
          >
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos los estados</option>
          </select>
          {["todos", "stockBajo"].map((f) => (
            <button
              key={f}
              className={`btn-filtro ${filtro === f ? "active" : ""}`}
              onClick={() => {
                setFiltro(f);
                setBusqueda("");
              }}
            >
              {f === "todos" ? "Todos" : "⚠️ Stock bajo"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla (solo en vista lista) */}
      {tab === "lista" &&
        (listaFiltrada.length === 0 ? (
          <p className="empty-msg">No se encontraron productos.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio (₡)</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosVisibles.map((p) => (
                  <tr
                    key={p.id}
                    className={
                      p.estado === "activo" && stockBajo.some((s) => s.id === p.id)
                        ? "row-warning"
                        : ""
                    }
                  >
                    <td>
                      <strong>{p.nombre}</strong>
                      <br />
                      <small>{p.descripcion}</small>
                    </td>
                    <td>
                      {categorias.find((c) => c.id === p.categoriaId)?.nombre ??
                        p.categoria_nombre ??
                        "—"}
                    </td>
                    <td>{formatCRC(p.precio)}</td>
                    <td>
                      <strong>{p.sku || "—"}</strong>
                      {p.codigo_barras && <small className="product-table-subtitle">{p.codigo_barras}</small>}
                    </td>
                    <td>
                      <span
                        className={`badge ${p.stock <= (p.stockMinimo || 0) ? "badge-danger" : "badge-success"}`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${p.estado === "activo" ? "pill-si" : "pill-no"}`}>
                        {p.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Ver detalle"
                        aria-label="Ver detalle"
                        onClick={async () => {
                          setDetalleLoading(true);
                          const resultado = await obtenerProducto(p.id);
                          setDetalleLoading(false);
                          setDetalleProducto(resultado.ok ? resultado.data : p);
                          setDetalleModal(true);
                        }}
                      >
                        👁️
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            className="btn-edit"
                            title="Editar producto"
                            aria-label="Editar producto"
                            onClick={() => abrirEditar(p)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="btn-edit btn-danger"
                            title="Eliminar producto"
                            aria-label="Eliminar producto"
                            onClick={() => setConfirmId(p.id)}
                          >
                            <TrashIcon />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPaginas > 1 && (
              <nav className="pagination" aria-label="Paginación de productos">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
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
                    aria-current={paginaActual === numero ? "page" : undefined}
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
          </div>
        ))}

      {/* Formulario Crear / Editar (igual que Clientes) */}
      {tab !== "lista" && (
        <CrudFormFrame
          title={
            editando
              ? `✏️ Editar Producto — ${form.nombre || ""}`
              : "➕ Registrar Nuevo Producto"
          }
          size="modal-lg"
          onClose={() => cerrarFormulario()}
        >
          {renderFormulario(handleSubmit)}
        </CrudFormFrame>
      )}

      {/* Modal Detalle (solo lectura) - modal-card compacto */}
      {detalleModal && (
        <div className="modal-overlay" onClick={() => setDetalleModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">ℹ️</div>
            <h3>Detalle del producto</h3>
            {detalleLoading ? (
              <p className="message-success">Cargando detalle...</p>
            ) : detalleProducto ? (
              <div className="modal-detail-grid">
                <div className="form-group">
                  <label>Nombre</label>
                  <div className="readonly-field">{detalleProducto.nombre}</div>
                </div>
                <div className="form-group">
                  <label>Precio (₡)</label>
                  <div className="readonly-field">
                    {formatCRC(detalleProducto.precio)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <div className="readonly-field">
                    {detalleProducto.categoria_nombre ??
                      categorias.find(
                        (c) => c.id == detalleProducto.categoriaId,
                      )?.nombre ??
                      "—"}
                  </div>
                </div>
                <div className="form-group">
                  <label>Existencia actual</label>
                  <div className="readonly-field">
                    {detalleProducto.stock} {detalleProducto.unidadVenta}
                  </div>
                </div>
                <div className="form-group">
                  <label>Stock mínimo / máximo</label>
                  <div className="readonly-field">
                    {detalleProducto.stockMinimo ?? 0} / {detalleProducto.stockMaximo || "Sin máximo"}
                  </div>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <div className="readonly-field">
                    {detalleProducto.estado === "activo" ? "Activo" : "Inactivo"}
                  </div>
                </div>
                <div className="form-group">
                  <label>SKU / código interno</label>
                  <div className="readonly-field">
                    {detalleProducto.sku || "—"}
                  </div>
                </div>
                <div className="form-group">
                  <label>Código de barras</label>
                  <div className="readonly-field">{detalleProducto.codigo_barras || "—"}</div>
                </div>
                <div className="form-group">
                  <label>Marca / modelo</label>
                  <div className="readonly-field">
                    {[detalleProducto.marca, detalleProducto.modelo].filter(Boolean).join(" / ") || "—"}
                  </div>
                </div>
                <div className="form-group">
                  <label>Tamaño / talla</label>
                  <div className="readonly-field">{detalleProducto.talla || "—"}</div>
                </div>
                <div className="form-group">
                  <label>Último costo de compra</label>
                  <div className="readonly-field">
                    {detalleProducto.costo_compra == null ? "—" : formatCRC(detalleProducto.costo_compra)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Margen bruto estimado</label>
                  <div className="readonly-field">
                    {detalleProducto.costo_compra == null || Number(detalleProducto.cantidad_paquete) <= 0
                      ? "—"
                      : formatCRC(
                          Number(detalleProducto.precio) -
                            Number(detalleProducto.costo_compra) /
                              Number(detalleProducto.cantidad_paquete),
                        )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Impuesto / tarifa</label>
                  <div className="readonly-field">
                    {[detalleProducto.tipo_impuesto, detalleProducto.impuesto_tarifa == null ? null : `${detalleProducto.impuesto_tarifa}%`].filter(Boolean).join(" · ") || "Sin configurar"}
                  </div>
                </div>
                <div className="form-group">
                  <label>Tratamiento / CABYS</label>
                  <div className="readonly-field">
                    {[detalleProducto.tratamiento_tributario, detalleProducto.codigo_cabys].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="form-group">
                  <label>Proveedor principal</label>
                  <div className="readonly-field">
                    {proveedores.find((proveedor) => proveedor.id === detalleProducto.proveedor_id)?.nombre_comercial ||
                      proveedores.find((proveedor) => proveedor.id === detalleProducto.proveedor_id)?.nombre ||
                      "—"}
                  </div>
                </div>
                <div className="form-group">
                  <label>Presentación de compra</label>
                  <div className="readonly-field">
                    {detalleProducto.unidad_compra
                      ? `${detalleProducto.unidad_compra} × ${detalleProducto.cantidad_paquete} ${detalleProducto.unidad_venta}`
                      : "—"}
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Material</label>
                  <div className="readonly-field">
                    {[detalleProducto.material, detalleProducto.color].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Descripción</label>
                  <div className="readonly-field description-field">
                    {detalleProducto.descripcion || "—"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="message-error">
                No se pudo cargar el detalle del producto.
              </p>
            )}
            <div className="modal-actions modal-actions-small">
              <button
                className="btn-secondary"
                onClick={() => setDetalleModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar (igual que Clientes) */}
      {confirmId &&
        (() => {
          const producto = productos.find((p) => p.id === confirmId);
          return (
            <div className="modal-overlay" onClick={() => setConfirmId(null)}>
              <div
                className="modal-card modal-card-delete"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-icon">⚠️</div>
                <h3>¿Eliminar producto?</h3>
                <p>
                  Estás a punto de desactivar a{" "}
                  <strong className="modal-confirm-name">
                    {producto ? producto.nombre : ""}
                  </strong>
                  .
                  <br />
                  Esta acción no se puede deshacer y dejará el inventario en
                  cero para ese producto.
                </p>
                <div className="modal-actions modal-actions-compact">
                  <button
                    className="btn-secondary"
                    onClick={() => setConfirmId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-secondary btn-delete-modal"
                    onClick={() => handleEliminar(confirmId)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export default Productos;
