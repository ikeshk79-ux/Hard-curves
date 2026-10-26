import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { useApi } from "../lib/api";

export const AuthImage = ({ photoId, alt, className = "", testId }) => {
  const api = useApi();
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url;
    let alive = true;
    setFailed(false);
    api.get(`/photos/${photoId}/file`, { responseType: "blob" })
      .then((r) => { url = URL.createObjectURL(r.data); if (alive) setSrc(url); })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [photoId, api]);

  if (failed) {
    return (
      <div data-testid={testId} className={`grid place-items-center bg-hc-raised text-hc-muted ${className}`}>
        <div className="flex flex-col items-center gap-1 text-xs"><ImageOff className="h-5 w-5" />Preview unavailable</div>
      </div>
    );
  }
  if (!src) return <div data-testid={testId} className={`animate-pulse bg-hc-raised ${className}`} />;
  return <img data-testid={testId} src={src} alt={alt} className={`object-cover ${className}`} onError={() => setFailed(true)} />;
};
