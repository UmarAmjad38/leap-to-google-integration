/**
 * One-time: open browser, sign in as faizan@hermitcrabs.io (Ads access),
 * print GOOGLE_REFRESH_TOKEN for .env / Render.
 *
 * Usage:
 *   npm run google-auth
 */
import { createServer } from "http";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Could not read GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET from .env.");
  process.exit(1);
}

const PORT = 8765;
// Desktop clients accept loopback; localhost matches the downloaded client JSON.
const redirectUri = `http://localhost:${PORT}/oauth2callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/datamanager",
  "https://www.googleapis.com/auth/cloud-platform",
];

const oauth2Client = new OAuth2Client({
  clientId,
  clientSecret,
  redirectUri,
});

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

let handled = false;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");

    if (err) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end(`OAuth error: ${err}`);
      server.close();
      process.exit(1);
    }

    // Browser may hit this URL twice (prefetch / blank). Ignore empties.
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end(
        "Missing ?code= in callback. Close this tab and use the auth URL again.",
      );
      return;
    }

    if (handled) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>Already handled</h1><p>Check the terminal.</p>");
      return;
    }
    handled = true;

    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: redirectUri,
    });

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<h1>Success</h1><p>You can close this tab and return to the terminal.</p>",
    );

    console.log("\n=== Add these to .env and Render Environment ===\n");
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || "(MISSING — revoke app access and rerun)"}`,
    );
    console.log(`GOOGLE_ADS_CUSTOMER_ID=3099503028`);
    console.log(`GOOGLE_CONVERSION_ACTION_ID=7703452276`);
    console.log("\n================================================\n");

    if (!tokens.refresh_token) {
      console.error(
        "No refresh_token returned. Google Account → Security → Third-party access → remove Metro Leap Google, then run again.",
      );
    }

    server.close();
    process.exit(tokens.refresh_token ? 0 : 1);
  } catch (e) {
    console.error(e);
    try {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(String(e.message || e));
    } catch {
      // response may already be sent
    }
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    "\n1. Open this URL in your browser (sign in as faizan@hermitcrabs.io):\n",
  );
  console.log(authUrl);
  console.log(`\n2. Waiting for redirect on ${redirectUri} ...\n`);
});
