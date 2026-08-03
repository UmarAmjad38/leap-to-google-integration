import { Router } from "express";
import { config } from "../config.js";
import {
  getJobWithCustomer,
  getFinancialSummary,
  extractGclid,
  extractSaleAmount,
} from "../services/leap.js";
import { uploadOfflineConversion } from "../services/googleads.js";
import { log, error } from "../utils/logger.js";

function toConversionTimestamp(value) {
  if (!value) return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const router = Router();

function isSoldStageChange(event) {
  return (
    event?.action === "jobs" &&
    event?.operation === "stage_change" &&
    event?.stage_moved_to?.name === config.soldStageName
  );
}

router.post("/", async (req, res) => {
  const secret = req.query.key || req.headers["x-webhook-secret"];

  if (!config.webhookSecret || secret !== config.webhookSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!config.leapApiToken) {
    return res.status(500).json({
      error: "LEAP_API_TOKEN is not set on this server",
    });
  }

  const events = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];

  for (const event of events) {
    const base = {
      action: event?.action,
      operation: event?.operation,
      jobId: event?.id ?? null,
      stage: event?.stage_moved_to?.name ?? null,
      webhookEvent: event,
    };

    if (!isSoldStageChange(event)) {
      results.push({
        ...base,
        skipped: true,
        reason: `Not a sold stage change (expected "${config.soldStageName}")`,
      });
      continue;
    }

    const jobId = event.id;
    log("Sold stage detected. Fetching job:", jobId);

    try {
      const jobPayload = await getJobWithCustomer(jobId);
      const gclid = extractGclid(jobPayload);

      let financialPayload = null;
      let saleAmount = null;
      let financialError = null;

      try {
        financialPayload = await getFinancialSummary(jobId);
        saleAmount = extractSaleAmount(financialPayload);
      } catch (finErr) {
        financialError = {
          message: finErr.message,
          status: finErr.status ?? null,
          body: finErr.body ?? null,
        };
      }

      const customer = jobPayload?.data?.customer || null;
      const awardedDate = jobPayload?.data?.awarded_date ?? null;
      const conversionDateTime = toConversionTimestamp(awardedDate);

      let googleAds = null;
      try {
        googleAds = await uploadOfflineConversion({
          gclid,
          saleAmount,
          conversionDateTime,
          transactionId: `leap-job-${jobId}`,
          validateOnly: req.query.validateOnly === "1",
        });
        log("Google Ads upload result:", {
          jobId,
          gclid,
          status: googleAds.status,
          requestId: googleAds.requestId, // PROOF OF DELIVERY
        });
      } catch (googleErr) {
        error("Google Ads upload failed:", {
          message: googleErr.message,
          status: googleErr.status,
          body: googleErr.body,
        });
        googleAds = {
          status: "error",
          message: googleErr.message,
          statusCode: googleErr.status ?? null,
          body: googleErr.body ?? null,
          requestBody: googleErr.requestBody ?? null,
        };
      }

      results.push({
        ...base,
        skipped: false,
        ok: true,
        gclid,
        saleAmount,
        conversionDateTime,
        job: {
          id: jobPayload?.data?.id ?? jobId,
          number: jobPayload?.data?.number ?? null,
          name: jobPayload?.data?.name ?? null,
          awarded_date: awardedDate,
          current_stage: jobPayload?.data?.current_stage ?? null,
        },
        customer: customer
          ? {
              id: customer.id ?? customer?.data?.id ?? null,
              first_name:
                customer.first_name ?? customer?.data?.first_name ?? null,
              last_name:
                customer.last_name ?? customer?.data?.last_name ?? null,
              email: customer.email ?? customer?.data?.email ?? null,
              custom_fields:
                customer.custom_fields ?? customer?.data?.custom_fields ?? null,
            }
          : null,
        jobPayload,
        financialPayload,
        financialError,
        googleAds,
      });
    } catch (err) {
      error("Failed processing event:", {
        message: err.message,
        status: err.status,
        body: err.body,
      });
      results.push({
        ...base,
        skipped: false,
        ok: false,
        error: {
          message: err.message,
          status: err.status ?? null,
          body: err.body ?? null,
        },
      });
    }
  }

  return res.status(200).json({
    received: true,
    tokenPresent: Boolean(config.leapApiToken),
    tokenLength: config.leapApiToken.length,
    soldStageName: config.soldStageName,
    results,
  });
});

export default router;
