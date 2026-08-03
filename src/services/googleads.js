import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

const INGEST_URL = "https://datamanager.googleapis.com/v1/events:ingest";

function assertGoogleConfig() {
  const missing = [];
  if (!config.googleClientId) missing.push("GOOGLE_CLIENT_ID");
  if (!config.googleClientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!config.googleRefreshToken) missing.push("GOOGLE_REFRESH_TOKEN");
  if (!config.googleAdsCustomerId) missing.push("GOOGLE_ADS_CUSTOMER_ID");
  if (!config.googleConversionActionId) {
    missing.push("GOOGLE_CONVERSION_ACTION_ID");
  }
  if (missing.length) {
    const err = new Error(`Missing Google env: ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }
}

async function getAccessToken() {
  assertGoogleConfig();
  const client = new OAuth2Client(
    config.googleClientId,
    config.googleClientSecret,
  );
  client.setCredentials({ refresh_token: config.googleRefreshToken });
  const { token } = await client.getAccessToken();
  if (!token) {
    const err = new Error("Failed to refresh Google access token");
    err.status = 401;
    throw err;
  }
  return token;
}

/**
 * Upload one offline conversion via Data Manager API.
 * @param {{ gclid: string, saleAmount: number|null, conversionDateTime?: string|null, transactionId?: string|null, validateOnly?: boolean }} params
 */
export async function uploadOfflineConversion({
  gclid,
  saleAmount,
  conversionDateTime,
  transactionId,
  validateOnly = false,
}) {
  if (!gclid) {
    return {
      status: "skipped",
      reason: "No GCLID",
    };
  }

  const accessToken = await getAccessToken();

  const event = {
    adIdentifiers: { gclid },
    eventTimestamp:
      conversionDateTime || new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    eventSource: config.googleEventSource,
    currency: config.googleCurrency,
  };

  if (saleAmount != null && !Number.isNaN(Number(saleAmount))) {
    event.conversionValue = Number(saleAmount);
  }

  if (transactionId != null) {
    event.transactionId = String(transactionId);
  }

  const body = {
    destinations: [
      {
        operatingAccount: {
          accountType: "GOOGLE_ADS",
          accountId: config.googleAdsCustomerId,
        },
        loginAccount: {
          accountType: "GOOGLE_ADS",
          accountId: config.googleAdsCustomerId,
        },
        productDestinationId: config.googleConversionActionId,
      },
    ],
    events: [event],
    validateOnly: Boolean(validateOnly),
  };

  const response = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const err = new Error(
      `Data Manager API failed with status ${response.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
    err.status = response.status;
    err.body = data;
    err.requestBody = body;
    throw err;
  }

  return {
    status: validateOnly ? "validated" : "uploaded",
    request: body,
    response: data,
    requestId: data?.requestId || null,
  };
}
