const KG_TO_LB = 2.20462;
const CM_PER_IN = 2.54;

const trim = (n, d = 1) => {
  const v = Number(n.toFixed(d));
  return Number.isInteger(v) ? String(v) : v.toFixed(d);
};

export const lenUnit = (units) => (units === "imperial" ? "in" : "cm");
export const wUnit = (units) => (units === "imperial" ? "lb" : "kg");

export const cmToDisplay = (cm, units) => (units === "imperial" ? cm / CM_PER_IN : cm);
export const displayToCm = (v, units) => (units === "imperial" ? v * CM_PER_IN : v);
export const kgToDisplay = (kg, units) => (units === "imperial" ? kg * KG_TO_LB : kg);
export const displayToKg = (v, units) => (units === "imperial" ? v / KG_TO_LB : v);

export const fmtLen = (cm, units) => `${trim(cmToDisplay(cm, units))} ${lenUnit(units)}`;
export const fmtLoad = (kg, units) => `${trim(kgToDisplay(kg, units))} ${wUnit(units)}`;
export const fmtLoadNum = (kg, units) => trim(kgToDisplay(kg, units));

export const fmtVolume = (kg, units) => {
  if (units === "imperial") return `${Math.round(kg * KG_TO_LB).toLocaleString()} lb`;
  return kg >= 1000 ? `${trim(kg / 1000, 2)} t` : `${Math.round(kg)} kg`;
};

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export const isValidPastDate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "Enter a real date";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "Enter a real date";
  if (iso > todayISO()) return "Date cannot be in the future";
  if (iso < "1950-01-01") return "Date is too far in the past";
  return null;
};

export const fmtClock = (s) => {
  const v = Math.max(0, Math.round(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};

export const HEIGHT_MIN_CM = 100;
export const HEIGHT_MAX_CM = 250;

export const cmToFtIn = (cm) => {
  const total = cm / CM_PER_IN;
  let ft = Math.floor(total / 12);
  let inch = Math.round((total - ft * 12) * 10) / 10;
  if (inch >= 12) { ft += 1; inch = 0; }
  return { ft, inch };
};

export const ftInToCm = (ft, inch) => (ft * 12 + inch) * CM_PER_IN;

export const fmtHeight = (cm, unit) => {
  if (!cm) return "—";
  if (unit === "ftin") {
    const { ft, inch } = cmToFtIn(cm);
    return `${ft} ft ${trim(inch)} in`;
  }
  return `${trim(cm)} cm`;
};
