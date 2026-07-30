import express from "express"
import leapWebhookRouter from "./routes/leapWebhook.js"

const app = express()

app.use(express.json({ limit: "1mb"}))

app.get("/health", (req, res) => {
    res.status(200).json({ message: "Server is running" })
})

app.use("/webhook/leap", leapWebhookRouter)

export default app