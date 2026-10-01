/* ------------------------------------------------------------------ *
 * Regla de acumulación
 *
 * El límite y el monto de regalo se editan desde /api/admin/config,
 * así que viven en un objeto mutable en lugar de una constante.
 * ------------------------------------------------------------------ */

export const acumulacion = {
  activa: true,
  limite: 10000,
  montoRegalo: 1000,
  reiniciarCiclo: true,
  descripcion:
    "Cada $10.000 en compras, te acreditamos $1.000 de saldo a favor.",
};

/**
 * Evalúa la regla sobre el ciclo acumulado de un cliente y devuelve qué
 * hay que aplicar. La suma del excedente se conserva: si comprás $12.000
 * con un límite de $10.000, el ciclo reinicia en $2.000 y no se pierde.
 */
export function evaluarRegla(ciclo, regla = acumulacion) {
  const resultado = {
    regaloOtorgado: false,
    montoRegalo: 0,
    cicloRestante: ciclo,
    limiteAlcanzado: false,
  };

  if (!regla.activa || regla.limite <= 0) return resultado;
  if (ciclo < regla.limite) return resultado;

  resultado.regaloOtorgado = true;
  resultado.limiteAlcanzado = true;
  resultado.montoRegalo = regla.montoRegalo;
  resultado.cicloRestante = regla.reiniciarCiclo ? ciclo - regla.limite : 0;

  // Si una sola compra supera varios límites, se otorgan todos los que
  // correspondan y el ciclo queda con el remanente.
  if (regla.reiniciarCiclo && resultado.cicloRestante >= regla.limite) {
    const ciclosExtra = Math.floor(resultado.cicloRestante / regla.limite);
    resultado.montoRegalo += ciclosExtra * regla.montoRegalo;
    resultado.cicloRestante -= ciclosExtra * regla.limite;
  }

  return resultado;
}
