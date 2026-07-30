import { config } from "../config.js";

export async function getJobWithCustomer(jobId) {
  const url =
    `${config.leapBaseUrl}/jobs/${jobId}` +
    `includes[]=customer` +
    `includes[]=customer.custom_fields`;

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
    const err = new Error(
      `Leap API failed with status ${response.status} and message: ${data}`,
    );
    err.status = response.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function extractGclid(jobPayload) {
  const fields = jobPayload?.data?.customer?.custom_fields?.data || [];
  const gclidField = fields.find((f) => f.name === "GCLID");
  return gclidField?.value || null;
}
