import type { SaleUnit } from "@/types/domain";

export const WEIGHT_PRECISION = 3;
export const WEIGHT_STEP_KG = 0.05;

export const isWeightedUnit = (unit: SaleUnit) => unit === "kg";

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const roundQuantity = (value: number, unit: SaleUnit) => {
  if (!Number.isFinite(value)) return 0;
  return isWeightedUnit(unit)
    ? Math.round((value + Number.EPSILON) * 10 ** WEIGHT_PRECISION) / 10 ** WEIGHT_PRECISION
    : Math.round(value);
};

export const hasAtMostThreeDecimals = (value: number) =>
  Number.isFinite(value) && Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7;

export const formatQuantity = (quantity: number, unit: SaleUnit) => {
  if (isWeightedUnit(unit)) {
    if (quantity < 1) return `${Math.round(quantity * 1000)} g`;
    return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(quantity)} kg`;
  }

  const labels: Record<Exclude<SaleUnit, "kg">, [string, string]> = {
    medio_kg: ["medio kilo", "medios kilos"],
    pieza: ["pieza", "piezas"],
    paquete: ["paquete", "paquetes"],
    charola: ["charola", "charolas"],
  };
  const [singular, plural] = labels[unit];
  return `${quantity} ${quantity === 1 ? singular : plural}`;
};
