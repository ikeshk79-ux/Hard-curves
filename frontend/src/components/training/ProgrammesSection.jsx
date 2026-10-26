import { useCallback, useState } from "react";
import { Check, Copy, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi, useInvalidate, useProgrammes, useSplits, errMsg } from "../../lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { ConfirmAction } from "../ConfirmAction";
import { Loading } from "../Bits";
import { ProgrammeEditor } from "./ProgrammeEditor";

const NewProgrammeDialog = ({ open, onOpenChange, onCreated }) => {
  const api = useApi();
  const { data: splits } = useSplits();
  const [name, setName] = useState("");
  const [split, setSplit] = useState("ppl");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    if (!name.trim()) return toast.error("Name the programme");
    setBusy(true);
    try {
      const { data } = await api.post("/programmes", { name, split });
      setName("");
      onCreated(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="new-programme-dialog" className="max-h-[92vh] max-w-lg overflow-y-auto border-hc-line bg-hc-card">
        <DialogTitle className="hc-title text-2xl">New programme</DialogTitle>
        <DialogDescription className="text-hc-muted">Start from a split, then change anything you like.</DialogDescription>
        <input data-testid="new-programme-name" className="hc-input" maxLength={60} placeholder="e.g. Glute & Shoulder Focus" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid gap-2">
          {(splits || []).map((s) => (
            <button key={s.id} type="button" data-testid={`split-option-${s.id}`} data-active={split === s.id} onClick={() => setSplit(s.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${split === s.id ? "border-hc-lime bg-hc-lime/10" : "border-hc-line bg-hc-bg"}`}>
              <div className="font-semibold">{s.label}</div>
              <div className="text-xs text-hc-muted">{s.days.join(" · ")}</div>
            </button>
          ))}
        </div>
        <button data-testid="new-programme-create" disabled={busy} onClick={create} className="hc-btn">{busy ? "Creating…" : "Create programme"}</button>
      </DialogContent>
    </Dialog>
  );
};

export const ProgrammesSection = ({ exercises }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const { data: programmes } = useProgrammes();
  const [viewId, setViewId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const onDirty = useCallback((d) => setDirty(d), []);
  if (!programmes) return <Loading />;
  const current = programmes.find((p) => p.id === viewId) || programmes.find((p) => p.active) || programmes[0];

  const view = (id) => {
    if (id === current.id) return;
    if (dirty && !window.confirm("Discard unsaved changes to this programme?")) return;
    setViewId(id);
  };
  const act = async (fn, msg) => {
    try {
      const res = await fn();
      await invalidate("programmes", "plan", "me");
      if (msg) toast.success(msg);
      return res;
    } catch (e) {
      toast.error(errMsg(e));
      return null;
    }
  };
  const duplicate = async () => {
    const res = await act(() => api.post(`/programmes/${current.id}/duplicate`), "Programme duplicated");
    if (res) setViewId(res.data.id);
  };
  const remove = async () => {
    const res = await act(() => api.delete(`/programmes/${current.id}`), "Programme deleted");
    if (res) setViewId(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="hc-title text-xl sm:text-2xl">Programmes</h2>
        <button data-testid="programme-new-button" onClick={() => setCreating(true)} className="hc-btn h-11 px-4 text-sm"><Plus className="h-4 w-4" />New</button>
      </div>
      <div data-testid="programme-list" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {programmes.map((p) => (
          <button key={p.id} data-testid={`programme-tab-${p.id}`} data-active={p.id === current.id} onClick={() => view(p.id)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-left transition-colors ${p.id === current.id ? "border-hc-lime bg-hc-lime/10" : "border-hc-line bg-hc-card"}`}>
            <div className="flex items-center gap-1.5 text-sm font-semibold">{p.active && <Star className="h-3.5 w-3.5 fill-hc-lime text-hc-lime" />}{p.name}</div>
            <div className="text-[11px] text-hc-muted">{p.days.filter((d) => d.type !== "rest").length} training · {p.days.filter((d) => d.type === "rest").length} rest</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {current.active ? (
          <span data-testid="programme-active-badge" className="inline-flex h-11 items-center gap-2 rounded-xl bg-hc-lime/15 px-4 text-sm font-semibold text-hc-lime"><Check className="h-4 w-4" />Active programme</span>
        ) : (
          <button data-testid="programme-activate-button" onClick={() => act(() => api.post(`/programmes/${current.id}/activate`), `${current.name} is now active`)} className="hc-btn h-11 text-sm"><Star className="h-4 w-4" />Set as active</button>
        )}
        <button data-testid="programme-duplicate-button" onClick={duplicate} className="hc-btn-ghost h-11 text-sm"><Copy className="h-4 w-4" />Duplicate</button>
        {programmes.length > 1 && (
          <ConfirmAction testId="programme-delete" title="Delete programme?" description={`"${current.name}" and its days will be removed. Logged workouts stay.`} onConfirm={remove}
            trigger={<button data-testid="programme-delete-button" className="hc-btn-ghost h-11 text-sm text-red-400"><Trash2 className="h-4 w-4" />Delete</button>} />
        )}
      </div>
      <ProgrammeEditor key={current.id} programme={current} exercises={exercises} onDirty={onDirty} />
      <NewProgrammeDialog open={creating} onOpenChange={setCreating}
        onCreated={async (p) => { setCreating(false); await invalidate("programmes"); setDirty(false); setViewId(p.id); toast.success("Programme created"); }} />
    </section>
  );
};
