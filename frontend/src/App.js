import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Show } from "@clerk/react";
import { Toaster } from "sonner";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import AppShell from "@/components/AppShell";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import HomePage from "@/pages/HomePage";
import TrainingPage from "@/pages/TrainingPage";
import LogWorkoutPage from "@/pages/LogWorkoutPage";
import MeasurementsPage from "@/pages/MeasurementsPage";
import ProgressPage from "@/pages/ProgressPage";
import PhotosPage from "@/pages/PhotosPage";
import ProfilePage from "@/pages/ProfilePage";
import OwnerPage from "@/pages/OwnerPage";
import OwnerAthletePage from "@/pages/OwnerAthletePage";

const Protected = ({ children }) => {
  const { pathname } = useLocation();
  const target = pathname.startsWith("/owner") ? `/sign-in?redirect_url=${encodeURIComponent("/owner")}` : "/sign-in";
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><Navigate to={target} replace /></Show>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ClerkAuthProvider>
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/owner" element={<Protected><OwnerPage /></Protected>} />
          <Route path="/owner/athletes/:userId" element={<Protected><OwnerAthletePage /></Protected>} />
          <Route element={<Protected><AppShell /></Protected>}>
            <Route index element={<HomePage />} />
            <Route path="training" element={<TrainingPage />} />
            <Route path="log" element={<LogWorkoutPage />} />
            <Route path="measurements" element={<MeasurementsPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="photos" element={<PhotosPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ClerkAuthProvider>
      <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { background: "#181A1E", border: "1px solid #2B2E34", color: "#F3F4F6" } }} />
    </BrowserRouter>
  );
}

export default App;
