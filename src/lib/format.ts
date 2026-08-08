export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const safePath = (value: string | null, fallback = "/") =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
