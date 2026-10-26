import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { useApi, useInvalidate, errMsg } from "../lib/api";
import { Switch } from "./ui/switch";

export const WeeklyEmailCard = ({ me }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const [busy, setBusy] = useState(false);

  const toggle = async (on) => {
    try {
      await api.patch("/me", { weekly_email: on });
      await invalidate("me");
      toast.success(on ? "Weekly email turned on" : "Weekly email turned off");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const preview = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/me/weekly-email/preview");
      toast.success(`Preview sent to ${data.sent_to}`);
    } catch (e) {
      toast.error(errMsg(e, "Could not send the preview"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="weekly-email-card" className="hc-card flex flex-col gap-4 p-4 sm:col-span-2 sm:flex-row sm:items-center">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-hc-lime/15 text-hc-lime"><Mail className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Weekly progress email</div>
        <div className="text-sm text-hc-muted">
          Sundays at 6pm ({me.timezone || "your time zone"}): volume, new records, measurement changes and goals. Sent to {me.email}.
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button data-testid="weekly-email-preview-button" disabled={busy} onClick={preview} className="hc-btn-ghost h-11 px-3 text-sm"><Send className="h-4 w-4" />{busy ? "Sending…" : "Send preview"}</button>
        <Switch data-testid="weekly-email-switch" checked={me.weekly_email} onCheckedChange={toggle} aria-label="Weekly progress email" />
      </div>
    </div>
  );
};
