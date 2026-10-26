import { useMemo } from "react";
import axios from "axios";
import { useAuth } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useApi() {
  const { getToken } = useAuth();
  return useMemo(() => {
    const inst = axios.create({ baseURL: API });
    inst.interceptors.request.use(async (cfg) => {
      const token = await getToken();
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
      return cfg;
    });
    return inst;
  }, [getToken]);
}

export const errMsg = (e, fallback = "Something went wrong") => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return fallback;
};

const useGet = (key, path, enabled = true) => {
  const api = useApi();
  return useQuery({ queryKey: Array.isArray(key) ? key : [key], queryFn: () => api.get(path).then((r) => r.data), enabled });
};

export const useMe = () => useGet("me", "/me");
export const usePlan = () => useGet("plan", "/plan");
export const useExercises = () => useGet("exercises", "/exercises");
export const useWorkouts = () => useGet("workouts", "/workouts");
export const useMeasurements = () => useGet("measurements", "/measurements");
export const usePhotos = () => useGet("photos", "/photos");
export const useRecords = () => useGet("records", "/records");
export const useOwnerStats = (enabled) => useGet("owner-stats", "/owner/stats", enabled);
export const useOwnerAthletes = (q, enabled) => useGet(["owner-athletes", q], `/owner/athletes?q=${encodeURIComponent(q)}`, enabled);
export const useOwnerAthlete = (id, enabled) => useGet(["owner-athlete", id], `/owner/athletes/${id}`, enabled);

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}
