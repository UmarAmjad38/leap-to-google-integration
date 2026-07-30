import { Router } from "express";
import { config } from "../config.js";
import { getJobWithCustomer, extractGclid } from "../services/leap.js";
import { log, error } from "../utils/logger.js";

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

  // Always reply fast so Leap/ngrok don't timeout
  res.status(200).json({ received: true });

  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const event of events) {
    try {
      if (!isSoldStageChange(event)) {
        log("Skipping event (not sold stage change):", {
          action: event?.action,
          operation: event?.operation,
          stage: event?.stage_moved_to?.name,
        });
        continue;
      }

      const jobId = event.id;
      log("Sold stage detected. Fetching job:", jobId);

      const jobPayload = await getJobWithCustomer(jobId);
      const gclid = extractGclid(jobPayload);

      log("Job fetched:", {
        jobId,
        jobName: jobPayload?.data?.name,
        awardedDate: jobPayload?.data?.awarded_date,
        gclid,
      });

      // Google Ads upload comes in a later step
    } catch (err) {
      error("Failed processing event:", {
        message: err.message,
        status: err.status,
        body: err.body,
      });
    }
  }
});

export default router;
