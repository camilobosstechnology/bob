// src/hooks/useFetchApi.js
import { useState, useEffect, useCallback, useRef } from "react";
import { transformData } from "./useGetMetrics/transformData";
// (optional) if you want to fall back to initial data on errors, import it:
import initialData from "../data/initialData.json";

function readRuntime(key) {
  return typeof window !== "undefined" && window.__APP_CONFIG__
    ? window.__APP_CONFIG__[key] || ""
    : "";
}

export default function useFetchApi(endpointOverride, tokenOverride, refreshInterval = 0) {
  const [data, setData] = useState(null);
  const [fluctuated, setFluctuated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read from runtime config
  const baseUrl = readRuntime("API_URL");
  const token = tokenOverride || readRuntime("API_TOKEN");
  const defaultEndpoint = readRuntime("API_ENDPOINT");

  // Final endpoint to use (override > config)
  const endpoint = endpointOverride || defaultEndpoint;

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    console.log("[useFetchApi] baseUrl:", baseUrl);
    console.log("[useFetchApi] endpoint:", endpoint);
    console.log("[useFetchApi] token present:", !!token);

    if (!endpoint || !baseUrl) {
      const msg = !endpoint ? "Missing endpoint" : "Missing API base URL";
      console.error("[useFetchApi]", msg);
      setLoading(false);
      setError(msg);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const url = `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
      console.log("[useFetchApi] fetching:", url);

      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, { headers, signal: controller.signal });
      console.log("[useFetchApi] response status:", res.status);

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Error ${res.status}: ${res.statusText}${msg ? ` - ${msg}` : ""}`);
      }

      const raw = await res.json();
      console.log("[useFetchApi] raw payload:", raw);

      const transformed = transformData(raw);
      if (!mountedRef.current) return;

      console.log("[useFetchApi] transformed:", transformed);
      setData(transformed);
      setFluctuated(transformed?.data?.moods || []);
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("[useFetchApi] request aborted");
        return;
      }
      if (!mountedRef.current) return;

      console.error("[useFetchApi] fetch error:", err);
      setError(err.message || String(err));

      console.warn("[useFetchApi] using fallback initialData");
      try {
        const transformedFallback = transformData(initialData);
        setData(transformedFallback);
        setFluctuated(transformedFallback?.data?.moods || []);
      } catch (fallbackErr) {
        console.error("Failed to apply fallback data:", fallbackErr);
      }
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, [endpoint, baseUrl, token]);

  // initial + polling
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    let id;
    if (refreshInterval > 0) id = setInterval(fetchData, refreshInterval);
    return () => {
      mountedRef.current = false;
      if (id) clearInterval(id);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData, refreshInterval]);

  // moods fluctuation
  useEffect(() => {
    if (!data?.data?.moods) return;
    let id;
    const start = () => {
      if (!id) {
        id = setInterval(() => {
          const src = data.data.moods;
          const next = Array.isArray(src)
            ? src.map((m) => {
                const p = Number(m.percentage) || 0;
                const pct = (Math.random() * (30 - 10) + 10) / 100;
                const dir = Math.random() > 0.5 ? 1 : -1;
                let np = Math.round(p + p * pct * dir);
                if (np >= 100) np = 95 + Math.floor(Math.random() * 5);
                if (np < 0) np = 0;
                return { ...m, percentage: np };
              })
            : [];
          setFluctuated(next);
        }, 1000);
      }
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [data]);

  return {
    metrics1: data,
    sentiments: fluctuated,
    isLoading1: loading,
    error,
    refetch: fetchData
  };
}
