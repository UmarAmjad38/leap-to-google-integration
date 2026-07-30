import { config } from "../config.js";

async function leapGet(path) {
  const url = `${config.leapBaseUrl}${path}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.leapApiToken}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail =
      typeof data === "string" ? data : JSON.stringify(data);
    const err = new Error(
      `Leap API failed with status ${response.status}: ${detail}`,
    );
    err.status = response.status;
    err.body = data;
    throw err;
  }

  return data;
}

export async function getJobWithCustomer(jobId) {
  const qs = new URLSearchParams();
  qs.append("includes[]", "customer");
  qs.append("includes[]", "customer.custom_fields");
  qs.append("includes[]", "custom_fields");
  return leapGet(`/jobs/${jobId}?${qs.toString()}`);
}

export async function getFinancialSummary(jobId) {
  return leapGet(`/jobs/${jobId}/financial_summary`);
}

export function extractGclid(jobPayload) {
  const fields = jobPayload?.data?.customer?.custom_fields?.data || [];
  const gclidField =
    fields.find((f) => f.name === "GCLID") ||
    fields.find((f) => String(f.id) === "17604");
  return gclidField?.value || null;
}

export function extractSaleAmount(financialPayload) {
  const data = financialPayload?.data || financialPayload || {};
  const amount =
    data.final_job_total ??
    data.total_job_price ??
    data.total ??
    null;
  return amount == null ? null : Number(amount);
}
