import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";

import { useApi, type ParsedCookie } from "@/contexts/ApiContext";

const NETFLIX_URL = "https://www.netflix.com";

// Graceful fallback: native cookie manager only available in EAS/dev builds, not Expo Go
let CookieManager: {
  clearAll: () => Promise<void>;
  set: (
    url: string,
    cookie: {
      name: string;
      value: string;
      domain: string;
      path: string;
      version?: string;
      expires?: string;
      secure?: boolean;
      httpOnly?: boolean;
    }
  ) => Promise<void>;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CookieManager = require("@react-native-cookies/cookies").default;
} catch {
  // Expo Go — native module not available, will fall back to Cookie header
}

async function injectCookiesNatively(parsedCookies: ParsedCookie[], rawCookieValue: string | null) {
  if (!CookieManager) return false;
  try {
    await CookieManager.clearAll();
    const now = Math.floor(Date.now() / 1000);
    const defaultExpiry = now + 60 * 60 * 24 * 30;

    if (parsedCookies.length > 0) {
      for (const c of parsedCookies) {
        const expiry = !c.expiry || c.expiry === 0 ? defaultExpiry : c.expiry;
        await CookieManager.set("https://www.netflix.com", {
          name: c.name,
          value: c.value,
          domain: c.domain.startsWith(".") ? c.domain : `.${c.domain}`,
          path: c.path || "/",
          version: "1",
          expires: new Date(expiry * 1000).toISOString(),
          secure: c.secure,
          httpOnly: true, // native API CAN set httpOnly — this is why we need a dev build
        });
      }
    } else if (rawCookieValue) {
      const expiry = defaultExpiry;
      await CookieManager.set("https://www.netflix.com", {
        name: "netflixId",
        value: rawCookieValue.trim(),
        domain: ".netflix.com",
        path: "/",
        version: "1",
        expires: new Date(expiry * 1000).toISOString(),
        secure: true,
        httpOnly: true,
      });
    }
    return true;
  } catch {
    return false;
  }
}

function buildCookieHeader(cookies: ParsedCookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

export default function NetflixScreen() {
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);
  const { parsedCookies, rawCookieValue } = useApi();
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(true);
  const [usingNative, setUsingNative] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [pageTitle, setPageTitle] = useState("Netflix");

  useEffect(() => {
    injectCookiesNatively(parsedCookies, rawCookieValue).then((success) => {
      setUsingNative(success);
      setPreparing(false);
    });
  }, [parsedCookies, rawCookieValue]);

  // Build Cookie header for fallback (Expo Go / non-native builds)
  const cookieHeader =
    !usingNative && parsedCookies.length > 0
      ? buildCookieHeader(parsedCookies)
      : !usingNative && rawCookieValue
        ? `netflixId=${rawCookieValue.trim()}`
        : undefined;

  const handleGoBack = () => {
    if (canGoBack) webviewRef.current?.goBack();
    else router.back();
  };

  if (preparing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.prepareText}>Preparing session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleGoBack} hitSlop={12} style={styles.toolbarBtn}>
          <Feather name={canGoBack ? "chevron-left" : "x"} size={22} color="#fff" />
        </Pressable>

        <View style={styles.titleRow}>
          <Text style={styles.titleText} numberOfLines={1}>
            {loading ? "Opening Netflix..." : pageTitle}
          </Text>
          {loading && (
            <ActivityIndicator size="small" color="#e50914" style={{ marginLeft: 8 }} />
          )}
        </View>

        <Pressable
          onPress={() => {
            setLoading(true);
            webviewRef.current?.reload();
          }}
          hitSlop={12}
          style={styles.toolbarBtn}
        >
          <Feather name="refresh-cw" size={18} color="#888" />
        </Pressable>
      </View>

      {!usingNative && (
        <View style={styles.warnBanner}>
          <Feather name="alert-triangle" size={13} color="#f59e0b" />
          <Text style={styles.warnText}>
            Expo Go mode — cookies may not persist. Build the app for full access.
          </Text>
        </View>
      )}

      <WebView
        ref={webviewRef}
        source={{
          uri: NETFLIX_URL,
          ...(cookieHeader ? { headers: { Cookie: cookieHeader } } : {}),
        }}
        style={styles.webview}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          if (navState.title) setPageTitle(navState.title);
        }}
        userAgent={
          Platform.OS === "ios"
            ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            : "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  prepareText: {
    color: "#888",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#141414",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    gap: 12,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "Inter_500Medium",
    maxWidth: "80%",
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1200",
    borderBottomWidth: 1,
    borderBottomColor: "#3a2a00",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  warnText: {
    flex: 1,
    fontSize: 11,
    color: "#f59e0b",
    fontFamily: "Inter_400Regular",
  },
  webview: {
    flex: 1,
    backgroundColor: "#141414",
  },
});
