import { Check, Lock } from "lucide-react";

export const MODELS = [{ id: "model5", name: "Model 5", desc: "Female · advanced muscular development · front & rear views", img: "/model5/front.webp" }];

export const ModelPicker = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-3">
    {MODELS.map((m) => (
      <button key={m.id} type="button" data-testid={`model-option-${m.id}`} data-active={value === m.id} onClick={() => onChange(m.id)}
        className={`hc-card relative overflow-hidden text-left transition-colors ${value === m.id ? "border-2 border-hc-lime" : ""}`}>
        <div className="flex h-64 justify-center bg-black"><img src={m.img} alt={`${m.name} anatomical model`} className="h-full object-contain" /></div>
        <div className="p-3">
          <div className="hc-title text-xl">{m.name}</div>
          <div className="text-xs text-hc-muted">{m.desc}</div>
        </div>
        {value === m.id && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-hc-lime text-hc-ink"><Check className="h-4 w-4" strokeWidth={3} /></span>}
      </button>
    ))}
    <div className="hc-card grid place-items-center border-dashed p-4 text-center text-sm text-hc-muted">
      <div><Lock className="mx-auto mb-2 h-5 w-5" />More models coming</div>
    </div>
  </div>
);
