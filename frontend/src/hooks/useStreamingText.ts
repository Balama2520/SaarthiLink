import { useState, useEffect } from "react";

export function useStreamingText(text: string, speedMs: number = 20) {
  // Track the text this state was computed for, in state (not a ref), so we
  // can safely reset displayedText during render when `text` changes — this
  // is React's documented "adjusting state when a prop changes" pattern and
  // avoids the synchronous setState-in-effect cascading-render pitfall.
  const [state, setState] = useState({ forText: text, displayedText: "" });

  if (state.forText !== text) {
    setState({ forText: text, displayedText: "" });
  }

  useEffect(() => {
    if (!text) return;

    let i = 0;
    const intervalId = setInterval(() => {
      i++;
      const next = text.slice(0, i);
      // setState here happens inside the interval's callback (an external
      // timer API notifying us of a tick), not synchronously in the effect
      // body, so it doesn't trigger cascading renders on mount.
      setState((prev) => (prev.forText === text ? { forText: text, displayedText: next } : prev));
      if (i >= text.length) clearInterval(intervalId);
    }, speedMs);

    return () => clearInterval(intervalId);
  }, [text, speedMs]);

  const isTyping = text.length > 0 && state.displayedText.length < text.length;

  return { displayedText: state.displayedText, isTyping };
}
