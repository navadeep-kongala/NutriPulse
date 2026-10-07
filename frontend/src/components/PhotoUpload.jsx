import { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

export default function PhotoUpload({ onAnalyze, loading }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setLocalError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setLocalError('Please choose an image under 8MB.');
      return;
    }
    setLocalError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clear() {
    setFile(null);
    setPreview(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="h-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`w-full h-full min-h-[4.75rem] border-2 border-dashed rounded-xl px-4 flex items-center justify-center gap-2.5 transition-colors ${
            dragOver ? 'border-leaf bg-leaf-tint' : 'border-line hover:border-leaf/60'
          }`}
        >
          <Camera size={19} className="text-ink/40 shrink-0" />
          <span className="text-sm text-ink/60 text-left">
            <span className="text-leaf font-medium">Snap or upload</span> a food photo
          </span>
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-line h-full min-h-[4.75rem]">
          <img src={preview} alt="Selected food" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="absolute top-1.5 right-1.5 bg-ink/70 text-paper rounded-full p-1.5 hover:bg-ink/90 transition-colors"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onAnalyze(file)}
            className="absolute bottom-1.5 right-1.5 bg-leaf text-paper text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-leaf-dark transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            Analyze
          </button>
        </div>
      )}
      {localError && <p className="text-xs text-tomato mt-1.5">{localError}</p>}
    </div>
  );
}
