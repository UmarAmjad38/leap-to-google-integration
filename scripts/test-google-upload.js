import { uploadOfflineConversion } from "../src/services/googleads.js";
import { log, error } from "../src/utils/logger.js";
import "dotenv/config";

async function run() {
  const gclid = "CjwKCAjwmozTBhAeEiwAkEGZzh9PbsD5f35iKzoS9sot3xOkjlGCwFLa8knEiMS05ozfoPsm3uXg3xoCha8QAvD_BwE";
  const saleAmount = 100; // test amount
  const transactionId = "test-transaction-12345";
  
  // We'll use validateOnly to see if Google Ads API complains about the data immediately
  // and we'll log the FULL response from Google.
  try {
    const result = await uploadOfflineConversion({
      gclid,
      saleAmount,
      transactionId,
      validateOnly: false, // We want the real request ID to debug
    });
    console.log("Upload successful!");
    console.log("Full response from Google:");
    console.log(JSON.stringify(result.response, null, 2));
    
    if (result.response && result.response.requestId) {
      console.log("\nGot a requestId:", result.response.requestId);
      console.log("You can use this requestId to check the status of the upload.");
    }
  } catch (err) {
    console.error("Upload failed!");
    console.error(err);
  }
}

run();
