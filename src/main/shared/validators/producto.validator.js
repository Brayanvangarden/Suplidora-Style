const { z } = require("zod");

const numeroNoNegativo = z.coerce
	.number()
	.finite("El valor debe ser un número válido")
	.min(0, "El valor no puede ser negativo");

const numeroOpcional = (max = Infinity) => z.preprocess(
	(value) => (value === "" || value == null ? null : value),
	z.union([
		z.null(),
		z.coerce.number()
			.finite("El valor debe ser un número válido")
			.min(0, "El valor no puede ser negativo")
			.max(max, `El valor no puede superar ${max}`),
	]),
);

const textoOpcional = (max) => z.preprocess(
	(value) => (value == null || value === "" ? null : value),
	z.union([z.null(), z.string().trim().max(max)]),
);

const idOpcional = z.preprocess(
	(value) => (value === "" || value == null ? null : value),
	z.union([z.null(), z.coerce.number().int().positive()]),
);

const productoSchema = z.object({
	nombre: z.string().trim().min(1, "El nombre es obligatorio").max(200),
	categoria_id: idOpcional.default(null),
	cantidad: numeroNoNegativo.optional().default(0),
	cantidad_paquete: z.coerce.number()
		.finite("El factor de conversión debe ser un número válido")
		.positive("El factor de conversión debe ser mayor que cero")
		.optional()
		.default(1),
	numero_lote: textoOpcional(100),
	cantidad_lote: numeroNoNegativo.optional().default(0),
	precio_unitario: numeroNoNegativo.optional().default(0),
	costo_compra: numeroOpcional(),
	stock_minimo: numeroNoNegativo.optional().default(0),
	stock_maximo: numeroOpcional(),
	unidad_venta: z.string().trim().min(1, "La unidad de venta es obligatoria").max(30).default("unidad"),
	material: textoOpcional(100),
	color: textoOpcional(100),
	marca: textoOpcional(100),
	modelo: textoOpcional(100),
	talla: textoOpcional(50),
	codigo_barras: textoOpcional(100),
	tipo_impuesto: textoOpcional(50),
	impuesto_tarifa: numeroOpcional(100),
	tratamiento_tributario: textoOpcional(100),
	codigo_cabys: textoOpcional(20),
	proveedor_id: idOpcional.default(null),
	codigo_producto_proveedor: textoOpcional(100),
	unidad_compra: textoOpcional(50),
	sku: z.string().trim().min(1, "El SKU es obligatorio").max(200),
	estado: z.enum(["activo", "inactivo"]).optional().default("activo"),
	notas: z.string().trim().max(2000).optional().default(""),
	usuario_id: z.coerce.number().int().nullable().optional().default(null),
}).superRefine((producto, context) => {
	if (producto.stock_maximo != null && producto.stock_maximo < producto.stock_minimo) {
		context.addIssue({
			code: "custom",
			path: ["stock_maximo"],
			message: "El stock máximo no puede ser menor que el stock mínimo",
		});
	}
});

function validarProducto(data) {
	const resultado = productoSchema.safeParse(data);
	if (!resultado.success) {
		const primerError = resultado.error.issues[0];
		return { ok: false, message: primerError?.message ?? "Datos inválidos" };
	}

	return { ok: true, data: resultado.data };
}

function validarProductoImport(data) {
	return validarProducto(data);
}

module.exports = { productoSchema, validarProducto, validarProductoImport };
