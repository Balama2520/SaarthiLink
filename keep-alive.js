const http = require("http");
const https = require("https");

const defaultTargets = [
  { name: "Render", url: process.env.RENDER_URL || "https://saarthilink.onrender.com/" },
  { name: "Hugging Face", url: process.env.HF_URL || "https://huggingface.co/spaces/Balamaneesh2520/saarthi-ai-brain" },
  { name: "Supabase", url: process.env.SUPABASE_URL || "https://wcawcytqhpyvtuwnbqlv.supabase.co" },
];

function requestURL(target) {
  return new Promise((resolve, reject) => {
    const url = new URL(target.url);
    const client = url.protocol === "https:" ? https : http;

    const req = client.get(
      url,
      { timeout: 15000 },
      (res) => {
        const { statusCode } = res;
        res.resume();

        if (statusCode >= 200 && statusCode < 400) {
          resolve({ ...target, statusCode });
          return;
        }

        reject(new Error(`${target.name} (${target.url}) returned HTTP ${statusCode}`));
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Timeout while reaching ${target.name} (${target.url})`));
    });

    req.on("error", reject);
  });
}

async function main() {
  const successes = [];

  for (const target of defaultTargets) {
    try {
      const result = await requestURL(target);
      successes.push(`${result.name} ${result.statusCode}`);
      console.log(`✅ Warm-up OK: ${result.name} -> ${result.url} (${result.statusCode})`);
    } catch (error) {
      console.warn(`⚠️ Warm-up failed: ${target.name} -> ${target.url}`);
      console.warn(error.message);
    }
  }

  if (successes.length === 0) {
    console.error("All warm-up endpoints failed.");
    process.exit(1);
  }

  console.log(`Warm-up complete. Successful pings: ${successes.join(" | ")}`);
}

main().catch((error) => {
  console.error("Unexpected warm-up error:", error.message);
  process.exit(1);
});
