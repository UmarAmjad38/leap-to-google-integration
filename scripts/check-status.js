import { OAuth2Client } from "google-auth-library";
import { config } from "../src/config.js";
import "dotenv/config";

async function getAccessToken() {
  const client = new OAuth2Client(
    config.googleClientId,
    config.googleClientSecret,
  );
  client.setCredentials({ refresh_token: config.googleRefreshToken });
  const { token } = await client.getAccessToken();
  return token;
}

async function run() {
  const requestId = "fff00e5f-f4f9-4e21-bdcd-91af82a1e6d4";
  const url = `https://datamanager.googleapis.com/v1/requestStatus:retrieve?requestId=${requestId}`;
  
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Status for request ID:", requestId);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to fetch status:", err);
  }
}

run();
