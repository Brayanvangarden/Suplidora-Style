PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ════════════════════════════════════════
--  USUARIOS Y ROLES
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT    NOT NULL,
  usuario       TEXT    NOT NULL UNIQUE,
  correo        TEXT    NOT NULL DEFAULT '',
  password      TEXT    NOT NULL,
  rol           TEXT    NOT NULL CHECK(rol IN ('admin', 'vendedor')),
  comision_porcentaje REAL NOT NULL DEFAULT 0
                    CHECK(comision_porcentaje BETWEEN 0 AND 100),
  estado        TEXT    NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until  TEXT,
  reset_code    TEXT,
  reset_expires TEXT,
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now')),
  actualizado   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════
--  CATEGORÍAS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categorias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL UNIQUE,
  descripcion TEXT,
  estado      TEXT    NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
  creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════
--  PRODUCTOS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS productos (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre              TEXT    NOT NULL,
  categoria_id        INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  cantidad            REAL    NOT NULL DEFAULT 0,
  cantidad_paquete    REAL    NOT NULL DEFAULT 1,
  numero_lote         TEXT,
  cantidad_lote       REAL    DEFAULT 0,
  precio_unitario     REAL    NOT NULL DEFAULT 0,
  stock_minimo        REAL    NOT NULL DEFAULT 0,
  material            TEXT,
  color               TEXT,
  sku                 TEXT    NOT NULL,
  estado              TEXT    NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
  notas               TEXT,
  creado_en           TEXT    NOT NULL DEFAULT (datetime('now')),
  actualizado         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════
--  MOVIMIENTOS DE INVENTARIO
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id   INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo          TEXT    NOT NULL CHECK(tipo IN ('entrada', 'salida')),
  cantidad      REAL    NOT NULL,
  observaciones TEXT,
  usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════
--  CLIENTES
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clientes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa          TEXT,
  nombre           TEXT    NOT NULL,
  tipo_cliente     TEXT    NOT NULL DEFAULT 'otro'
                   CHECK(tipo_cliente IN ('persona_fisica', 'persona_juridica', 'extranjero', 'otro')),
  tipo_identificacion TEXT NOT NULL DEFAULT 'otro'
                   CHECK(tipo_identificacion IN ('cedula_fisica', 'cedula_juridica', 'dimex', 'nite', 'otro')),
  numero_identificacion TEXT NOT NULL DEFAULT '',
  telefono         TEXT    NOT NULL DEFAULT '',
  telefono_secundario TEXT NOT NULL DEFAULT '',
  correo           TEXT    NOT NULL DEFAULT '',
  correo_facturacion TEXT NOT NULL DEFAULT '',
  persona_contacto TEXT    NOT NULL DEFAULT '',
  direccion        TEXT    NOT NULL DEFAULT '',
  provincia        TEXT    NOT NULL DEFAULT '',
  canton           TEXT    NOT NULL DEFAULT '',
  distrito         TEXT    NOT NULL DEFAULT '',
  barrio           TEXT    NOT NULL DEFAULT '',
  codigo_postal    TEXT    NOT NULL DEFAULT '',
  actividad_economica TEXT NOT NULL DEFAULT '',
  codigo_actividad_economica TEXT NOT NULL DEFAULT '',
  requiere_factura_electronica INTEGER NOT NULL DEFAULT 0
                   CHECK(requiere_factura_electronica IN (0, 1)),
  notas            TEXT,
  balance_pendiente     REAL    NOT NULL DEFAULT 0,
  tiene_descuento       INTEGER NOT NULL DEFAULT 0 CHECK(tiene_descuento IN (0, 1)),
  descuento_porcentaje  REAL    NOT NULL DEFAULT 0,
  estado           TEXT    NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
  creado_en        TEXT    NOT NULL DEFAULT (datetime('now')),
  actualizado      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ════════════════════════════════════════
--  PRECIOS ESPECIALES POR CLIENTE
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clientes_precios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  precio_unitario REAL    NOT NULL DEFAULT 0,
  creado_en       TEXT    NOT NULL DEFAULT (datetime('now')),
  actualizado     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(cliente_id, producto_id)
);

-- ════════════════════════════════════════
--  ÓRDENES
-- ════════════════════════════════
CREATE TABLE IF NOT EXISTS ordenes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  ship_to_cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  ship_to_nombre  TEXT,
  ship_to_empresa TEXT,
  ship_to_direccion TEXT,
  ship_to_telefono TEXT,
  ship_to_correo  TEXT,
  fecha_creacion  TEXT    NOT NULL DEFAULT (datetime('now')),
  fecha_entrega   TEXT,
  estado          TEXT    NOT NULL DEFAULT 'pendiente'
                    CHECK(estado IN ('pendiente','en_proceso','completada','procesada','cancelada')),
  estado_pago     TEXT    NOT NULL DEFAULT 'pendiente'
                    CHECK(estado_pago IN ('pendiente','parcial','pagado')),
  total           REAL    NOT NULL DEFAULT 0,
  descuento_orden_porcentaje REAL NOT NULL DEFAULT 0,
  notas           TEXT,
  usuario_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  vendedor_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ════════════════════════════════════════
