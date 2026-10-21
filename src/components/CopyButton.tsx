import { useState } from 'react';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded-tiny border border-grey-bg03 bg-white px-8 py-2 text-xs text-color-text hover:border-color01 hover:text-color01"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
