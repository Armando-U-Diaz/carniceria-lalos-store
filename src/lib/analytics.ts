type AnalyticsEvent =
  | "view_item"
  | "search"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag || !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return;
  window.gtag("event", event, params);
}
