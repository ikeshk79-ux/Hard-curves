import { Navigate } from "react-router-dom";
import { Show, SignUp } from "@clerk/react";
import { Brand } from "../components/Brand";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-hc-bg px-4 py-10 text-hc-text">
      <Show when="signed-in"><Navigate to="/" replace /></Show>
      <Brand size="lg" testId="sign-up-logo" />
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
