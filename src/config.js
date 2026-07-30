import "dotenv/config"

export const config = {
    port: Number(process.env.PORT || 3000),
    webhookSecret: process.env.WEBHOOK_SECRET || "",
    leapApiToken: process.env.LEAP_API_TOKEN || "",
    leapBaseUrl: process.env.LEAP_URL || "https://api.jobprogress.com/api/v3",
    soldStageName: process.env.SOLD_STAGE_NAME || "Contract Paperwork",
}