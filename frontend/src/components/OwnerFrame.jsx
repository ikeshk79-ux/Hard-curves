import { Link } from "react-router-dom";
import { useClerk } from "@clerk/react";
import { ArrowLeft, ShieldX } from "lucide-react";
import { Brand } from "../components/Brand";
import { Loading } from "../components/Bits";
import { useMe } from "../lib/api";

export const OwnerFrame = ({ children, back = "/", backLabel = "Back to app" }) => (
  <div className="hc-grain min-h-screen bg-hc-bg text-hc-text">
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-hc-line bg-hc-bg/90 px-4 py-3 backdrop-blur-md sm:px-8">
      <div className="flex items-center gap-3"><Brand /><span className="hidden rounded-md border border-hc-lime/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-hc-lime sm:inline">Owner</span></div>
      <Link data-testid="owner-back-link" to={back} className="hc-btn-ghost h-11 text-sm"><ArrowLeft className="h-4 w-4" />{backLabel}</Link>
    </header>
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8">{children}</main>
  </div>
);

const Refused = () => {
  const { signOut } = useClerk();
  return (
    <div data-testid="owner-refused" className="mx-auto mt-16 max-w-md text-center">
      <ShieldX className="mx-auto h-12 w-12 text-red-400" />
      <h1 className="hc-title mt-4 text-4xl">Access refused</h1>
      <p className="mt-3 text-hc-muted">This area is only for the Hard Curves owner account.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="hc-btn">Go to app</Link>
        <button data-testid="owner-refused-switch" onClick={() => signOut({ redirectUrl: "/sign-in?redirect_url=%2Fowner" })} className="hc-btn-ghost">Switch account</button>
      </div>
    </div>
  );
};

export const OwnerGuard = ({ children, back, backLabel }) => {
  const { data: me, isLoading } = useMe();
  return (
    <OwnerFrame back={back} backLabel={backLabel}>
      {isLoading || !me ? <Loading /> : me.role === "admin" ? children : <Refused />}
    </OwnerFrame>
  );
};
