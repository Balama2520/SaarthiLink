import { AD_CONFIG } from "../config/adConfig";

interface PublicAdSlotProps {
  adScript?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Clean & Secure Ad Slot Component
 * Only renders when monetization is enabled in AD_CONFIG or explicit script is passed.
 */
export function PublicAdSlot({ adScript, width = 728, height = 90, className = "" }: PublicAdSlotProps) {
  if (!AD_CONFIG.enabled && !adScript) {
    return null;
  }

  const scriptToRun = adScript || AD_CONFIG.primaryBannerScript;
  if (!scriptToRun) return null;

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh;"><script src="${scriptToRun}"></script></body></html>`;

  return (
    <section className={`mx-auto w-fit ${className}`} aria-label="Sponsored Content">
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
        Sponsored Content
      </p>
      <iframe
        title="Sponsored Content"
        srcDoc={srcDoc}
        width={width}
        height={height}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms"
        referrerPolicy="strict-origin-when-cross-origin"
        className="block border-0 rounded-lg overflow-hidden bg-muted/20"
      />
    </section>
  );
}
