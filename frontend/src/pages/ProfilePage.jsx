import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudCheck, Download, RotateCcw, LogOut, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, errMsg } from "../lib/api";
import { fmtDateTime } from "../lib/units";
import { PageHeader, SectionTitle, Loading } from "../components/Bits";
import { ConfirmAction } from "../components/ConfirmAction";

const ProfileForm = ({ me }) => {
  const api = useApi();
  const qc = useQueryClient();
  const [f, setF] = useState({ display_name: me.display_name, plan_name: me.plan_name, units: me.units });
  const [saving, setSaving] = useState(false);
  useEffect(() => setF({ display_name: me.display_name, plan_name: me.plan_name, units: me.units }), [me]);

  const save = async () => {
    if (!f.display_name.trim() || !f.plan_name.trim()) return toast.error("Name and plan name can't be empty");
    setSaving(true);
    try {
      await api.patch("/me", f);
      await qc.invalidateQueries();
      toast.success("Profile saved");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="profile-form" className="hc-card grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
      <div>
        <label className="hc-label mb-2 block" htmlFor="p-name">Display name</label>
        <input id="p-name" data-testid="profile-name-input" className="hc-input" maxLength={60} value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
      </div>
      <div>
        <label className="hc-label mb-2 block" htmlFor="p-plan">Plan name</label>
        <input id="p-plan" data-testid="profile-plan-input" className="hc-input" maxLength={60} value={f.plan_name} onChange={(e) => setF({ ...f, plan_name: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <div className="hc-label mb-2">Units</div>
        <div className="grid grid-cols-2 gap-2">
          <button data-testid="units-metric" data-active={f.units === "metric"} onClick={() => setF({ ...f, units: "metric" })} className="hc-chip h-12 justify-center rounded-xl">Metric · cm / kg</button>
          <button data-testid="units-imperial" data-active={f.units === "imperial"} onClick={() => setF({ ...f, units: "imperial" })} className="hc-chip h-12 justify-center rounded-xl">Imperial · in / lb</button>
        </div>
      </div>
      <button data-testid="profile-save-button" disabled={saving} onClick={save} className="hc-btn sm:col-span-2"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save profile"}</button>
    </div>
  );
};

export default function ProfilePage() {
  const api = useApi();
  const qc = useQueryClient();
  const { signOut } = useClerk();
  const { data: me } = useMe();
  if (!me) return <Loading />;

  const exportData = async () => {
    try {
      const { data } = await api.get("/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `hard-curves-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const reset = async () => {
    try {
      await api.post("/reset");
      localStorage.removeItem("hc-workout-draft");
      await qc.invalidateQueries();
      toast.success("All data reset");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const logout = async () => {
    localStorage.removeItem("hc-workout-draft");
    qc.clear();
    await signOut({ redirectUrl: "/sign-in" });
  };

  return (
    <div className="hc-rise space-y-8">
      <PageHeader eyebrow={me.email} title="Profile" />
      <ProfileForm me={me} />
      <section>
        <SectionTitle>Your data</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div data-testid="cloud-backup-status" className="hc-card flex items-center gap-4 p-4 sm:col-span-2">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-hc-lime/15 text-hc-lime"><CloudCheck className="h-5 w-5" /></span>
            <div>
              <div className="font-semibold">Saved to the cloud</div>
              <div className="text-sm text-hc-muted">Last change: <span data-testid="cloud-backup-last-change">{fmtDateTime(me.updated_at)}</span></div>
            </div>
          </div>
          <button data-testid="export-data-button" onClick={exportData} className="hc-btn-ghost h-14"><Download className="h-4 w-4" />Export all data (JSON)</button>
          <ConfirmAction testId="reset-data" title="Reset all data?" confirmLabel="Reset everything"
            description="Deletes all workouts, measurements and photos and restores the default plan. Your account stays. This can't be undone."
            onConfirm={reset}
            trigger={<button data-testid="reset-data-button" className="hc-btn-ghost h-14 text-red-400"><RotateCcw className="h-4 w-4" />Reset all data</button>} />
        </div>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row">
        {me.role === "admin" && <Link data-testid="profile-owner-link" to="/owner" className="hc-btn-ghost"><Shield className="h-4 w-4" />Owner area</Link>}
        <button data-testid="sign-out-button" onClick={logout} className="hc-btn-ghost sm:ml-auto"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  );
}
