const { getDb } = require('../db')

function getAll() {
  return getDb()
    .prepare(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.nombre ASC
    `)
    .all()
}

function getById(id) {
  return getDb()
    .prepare(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ?
    `)
    .get(id)
}

function registrarMovimientoInventario(productoId, tipo, cantidad, observaciones = null, usuarioId = null) {
  return getDb().prepare(`
    INSERT INTO movimientos_inventario
      (producto_id, tipo, cantidad, observaciones, usuario_id)
    VALUES
      (?, ?, ?, ?, ?)
  `).run(productoId, tipo, cantidad, observaciones, usuarioId)
}

function validarUnicidad(data, id = null) {
  const codigoBarrasNormalizado = String(data.codigo_barras ?? "").trim().toLowerCase()
  if (codigoBarrasNormalizado) {
    const duplicado = getDb()
      .prepare(`
        SELECT id FROM productos
        WHERE id <> COALESCE(?, -1)
          AND lower(trim(COALESCE(codigo_barras, ''))) = ?
          AND trim(COALESCE(codigo_barras, '')) <> ''
        LIMIT 1
      `)
      .get(id, codigoBarrasNormalizado)
    if (duplicado) {
      throw new Error(`Ya existe un producto con el código de barras "${data.codigo_barras.trim()}".`)
    }
  }
  if (data.estado !== "activo") return;

  const existentes = getDb()
    .prepare("SELECT id, nombre, sku FROM productos WHERE estado = 'activo'")
    .all()
  const nombreNormalizado = String(data.nombre ?? "").trim().toLowerCase()
  const skuNormalizado = String(data.sku ?? "").trim().toLowerCase()
  const otros = existentes.filter((producto) => producto.id !== id)

  if (otros.some((producto) => String(producto.nombre ?? "").trim().toLowerCase() === nombreNormalizado)) {
    throw new Error(`Ya existe un producto con el nombre "${data.nombre.trim()}".`)
  }
  if (otros.some((producto) => String(producto.sku ?? "").trim().toLowerCase() === skuNormalizado)) {
    throw new Error(`Ya existe un producto con el SKU "${data.sku.trim()}".`)
  }
}

function validarReferencias(data) {
  const db = getDb()
  if (data.categoria_id != null) {
    const categoria = db.prepare("SELECT id FROM categorias WHERE id = ?").get(data.categoria_id)
    if (!categoria) throw new Error("La categoría seleccionada no existe.")
  }
  if (data.proveedor_id != null) {
    const proveedor = db.prepare("SELECT id FROM proveedores WHERE id = ?").get(data.proveedor_id)
    if (!proveedor) throw new Error("El proveedor seleccionado no existe.")
  }
}

function create(data) {
  const db = getDb()
  validarUnicidad(data)
  validarReferencias(data)
  const transaction = db.transaction(() => {
    const { usuario_id, ...productoData } = data
    const result = db.prepare(`
      INSERT INTO productos
        (nombre, categoria_id, cantidad, cantidad_paquete,
         numero_lote, cantidad_lote, precio_unitario, costo_compra,
         stock_minimo, stock_maximo, unidad_venta, material, color, marca,
         modelo, talla, codigo_barras, tipo_impuesto, impuesto_tarifa,
         tratamiento_tributario, codigo_cabys, proveedor_id,
         codigo_producto_proveedor, unidad_compra,
         sku, estado, notas)
      VALUES
        (@nombre, @categoria_id, @cantidad, @cantidad_paquete,
         @numero_lote, @cantidad_lote, @precio_unitario, @costo_compra,
         @stock_minimo, @stock_maximo, @unidad_venta, @material, @color, @marca,
         @modelo, @talla, @codigo_barras, @tipo_impuesto, @impuesto_tarifa,
         @tratamiento_tributario, @codigo_cabys, @proveedor_id,
         @codigo_producto_proveedor, @unidad_compra,
         @sku, @estado, @notas)
    `).run(productoData)
    const producto = getById(result.lastInsertRowid)

    if (producto && Number(producto.cantidad || 0) > 0) {
      registrarMovimientoInventario(
        producto.id,
        'entrada',
        Number(producto.cantidad),
        `Creación de producto con stock inicial: ${producto.nombre}`,
        usuario_id ?? null,
      )
    }

    return producto
  })

  return transaction()
}

function update(id, data) {
  if (!getById(id)) throw new Error("Producto no encontrado.")
  validarUnicidad(data, id)
  validarReferencias(data)
  const { usuario_id, ...productoData } = data
  delete productoData.cantidad
  getDb().prepare(`
    UPDATE productos SET
      nombre            = @nombre,
      categoria_id      = @categoria_id,
      cantidad_paquete  = @cantidad_paquete,
      numero_lote       = @numero_lote,
      cantidad_lote     = @cantidad_lote,
      precio_unitario   = @precio_unitario,
      costo_compra      = @costo_compra,
      stock_minimo      = @stock_minimo,
      stock_maximo      = @stock_maximo,
      unidad_venta      = @unidad_venta,
      material          = @material,
      color             = @color,
      marca             = @marca,
      modelo            = @modelo,
      talla             = @talla,
      codigo_barras     = @codigo_barras,
      tipo_impuesto     = @tipo_impuesto,
      impuesto_tarifa   = @impuesto_tarifa,
      tratamiento_tributario = @tratamiento_tributario,
      codigo_cabys      = @codigo_cabys,
      proveedor_id      = @proveedor_id,
      codigo_producto_proveedor = @codigo_producto_proveedor,
      unidad_compra     = @unidad_compra,
      sku               = @sku,
      estado            = @estado,
      notas             = @notas,
      actualizado       = datetime('now')
    WHERE id = @id
  `).run({ ...productoData, id })

  return getById(id)
}

function remove(id, usuarioId = null) {
  const producto = getById(id)
  const cantidadActual = Number(producto?.cantidad ?? 0)

  if (producto && cantidadActual > 0) {
    registrarMovimientoInventario(
      id,
      'salida',
      cantidadActual,
      `Eliminación de producto: ${producto.nombre}`,
      usuarioId,
    )
  }

  return getDb()
    .prepare(`UPDATE productos SET cantidad = 0, estado = 'inactivo',
              actualizado = datetime('now') WHERE id = ?`)
    .run(id)
}

function getStockBajo() {
  return getDb()
    .prepare(`
      SELECT * FROM productos
      WHERE cantidad <= stock_minimo
        AND estado = 'activo'
      ORDER BY cantidad ASC
    `)
    .all()
}

module.exports = { getAll, getById, create, update, remove, getStockBajo }
