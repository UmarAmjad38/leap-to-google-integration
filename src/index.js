import express from "express"
import { config } from "./config.js"
import { log } from "./utils/logger.js"
import app from "./app.js"

app.listen(config.port, () => {
  console.log(`Example app listening on port ${config.port}`)
})