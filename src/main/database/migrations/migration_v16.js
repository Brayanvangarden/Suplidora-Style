function up(db) {
  const existing = new Set(
    db.prepare("PRAGMA table_info(productos)").all().map(({ name }) => name),
  );
  const additions = [
    ["codigo_barras", "TEXT"],
    ["marca", "TEXT"],
    ["modelo", "TEXT"],
    ["talla", "TEXT"],
    ["unidad_venta", "TEXT NOT NULL DEFAULT 'unidad' CHECK(trim(unidad_venta) <> '')"],
    ["stock_maximo", "REAL CHECK(stock_maximo IS NULL OR stock_maximo >= 0)"],
    ["costo_compra", "REAL CHECK(costo_compra IS NULL OR costo_compra >= 0)"],
    ["tipo_impuesto", "TEXT"],
    ["impuesto_tarifa", "REAL CHECK(impuesto_tarifa IS NULL OR impuesto_tarifa BETWEEN 0 AND 100)"],
    ["tratamiento_tributario", "TEXT"],
    ["codigo_cabys", "TEXT"],
    ["proveedor_id", "INTEGER REFERENCES proveedores(id) ON DELETE SET NULL"],
    ["codigo_producto_proveedor", "TEXT"],
    ["unidad_compra", "TEXT"],
  ];

  for (const [name, definition] of additions) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE productos ADD COLUMN ${name} ${definition}`);
    }
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS productos_sku_normalizado_activo_unique
      ON productos(lower(trim(sku)))
      WHERE estado = 'activo' AND trim(sku) <> '';
    CREATE UNIQUE INDEX IF NOT EXISTS productos_codigo_barras_unique
      ON productos(lower(trim(codigo_barras)))
      WHERE trim(codigo_barras) <> '';
    CREATE INDEX IF NOT EXISTS productos_proveedor_idx
      ON productos(proveedor_id);
  `);
}

function down() {}

module.exports = { up, down };
