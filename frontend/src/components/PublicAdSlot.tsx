interface PublicAdSlotProps {
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

/**
 * Renders a publisher-supplied display unit in an opaque sandbox.  The ad
 * provider's script consequently cannot access Saarthi's DOM, storage, or
 * authenticated application state. This component is deliberately reserved
 * for public marketing pages; it must not be mounted in the app workspace.
 */
export function PublicAdSlot({ adKey, width, height, className = "" }: PublicAdSlotProps) {
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;overflow:hidden"><script>var atOptions={key:'${adKey}',format:'iframe',height:${height},width:${width},params:{}};</script><script src="https://www.highrevenueformat.com/${adKey}/invoke.js"></script></body></html>`;

  return (
    <section className={`mx-auto w-fit ${className}`} aria-label="Advertisement">
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
        Advertisement
      </p>
      <iframe
        title="Sponsored content"
        srcDoc={srcDoc}
        width={width}
        height={height}
        loading="lazy"
        sandbox="allow-scripts allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
        className="block border-0"
      />
    </section>
  );
}
