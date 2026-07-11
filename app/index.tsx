import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SplashAnimation } from "@/components/SplashAnimation";
import { useApi } from "@/contexts/ApiContext";
import { useColors } from "@/hooks/useColors";

function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setApiUrl } = useApi();
  const [urlValue, setUrlValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleSave = async () => {
    const trimmed = urlValue.trim();
    if (!trimmed || !trimmed.startsWith("http")) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      await setApiUrl(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#141414", "#1a0000"]}
        style={[styles.setupContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.logoBlock}>
          <Text style={styles.logoN}>N</Text>
          <Text style={styles.logoText}>ETFLIXY</Text>
        </View>

        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Connect your server</Text>
          <Text style={styles.setupSubtitle}>
            Enter the URL of your Netflixy API server to get started.
          </Text>

          <View style={[styles.inputWrapper, error && styles.inputError]}>
            <Feather name="server" size={16} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="https://your-api.replit.app"
              placeholderTextColor="#555"
              value={urlValue}
              onChangeText={(t) => { setUrlValue(t); setError(false); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {error && (
            <Text style={styles.errorText}>Enter a valid URL starting with https://</Text>
          )}

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save &amp; Continue</Text>
            )}
          </Pressable>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "loading") {
    return <ActivityIndicator size="small" color="#555" style={{ marginRight: 4 }} />;
  }
  const dotColor = status === "ready" ? "#22c55e" : status === "error" ? "#ef4444" : "#555";
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: dotColor, shadowColor: status === "ready" ? "#22c55e" : "transparent" },
      ]}
    />
  );
}

function MainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { apiUrl, cookieStatus, cookieCount, cookieLabel, parsedCookies, rawCookieValue, clearApiUrl, refresh } = useApi();
  const [pressing, setPressing] = useState(false);

  const isReady = cookieStatus === "ready";

  const statusText = {
    idle: "Connecting...",
    loading: "Checking cookies...",
    ready: cookieCount > 0 ? `${cookieCount} cookies ready` : "Cookie ready",
    no_cookie: "No active cookie",
    error: "Cannot reach server",
  }[cookieStatus];

  const statusSub = {
    idle: "",
    loading: "",
    ready: cookieLabel || "Tap to access",
    no_cookie: "Ask admin to activate",
    error: "Check your server URL",
  }[cookieStatus];

  const handleAccess = async () => {
    if (!isReady) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/netflix");
  };

  const handleSettings = () => {
    Alert.alert(
      "Settings",
      `Connected to:\n${apiUrl}`,
      [
        { text: "Refresh", onPress: refresh },
        { text: "Change Server", style: "destructive", onPress: () => clearApiUrl() },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <LinearGradient
      colors={["#141414", "#1a0000"]}
      style={[styles.mainContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoN}>N</Text>
          <Text style={styles.logoText}>ETFLIXY</Text>
        </View>
        <Pressable onPress={handleSettings} hitSlop={12}>
          <Feather name="settings" size={20} color="#555" />
        </Pressable>
      </View>

      <View style={styles.mainBody}>
        <View style={styles.statusCard}>
          <StatusDot status={cookieStatus} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusText}>{statusText}</Text>
            {!!statusSub && <Text style={styles.statusSub}>{statusSub}</Text>}
          </View>
          {cookieStatus !== "loading" && (
            <Pressable onPress={refresh} hitSlop={12}>
              <Feather name="refresh-cw" size={14} color="#555" />
            </Pressable>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.accessBtn,
            !isReady && styles.accessBtnDisabled,
            pressed && isReady && styles.accessBtnPressed,
          ]}
          onPressIn={() => setPressing(true)}
          onPressOut={() => setPressing(false)}
          onPress={handleAccess}
          disabled={!isReady}
        >
          <Feather name="play" size={20} color={isReady ? "#fff" : "#555"} />
          <Text style={[styles.accessBtnText, !isReady && styles.accessBtnTextDisabled]}>
            Access Netflix
          </Text>
        </Pressable>

        <View style={styles.hint}>
          <Feather name="shield" size={12} color="#444" />
          <Text style={styles.hintText}>Cookies are fetched securely from your server</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export default function HomeScreen() {
  const { apiUrl } = useApi();
  const [splashDone, setSplashDone] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#141414" }}>
      {/* Render the real screen underneath immediately */}
      {apiUrl ? <MainScreen /> : <SetupScreen />}

      {/* Splash sits on top and fades out when done */}
      {!splashDone && (
        <SplashAnimation onComplete={() => setSplashDone(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  setupContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 48,
  },
  logoN: {
    fontSize: 32,
    fontWeight: "900",
    color: "#e50914",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  setupCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#e50914",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 11,
    color: "#e50914",
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#e50914",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnPressed: {
    backgroundColor: "#c5000f",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainBody: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  statusText: {
    fontSize: 13,
    color: "#ccc",
    fontFamily: "Inter_500Medium",
  },
  statusSub: {
    fontSize: 11,
    color: "#666",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  accessBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#e50914",
    borderRadius: 14,
    paddingVertical: 18,
    shadowColor: "#e50914",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  accessBtnDisabled: {
    backgroundColor: "#2a2a2a",
    shadowOpacity: 0,
    elevation: 0,
  },
  accessBtnPressed: {
    backgroundColor: "#c5000f",
    transform: [{ scale: 0.98 }],
  },
  accessBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  accessBtnTextDisabled: {
    color: "#555",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
  },
  hintText: {
    fontSize: 11,
    color: "#444",
    fontFamily: "Inter_400Regular",
  },
});
