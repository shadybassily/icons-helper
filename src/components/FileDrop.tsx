import { useRef, useState, type ReactNode } from 'react';

interface Props {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  children: ReactNode;
}

export function FileDrop({ accept, multiple = false, onFiles, children }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const extensions = accept.split(',').map((a) => a.trim().toLowerCase());

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => extensions.some((ext) => f.name.toLowerCase().endsWith(ext)));
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files);
        }}
        className={`w-full rounded-md border-2 border-dashed px-20 py-30 text-center text-sm transition-colors ${
          over ? 'border-color01 bg-color01-100' : 'border-grey-bg03 bg-white hover:border-color01'
        }`}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}
