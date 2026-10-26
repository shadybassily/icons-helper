import { useState } from 'react';
import { CheckIcon, CopyIcon, IconButton } from './Icons';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      label={copied ? 'Copied' : label}
      className={copied ? 'text-color01' : ''}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* still show the check so the click is acknowledged */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </IconButton>
  );
}
