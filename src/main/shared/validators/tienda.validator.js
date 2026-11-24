const { z } = require("zod");

const textoRequerido = (max) => z.string().trim().min(1).max(max);
const textoOpcional = (max) => z.string().trim().max(max).default("");

const tiendaSchema = z
  .object({
    nombre_comercial: textoRequerido(160),
    nombre_titular: textoRequerido(160),
    tipo_titular: textoRequerido(60),
    tipo_identificacion: textoRequerido(60),
    numero_identificacion: textoRequerido(40),
    actividad_economica: textoRequerido(40),
    regimen_tributario: textoRequerido(100),
    telefono: textoRequerido(40),
    correo: z.string().trim().email("El correo electrónico no es válido").max(160),
    pais: textoRequerido(100),
    provincia: textoRequerido(100),
    canton: textoRequerido(100),
    distrito: textoOpcional(100),
    direccion: textoRequerido(300),
    ubicacion_referencia: textoOpcional(200),
    acepta_efectivo: z.boolean(),
    acepta_sinpe: z.boolean(),
    acepta_tarjeta: z.boolean(),
    moneda_codigo: z.literal("CRC").default("CRC"),
    simbolo_moneda: z.literal("₡").default("₡"),
  })
  .refine(
    (tienda) =>
      tienda.acepta_efectivo || tienda.acepta_sinpe || tienda.acepta_tarjeta,
    {
      message: "Debe mantenerse al menos un método de pago habilitado",
      path: ["acepta_efectivo"],
    },
  );

function validarTienda(data) {
  const resultado = tiendaSchema.safeParse(data);
  if (!resultado.success) {
    const primerError = resultado.error.issues[0];
    return {
      ok: false,
      message: primerError?.message ?? "Datos de la tienda inválidos",
    };
  }
  return { ok: true, data: resultado.data };
}

module.exports = { tiendaSchema, validarTienda };