--  DETALLE DE ÓRDENES
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ordenes_detalle (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id        INTEGER NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad        REAL    NOT NULL,
  precio_unitario REAL    NOT NULL,
  subtotal        REAL    NOT NULL
);

-- ════════════════════════════════════════
--  PAGOS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pagos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id  INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  orden_id    INTEGER REFERENCES ordenes(id) ON DELETE SET NULL,
  monto       REAL    NOT NULL,
  tipo_pago   TEXT    NOT NULL DEFAULT 'abono' CHECK(tipo_pago IN ('pago_total','abono')),
  metodo_pago TEXT    NOT NULL CHECK(
    metodo_pago IN ('efectivo','cheque','datafono','sinpe_movil','transferencia','sinpe','otro')
  ),
  fecha_pago  TEXT    NOT NULL DEFAULT (datetime('now')),
  notas       TEXT,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ════════════════════════════════════════
--  FACTURAS
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS facturas (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_factura        TEXT NOT NULL UNIQUE,
  orden_id              INTEGER NOT NULL UNIQUE REFERENCES ordenes(id) ON DELETE RESTRICT,
  pago_id               INTEGER NOT NULL UNIQUE REFERENCES pagos(id) ON DELETE RESTRICT,
  cliente_id            INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  ship_to_cliente_id    INTEGER,
  ship_to_nombre        TEXT,
  ship_to_empresa       TEXT,
  ship_to_direccion     TEXT,
  ship_to_telefono      TEXT,
  ship_to_correo        TEXT,
  fecha_emision         TEXT NOT NULL DEFAULT (datetime('now')),
  estado                TEXT NOT NULL DEFAULT 'emitida' CHECK(estado IN ('emitida','anulada')),
  empresa_nombre        TEXT NOT NULL,
  empresa_nombre_comercial TEXT NOT NULL,
  empresa_identificacion TEXT NOT NULL,
  empresa_direccion     TEXT NOT NULL,
  empresa_telefono      TEXT NOT NULL,
  empresa_correo        TEXT NOT NULL,
  cliente_nombre        TEXT NOT NULL,
  cliente_identificacion TEXT,
  cliente_correo        TEXT,
  cliente_telefono      TEXT,
  cliente_direccion     TEXT,
  orden_fecha           TEXT NOT NULL,
  metodo_pago           TEXT NOT NULL,
  estado_pago           TEXT NOT NULL,
  subtotal              REAL NOT NULL DEFAULT 0,
  descuentos            REAL NOT NULL DEFAULT 0,
  impuestos             REAL NOT NULL DEFAULT 0,
  total                 REAL NOT NULL DEFAULT 0,
  monto_pagado          REAL NOT NULL DEFAULT 0,
  saldo                 REAL NOT NULL DEFAULT 0,
  notas                 TEXT
);

CREATE TABLE IF NOT EXISTS facturas_detalle (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  factura_id        INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id       INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  codigo_producto   TEXT,
  descripcion       TEXT NOT NULL,
  cantidad          REAL NOT NULL,
  precio_unitario   REAL NOT NULL,
  descuento         REAL NOT NULL DEFAULT 0,
  impuesto          REAL NOT NULL DEFAULT 0,
  subtotal          REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS comisiones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id        INTEGER NOT NULL UNIQUE REFERENCES ordenes(id) ON DELETE RESTRICT,
  factura_id      INTEGER NOT NULL UNIQUE REFERENCES facturas(id) ON DELETE RESTRICT,
  vendedor_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  base            REAL    NOT NULL CHECK(base >= 0),
  porcentaje      REAL    NOT NULL CHECK(porcentaje BETWEEN 0 AND 100),
  monto           REAL    NOT NULL CHECK(monto >= 0),
  fecha_creacion  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comisiones_vendedor ON comisiones(vendedor_id);

CREATE TABLE IF NOT EXISTS pagos_comisiones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  vendedor_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  monto           REAL    NOT NULL CHECK(monto > 0),
  metodo_pago     TEXT    NOT NULL
                    CHECK(metodo_pago IN ('efectivo','datafono','sinpe_movil')),
  fecha_pago      TEXT    NOT NULL DEFAULT (datetime('now')),
  notas           TEXT,
  admin_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pagos_comisiones_vendedor
  ON pagos_comisiones(vendedor_id, fecha_pago);

-- ════════════════════════════════════════
--  HISTORIAL DE MOVIMIENTOS (LOG)
-- ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS historial (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT    NOT NULL,
  modulo      TEXT    NOT NULL,
  descripcion TEXT    NOT NULL,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha       TEXT    NOT NULL DEFAULT (datetime('now'))
);
