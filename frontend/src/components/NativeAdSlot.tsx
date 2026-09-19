import { useEffect } from "react";
import { AD_CONFIG } from "../config/adConfig";

interface NativeAdSlotProps {
  className?: string;
}

export function NativeAdSlot({ className = "" }: NativeAdSlotProps) {
  useEffect(() => {
    if (!AD_CONFIG.enabled || !AD_CONFIG.secondaryBannerScript) return;

    const existing = document.getElementById("clean-native-ad-script");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "clean-native-ad-script";
      s.src = AD_CONFIG.secondaryBannerScript;
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  if (!AD_CONFIG.enabled) return null;

  return (
    <section className={`mx-auto w-full max-w-4xl my-4 ${className}`} aria-label="Sponsored Content">
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
        Sponsored Content
      </p>
      <div id={AD_CONFIG.primaryContainerId} className="w-full min-h-[90px] rounded-xl overflow-hidden bg-card/40 p-2 border border-border/50 flex justify-center items-center" />
    </section>
  );
}
