const normalizeProductoFromDb = (producto) => ({
  ...producto,
  precio: producto.precio_unitario,
  stock: producto.cantidad,
  stockMinimo: producto.stock_minimo,
  categoriaId: producto.categoria_id,
  descripcion: producto.notas ?? '',
  sku: producto.sku ?? '',
  costoCompra: producto.costo_compra ?? '',
  stockMaximo: producto.stock_maximo ?? '',
  unidadVenta: producto.unidad_venta ?? 'unidad',
  codigoBarras: producto.codigo_barras ?? '',
  marca: producto.marca ?? '',
  modelo: producto.modelo ?? '',
  talla: producto.talla ?? '',
  tipoImpuesto: producto.tipo_impuesto ?? '',
  impuestoTarifa: producto.impuesto_tarifa ?? '',
  tratamientoTributario: producto.tratamiento_tributario ?? '',
  codigoCabys: producto.codigo_cabys ?? '',
  proveedorId: producto.proveedor_id ?? '',
  codigoProductoProveedor: producto.codigo_producto_proveedor ?? '',
  unidadCompra: producto.unidad_compra ?? '',
  factorConversion: Number(producto.cantidad_paquete) > 0 ? producto.cantidad_paquete : 1,
})

const mapProductoToDb = (data, includeStock = true) => ({
  nombre: data.nombre,
  categoria_id: data.categoriaId || null,
  ...(includeStock ? { cantidad: data.stock ?? 0 } : {}),
  cantidad_paquete: data.factorConversion ?? data.cantidad_paquete ?? 1,
  ...(data.numero_lote !== undefined ? { numero_lote: data.numero_lote ?? null } : {}),
  ...(data.cantidad_lote !== undefined ? { cantidad_lote: data.cantidad_lote ?? 0 } : {}),
  precio_unitario: data.precio ?? 0,
  costo_compra: data.costoCompra === '' ? null : data.costoCompra ?? null,
  stock_minimo: data.stockMinimo ?? 0,
  stock_maximo: data.stockMaximo === '' ? null : data.stockMaximo ?? null,
  unidad_venta: data.unidadVenta ?? 'unidad',
  material: data.material ?? null,
  color: data.color ?? null,
  marca: data.marca ?? null,
  modelo: data.modelo ?? null,
  talla: data.talla ?? null,
  codigo_barras: data.codigoBarras ?? null,
  tipo_impuesto: data.tipoImpuesto ?? null,
  impuesto_tarifa: data.impuestoTarifa === '' ? null : data.impuestoTarifa ?? null,
  tratamiento_tributario: data.tratamientoTributario ?? null,
  codigo_cabys: data.codigoCabys ?? null,
  proveedor_id: data.proveedorId || null,
  codigo_producto_proveedor: data.codigoProductoProveedor ?? null,
  unidad_compra: data.unidadCompra ?? null,
  sku: String(data.sku ?? '').trim(),
  estado: data.estado ?? 'activo',
  notas: data.descripcion ?? '',
  usuario_id: data.usuario_id ?? null,
})

const normalizeList = (productos = []) => productos.map(normalizeProductoFromDb)

export const productosService = {

  importBulk: async (filas) => {
    const payload = filas.map(mapProductoToDb)
    const res = await window.api.productos.importBulk(payload)
    if (!res.ok) throw new Error(res.message)
    return res.data
  },

  getAll: async () => {
    const res = await window.api.productos.getAll()
    if (!res.ok) throw new Error(res.message)
    return normalizeList(res.data)
  },

  getById: async (id) => {
    const res = await window.api.productos.getById(id)
    if (!res.ok) throw new Error(res.message)
    return normalizeProductoFromDb(res.data)
  },

  create: async (data) => {
    const res = await window.api.productos.create(mapProductoToDb(data))
    if (!res.ok) throw new Error(res.message)
    return normalizeProductoFromDb(res.data)
  },

  update: async (data) => {
    const res = await window.api.productos.update({ ...data, ...mapProductoToDb(data, false) })
    if (!res.ok) throw new Error(res.message)
    return normalizeProductoFromDb(res.data)
  },

  delete: async (id, usuarioId = null) => {
    const res = await window.api.productos.delete({ id, usuario_id: usuarioId })
    if (!res.ok) throw new Error(res.message)
    return res
  },

  getStockBajo: async () => {
    const res = await window.api.productos.stockBajo()
    if (!res.ok) throw new Error(res.message)
    return normalizeList(res.data)
  },

}
