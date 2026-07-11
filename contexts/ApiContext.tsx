import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_URL_KEY = "@netflixy/api_url";

export interface ParsedCookie {
  domain: string;
  path: string;
  secure: boolean;
  expiry: number;
  name: string;
  value: string;
}

export type CookieStatus = "idle" | "loading" | "ready" | "no_cookie" | "error";

interface ApiContextValue {
  apiUrl: string | null;
  cookieStatus: CookieStatus;
  cookieCount: number;
  cookieLabel: string;
  rawCookieValue: string | null;
  parsedCookies: ParsedCookie[];
  setApiUrl: (url: string) => Promise<void>;
  clearApiUrl: () => Promise<void>;
  refresh: () => void;
}

const ApiContext = createContext<ApiContextValue | null>(null);

function parseNetscapeCookies(raw: string): ParsedCookie[] {
  const cookies: ParsedCookie[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 7) continue;
    const [domain, , path, secureStr, expiryStr, name, ...valueParts] = parts;
    const value = valueParts.join("\t");
    const secure = secureStr === "TRUE";
    const expiry = parseInt(expiryStr, 10);
    cookies.push({ domain, path, secure, expiry, name, value });
  }
  return cookies;
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [apiUrl, setApiUrlState] = useState<string | null>(null);
  const [cookieStatus, setCookieStatus] = useState<CookieStatus>("idle");
  const [cookieCount, setCookieCount] = useState(0);
  const [cookieLabel, setCookieLabel] = useState("");
  const [rawCookieValue, setRawCookieValue] = useState<string | null>(null);
  const [parsedCookies, setParsedCookies] = useState<ParsedCookie[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(API_URL_KEY).then((url) => {
      if (url) setApiUrlState(url);
    });
  }, []);

  const fetchCookieStatus = useCallback(async (url: string) => {
    setCookieStatus("loading");
    setRawCookieValue(null);
    setParsedCookies([]);
    setCookieCount(0);
    setCookieLabel("");
    try {
      const res = await fetch(`${url}/api/access`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.found && data.cookieValue) {
        const raw: string = data.cookieValue;
        setRawCookieValue(raw);
        const parsed = parseNetscapeCookies(raw);
        setParsedCookies(parsed);
        setCookieCount(parsed.length);
        setCookieLabel(data.label ?? "");
        setCookieStatus("ready");
      } else {
        setCookieStatus("no_cookie");
      }
    } catch {
      setCookieStatus("error");
    }
  }, []);

  useEffect(() => {
    if (apiUrl) fetchCookieStatus(apiUrl);
  }, [apiUrl, fetchCookieStatus]);

  const setApiUrl = async (url: string) => {
    const normalized = url.trim().replace(/\/$/, "");
    await AsyncStorage.setItem(API_URL_KEY, normalized);
    setApiUrlState(normalized);
  };

  const clearApiUrl = async () => {
    await AsyncStorage.removeItem(API_URL_KEY);
    setApiUrlState(null);
    setCookieStatus("idle");
    setRawCookieValue(null);
    setParsedCookies([]);
    setCookieCount(0);
    setCookieLabel("");
  };

  const refresh = () => {
    if (apiUrl) fetchCookieStatus(apiUrl);
  };

  return (
    <ApiContext.Provider
      value={{
        apiUrl,
        cookieStatus,
        cookieCount,
        cookieLabel,
        rawCookieValue,
        parsedCookies,
        setApiUrl,
        clearApiUrl,
        refresh,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside ApiProvider");
  return ctx;
}

export { parseNetscapeCookies };
