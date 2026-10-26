import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, Dumbbell, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { fmtDate, fmtLoadNum, wUnit } from "../lib/units";

const renderPng = async (node) => {
  const opts = { pixelRatio: 3, cacheBust: true, backgroundColor: "#101113" };
  try {
    return await toPng(node, opts);
  } catch {
    return toPng(node, { ...opts, skipFonts: true });
  }
};

const CardFace = ({ pr, units, athlete, cardRef }) => (
  <div ref={cardRef} data-testid="pr-card" className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-hc-lime bg-hc-bg p-6 text-hc-text sm:p-8">
    <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-hc-lime/10 blur-2xl" />
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-hc-lime text-hc-ink"><Dumbbell className="h-5 w-5" strokeWidth={2.5} /></span>
        <span className="font-display text-xl font-black uppercase tracking-tight">Hard <span className="text-hc-lime">Curves</span></span>
      </div>
      <div className="mt-auto">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-hc-lime px-2.5 py-1 font-display text-sm font-extrabold uppercase tracking-wider text-hc-ink">
          <Trophy className="h-4 w-4" /> New personal record
        </div>
        <div data-testid="pr-card-lift" className="mt-3 font-display text-3xl font-extrabold uppercase leading-none sm:text-4xl">{pr.exercise_name}</div>
        <div className="mt-3 flex items-end gap-3">
          <span data-testid="pr-card-weight" className="font-display text-7xl font-black leading-none text-hc-lime sm:text-8xl">{fmtLoadNum(pr.load, units)}</span>
          <span className="mb-2 font-display text-2xl font-bold uppercase text-hc-muted">{wUnit(units)}</span>
        </div>
        <div className="mt-1 font-mono text-lg">× <span data-testid="pr-card-reps">{pr.reps}</span> reps</div>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-hc-line pt-3 font-mono text-xs uppercase tracking-wider text-hc-muted">
        <span data-testid="pr-card-date">{fmtDate(pr.date)}</span>
        <span className="truncate pl-3">{athlete}</span>
      </div>
    </div>
  </div>
);

export const PRCardDialog = ({ pr, open, onOpenChange, units, athlete, extra = [] }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  if (!pr) return null;
  const fileName = `hard-curves-pr-${pr.exercise_id}-${pr.date}.png`;

  const download = async () => {
    setBusy(true);
    try {
      const url = await renderPng(ref.current);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      toast.error("Could not create the image");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const url = await renderPng(ref.current);
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "New personal record", text: `${pr.exercise_name} PR — Hard Curves` });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        toast("Sharing isn't supported here, so the image was downloaded");
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("Could not share the image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="pr-card-dialog" className="max-h-[95vh] max-w-md overflow-y-auto border-hc-line bg-hc-card p-4 sm:p-6">
        <DialogTitle className="hc-title text-2xl">Personal record</DialogTitle>
        <DialogDescription className="text-hc-muted">Download it or share it straight to your story.</DialogDescription>
        <CardFace pr={pr} units={units} athlete={athlete} cardRef={ref} />
        {extra.length > 0 && (
          <div data-testid="pr-card-extra" className="text-sm text-hc-muted">
            Also beaten: {extra.map((p) => `${p.exercise_name} (${fmtLoadNum(p.load, units)} ${wUnit(units)})`).join(", ")}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button data-testid="pr-card-download-button" disabled={busy} onClick={download} className="hc-btn-ghost"><Download className="h-4 w-4" />Download</button>
          <button data-testid="pr-card-share-button" disabled={busy} onClick={share} className="hc-btn"><Share2 className="h-4 w-4" />Share</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
