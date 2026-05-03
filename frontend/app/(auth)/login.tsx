import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { colors, LOGO_URL, radii, spacing } from "../../src/theme";
import { formatApiError } from "../../src/api/client";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter email and password");
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
      router.replace("/(app)/dashboard");
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      testID="login-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>STORE SECURE · ACCESS ANYWHERE</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to access your secure vault</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={colors.muted} />
            <TextInput
              testID="login-email-input"
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
            <TextInput
              testID="login-password-input"
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} testID="toggle-password">
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {!!error && (
            <Text testID="login-error" style={styles.error}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            testID="login-submit"
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={{ color: colors.muted }}>New to Vault Drive?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity testID="goto-register">
                <Text style={styles.link}> Create an account</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.hint}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.accent} />
            <Text style={styles.hintText}>
              Demo: admin@vaultdrive.app / Admin@12345
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: spacing.lg },
  logo: { width: 150, height: 150 },
  tagline: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: -8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  title: { color: colors.white, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  label: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 48,
  },
  input: { flex: 1, color: colors.white, fontSize: 15, height: "100%" },
  error: {
    color: colors.danger,
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 10,
    borderRadius: radii.sm,
    marginTop: spacing.md,
    fontSize: 13,
  },
  btn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
  },
  link: { color: colors.accent, fontWeight: "600" },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: spacing.md,
    padding: 8,
    borderRadius: radii.sm,
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  hintText: { color: colors.accent, fontSize: 12 },
});
