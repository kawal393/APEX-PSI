import { Navigate, useLocation } from "react-router-dom";

/** Preserve referral parameters and the selected home view on old app launches. */
export default function HomeLaunchRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/", search, hash }} replace />;
}