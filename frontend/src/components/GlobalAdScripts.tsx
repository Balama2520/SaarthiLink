import { useEffect } from "react";
import { AD_CONFIG } from "../config/adConfig";

export function GlobalAdScripts() {
  useEffect(() => {
    if (!AD_CONFIG.enabled || !AD_CONFIG.primaryBannerScript) return;

    const scriptId = "monetag-global-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = AD_CONFIG.primaryBannerScript;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return null;
}
