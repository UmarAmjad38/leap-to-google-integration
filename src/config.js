import "dotenv/config";

function cleanCustomerId(id) {
  return String(id || "").replace(/-/g, "").trim();
}

export const config = {
  port: Number(process.env.PORT || 3000),
  webhookSecret: process.env.WEBHOOK_SECRET || "",
  leapApiToken: process.env.LEAP_API_TOKEN || "",
  leapBaseUrl:
    process.env.LEAP_BASE_URL ||
    process.env.LEAP_URL ||
    "https://api.jobprogress.com/api/v3",
  soldStageName: process.env.SOLD_STAGE_NAME || "Contract Paperwork",

  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  googleAdsCustomerId: cleanCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID),
  googleConversionActionId: String(
    process.env.GOOGLE_CONVERSION_ACTION_ID || "",
  ).trim(),
  googleCurrency: process.env.GOOGLE_CURRENCY || "USD",
  googleEventSource: process.env.GOOGLE_EVENT_SOURCE || "WEB",
};
