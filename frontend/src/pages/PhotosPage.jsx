import { useRef, useState } from "react";
import { Upload, Trash2, Columns2, X } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, usePhotos, useMeasurements, useInvalidate, errMsg } from "../lib/api";
import { fmtDate, fmtLen, todayISO, isValidPastDate } from "../lib/units";
import { PageHeader, SectionTitle, Empty, Loading } from "../components/Bits";
import { AuthImage } from "../components/AuthImage";
import { ConfirmAction } from "../components/ConfirmAction";

const ALLOWED = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

const UploadForm = () => {
  const api = useApi();
  const invalidate = useInvalidate();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a photo first");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) return toast.error("Use a JPG, PNG, WEBP or HEIC image");
    if (file.size > 10 * 1024 * 1024) return toast.error("Photo must be 10 MB or smaller");
    const dateErr = isValidPastDate(date);
    if (dateErr) return toast.error(dateErr);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("date", date);
    fd.append("note", note);
    setBusy(true);
    try {
      await api.post("/photos", fd);
      await invalidate("photos", "me");
      toast.success("Photo uploaded");
      setFile(null);
      setNote("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error(errMsg(err, "Upload failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form data-testid="photo-upload-form" onSubmit={submit} className="hc-card grid gap-4 p-4 sm:grid-cols-[2fr_1fr] sm:p-6">
      <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hc-line bg-hc-bg text-sm text-hc-muted transition-colors hover:border-hc-lime sm:row-span-2 sm:h-auto">
        <Upload className="h-6 w-6 text-hc-lime" />
        <span data-testid="photo-file-name" className="max-w-full truncate px-3">{file ? file.name : "Tap to choose a photo (max 10 MB)"}</span>
        <input ref={inputRef} data-testid="photo-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      <input data-testid="photo-date-input" type="date" max={todayISO()} className="hc-input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Photo date" />
      <input data-testid="photo-note-input" className="hc-input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
      <button data-testid="photo-upload-button" disabled={busy} className="hc-btn sm:col-span-2">{busy ? "Uploading…" : "Upload photo"}</button>
    </form>
  );
};

const daysBetween = (a, b) => Math.round(Math.abs(new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

const Compare = ({ pair, measurements, units, onClose }) => {
  const [a, b] = [...pair].sort((x, y) => x.date.localeCompare(y.date));
  const Side = ({ p, label }) => {
    const ms = measurements.filter((m) => m.date === p.date);
    return (
      <div className="min-w-0">
        <div className="hc-label mb-2">{label} · {fmtDate(p.date)}</div>
        <AuthImage photoId={p.id} alt={`Progress ${p.date}`} className="aspect-[3/4] w-full rounded-xl" testId={`compare-image-${label.toLowerCase()}`} />
        <div className="mt-2 space-y-1 text-xs">
          {ms.map((m) => <div key={m.id} className="flex justify-between gap-2 text-hc-muted"><span>{m.body_part} · {m.side}</span><span className="font-mono text-hc-text">{fmtLen(m.value_cm, units)}</span></div>)}
          {!ms.length && <div className="text-hc-muted">No measurements that day</div>}
        </div>
      </div>
    );
  };
  return (
    <div data-testid="photo-compare" className="hc-card border-hc-lime/40 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="hc-title text-2xl"><span data-testid="photo-compare-days" className="text-hc-lime">{daysBetween(a.date, b.date)}</span> days between</div>
        <button data-testid="photo-compare-close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-hc-line" aria-label="Close compare"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-6"><Side p={a} label="Before" /><Side p={b} label="After" /></div>
    </div>
  );
};

export default function PhotosPage() {
  const api = useApi();
  const invalidate = useInvalidate();
  const { data: me } = useMe();
  const { data: photos } = usePhotos();
  const { data: measurements } = useMeasurements();
  const [selected, setSelected] = useState([]);
  const [comparing, setComparing] = useState(false);
  if (!me || !photos || !measurements) return <Loading />;

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]));
  const pair = photos.filter((p) => selected.includes(p.id));

  const remove = async (id) => {
    try {
      await api.delete(`/photos/${id}`);
      setSelected((s) => s.filter((x) => x !== id));
      setComparing(false);
      await invalidate("photos", "me");
      toast.success("Photo deleted");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="hc-rise space-y-8">
      <PageHeader eyebrow="Private to you" title="Progress photos" />
      <UploadForm />
      {comparing && pair.length === 2 && <Compare pair={pair} measurements={measurements} units={me.units} onClose={() => setComparing(false)} />}
      <section>
        <SectionTitle action={
          <button data-testid="photo-compare-button" disabled={pair.length !== 2} onClick={() => setComparing(true)} className="hc-btn h-11 px-4 text-sm">
            <Columns2 className="h-4 w-4" />Compare {pair.length}/2
          </button>
        }>Gallery</SectionTitle>
        <div data-testid="photo-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => {
            const on = selected.includes(p.id);
            return (
              <div key={p.id} data-testid="photo-grid-item" className={`hc-card overflow-hidden transition-colors ${on ? "border-hc-lime" : ""}`}>
                <button data-testid={`photo-select-${p.id}`} onClick={() => toggle(p.id)} className="relative block w-full">
                  <AuthImage photoId={p.id} alt={`Progress ${p.date}`} className="aspect-[3/4] w-full" />
                  <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${on ? "bg-hc-lime text-hc-ink" : "bg-hc-bg/80 text-hc-muted"}`}>{on ? "Selected" : "Select"}</span>
                </button>
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{fmtDate(p.date)}</div>
                    {p.note && <div className="truncate text-xs text-hc-muted">{p.note}</div>}
                  </div>
                  <ConfirmAction testId="photo-delete" title="Delete photo?" description="The photo will be removed for good." onConfirm={() => remove(p.id)}
                    trigger={<button data-testid="photo-delete-button" className="grid h-10 w-10 place-items-center rounded-xl border border-hc-line text-hc-muted hover:text-red-400" aria-label="Delete photo"><Trash2 className="h-4 w-4" /></button>} />
                </div>
              </div>
            );
          })}
        </div>
        {!photos.length && <Empty testId="photo-grid-empty">No photos yet. Upload your first check-in.</Empty>}
      </section>
    </div>
  );
}
