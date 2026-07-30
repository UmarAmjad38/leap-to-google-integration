/**
 * Google Ads offline conversion upload (Data Manager API) — next step.
 * For now the webhook returns gclid + saleAmount in the HTTP response.
 */
export async function uploadOfflineConversion({ gclid, saleAmount, conversionDateTime }) {
  return {
    status: "not_implemented",
    gclid,
    saleAmount,
    conversionDateTime,
  };
}
