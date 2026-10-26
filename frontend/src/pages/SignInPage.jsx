import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Show, SignIn } from "@clerk/react";
import { Brand } from "../components/Brand";

const HERO = "https://images.unsplash.com/photo-1554344728-77cf90d9ed26?crop=entropy&cs=srgb&fm=jpg&q=80&w=1600";

export default function SignInPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirect = new URLSearchParams(search).get("redirect_url") || "";
  const ownerMode = redirect.includes("/owner");

  return (
    <div className="flex min-h-screen bg-hc-bg text-hc-text">
      <Show when="signed-in"><Navigate to={ownerMode ? "/owner" : "/"} replace /></Show>
      <div className="relative hidden flex-1 overflow-hidden lg:flex">
        <img src={HERO} alt="Athlete training in a dark gym" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-bg via-hc-bg/60 to-transparent" />
        <div className="relative mt-auto p-12">
          <div className="hc-label text-hc-lime">For advanced bodybuilders</div>
          <h2 className="hc-title mt-3 max-w-lg text-6xl leading-[0.9]">Every set. Every inch. On record.</h2>
          <p className="mt-4 max-w-md text-hc-muted">Plan your split, log with a rest timer, track arm, chest and leg sizes like-for-like, and share your PRs.</p>
        </div>
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-8 px-4 py-10 lg:w-[560px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Brand size="lg" testId="sign-in-logo" onLongPress={() => navigate("/owner")} />
          <p data-testid="sign-in-tagline" className="text-sm text-hc-muted">
            {ownerMode ? "Owner access — sign in with the owner Google account." : "Precision training & measurement tracking."}
          </p>
        </div>
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp forceRedirectUrl={ownerMode ? "/owner" : undefined} />
      </div>
    </div>
  );
}
