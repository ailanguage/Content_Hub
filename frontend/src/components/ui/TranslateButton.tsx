"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface TranslateButtonProps {
  /** The source text to translate from */
  sourceText: string;
  /** Direction: translate from EN to ZH, or from ZH to EN */
  from: "en" | "zh";
  /** Called with the translated text */
  onTranslated: (text: string) => void;
  /** Optional context hint for the LLM (e.g. "channel name", "task description") */
  context?: string;
}

export function TranslateButton({ sourceText, from, onTranslated, context }: TranslateButtonProps) {
  const [loading, setLoading] = useState(false);

  const to = from === "en" ? "zh" : "en";
  const label = from === "en" ? "EN→中" : "中→EN";
  const title = from === "en" ? "Translate from English" : "Translate from Chinese";

  if (!sourceText.trim()) return null;

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, from, to, context }),
      });
      if (res.ok) {
        const data = await res.json();
        onTranslated(data.translated_text);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={title}
      className="px-2 py-0.5 text-[10px] font-medium rounded bg-discord-accent/20 text-discord-accent hover:bg-discord-accent/30 transition disabled:opacity-50 flex items-center gap-1 shrink-0"
    >
      {loading ? <Spinner className="w-3 h-3" /> : label}
    </button>
  );
}
