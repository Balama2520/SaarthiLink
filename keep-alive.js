/**
 * keep-alive.js
 * Pings every service in the Saarthi stack to prevent cold sleep/pausing.
 * Run this via GitHub Actions on a schedule (see .github/workflows/keep-alive.yml).
 */

const RENDER_URL = process.env.RENDER_URL || "https://saarthilink.onrender.com/";
const HF_TOKEN = process.env.HF_TOKEN || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const SERVICES = {
  render: {
    name: "Render Backend",
    url: RENDER_URL,
    method: "GET",
  },

  huggingface: {
    name: "Hugging Face AI Brain",
    url: "https://balamaneesh2520-saarthi-ai-brain.hf.space/",
    method: "GET",
    headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {},
  },

  supabase: {
    name: "Supabase Database",
    url: "https://wcawcytqhpyvtuwnbqlv.supabase.co/rest/v1/",
    method: "GET",
    headers: SUPABASE_ANON_KEY
      ? {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        }
      : {},
  },
};

async function pingService(key, config) {
  const start = Date.now();
  try {
    const res = await fetch(config.url, {
      method: config.method,
      headers: config.headers || {},
    });
    const elapsed = Date.now() - start;
    const status = res.status;
    const ok = res.ok || (status >= 200 && status < 500); // treat 4xx as "reachable"

    console.log(
      `${ok ? "✅" : "❌"} ${config.name}: HTTP ${status} in ${elapsed}ms`
    );
    return { key, ok, status, elapsed };
  } catch (err) {
    console.log(`❌ ${config.name}: FAILED — ${err.message}`);
    return { key, ok: false, error: err.message };
  }
}

async function wakeAll() {
  console.log(`\n🔄 Pinging all Saarthi services — ${new Date().toISOString()}\n`);

  const results = await Promise.all(
    Object.entries(SERVICES).map(([key, config]) => pingService(key, config))
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n📊 Summary: ${results.length - failed.length}/${results.length} services responded.\n`);

  if (failed.length > 0) {
    console.log("⚠️ Failed/unreachable services:", failed.map((f) => f.key).join(", "));
    process.exitCode = 1;
  }
}

wakeAll();
