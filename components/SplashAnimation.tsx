import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface Props {
  onComplete: () => void;
}

export function SplashAnimation({ onComplete }: Props) {
  // N letter
  const nScale = useSharedValue(0.15);
  const nOpacity = useSharedValue(0);

  // Red glow behind N
  const glowScale = useSharedValue(0.1);
  const glowOpacity = useSharedValue(0);

  // "ETFLIXY" text
  const wordOpacity = useSharedValue(0);
  const wordX = useSharedValue(24);

  // Red underline (animate width instead of scaleX — transformOrigin unsupported in RN)
  const lineWidth = useSharedValue(0);
  const lineOpacity = useSharedValue(0);

  // Credit
  const creditOpacity = useSharedValue(0);
  const creditY = useSharedValue(10);

  // Whole screen fade-out
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // ── Phase 1: glow blooms (0-300ms) ──────────────────────────────
    glowOpacity.value = withTiming(0.35, { duration: 300 });
    glowScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

    // ── Phase 2: N slams in (100-600ms) ─────────────────────────────
    nOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));
    nScale.value = withDelay(
      100,
      withSpring(1, { damping: 10, stiffness: 120, mass: 0.8 })
    );

    // ── Phase 3: "ETFLIXY" slides in (350-750ms) ────────────────────
    wordOpacity.value = withDelay(350, withTiming(1, { duration: 320 }));
    wordX.value = withDelay(
      350,
      withSpring(0, { damping: 14, stiffness: 100 })
    );

    // ── Phase 4: red underline draws left-to-right (550-900ms) ──────
    lineOpacity.value = withDelay(550, withTiming(1, { duration: 100 }));
    lineWidth.value = withDelay(
      580,
      withTiming(width * 0.55, { duration: 360, easing: Easing.out(Easing.cubic) })
    );

    // ── Phase 5: credit appears (1000-1350ms) ───────────────────────
    creditOpacity.value = withDelay(1000, withTiming(1, { duration: 350 }));
    creditY.value = withDelay(
      1000,
      withSpring(0, { damping: 18, stiffness: 80 })
    );

    // ── Phase 6: glow pulses then dims (800-1800ms) ──────────────────
    glowOpacity.value = withDelay(
      800,
      withSequence(
        withTiming(0.5, { duration: 400 }),
        withTiming(0.15, { duration: 600 })
      )
    );

    // ── Phase 7: fade to black & call onComplete (2100-2600ms) ──────
    screenOpacity.value = withDelay(
      2100,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onComplete)();
      })
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const nStyle = useAnimatedStyle(() => ({
    opacity: nOpacity.value,
    transform: [{ scale: nScale.value }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateX: wordX.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
    width: lineWidth.value,
  }));

  const creditStyle = useAnimatedStyle(() => ({
    opacity: creditOpacity.value,
    transform: [{ translateY: creditY.value }],
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.screen, screenStyle]}>
      {/* Red glow blob behind the N */}
      <Animated.View style={[styles.glow, glowStyle]} />

      <View style={styles.center}>
        {/* Logo row */}
        <View style={styles.logoRow}>
          <Animated.Text style={[styles.letterN, nStyle]}>N</Animated.Text>
          <Animated.Text style={[styles.wordText, wordStyle]}>ETFLIXY</Animated.Text>
        </View>

        {/* Red underline */}
        <Animated.View style={[styles.underline, lineStyle]} />

        {/* Credit */}
        <Animated.Text style={[styles.credit, creditStyle]}>
          Made by Ahmed rahal
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#e50914",
  },
  center: {
    alignItems: "center",
    gap: 0,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  letterN: {
    fontSize: 88,
    fontWeight: "900",
    color: "#e50914",
    fontFamily: "Inter_700Bold",
    letterSpacing: -3,
    lineHeight: 96,
    textShadow: "0px 0px 24px #e50914",
  },
  wordText: {
    fontSize: 52,
    fontWeight: "900",
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    lineHeight: 96,
    paddingBottom: 4,
  },
  underline: {
    height: 3,
    backgroundColor: "#e50914",
    borderRadius: 2,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  credit: {
    marginTop: 20,
    fontSize: 12,
    color: "#888",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
