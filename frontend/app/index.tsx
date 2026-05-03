import { useEffect } from "react";
import { View, ActivityIndicator, Image, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";
import { colors, LOGO_URL } from "../src/theme";

export default function Index() {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) router.replace("/(app)/dashboard");
      else router.replace("/(auth)/login");
    }
  }, [loading, user]);

  return (
    <View style={styles.root} testID="splash-screen">
      <Image source={{ uri: LOGO_URL }} style={styles.logo} resizeMode="contain" />
      <Text style={styles.tagline}>Store Secure. Access Anywhere.</Text>
      <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: { width: 220, height: 220 },
  tagline: { color: colors.muted, fontSize: 14, letterSpacing: 1.2, marginTop: 8, textTransform: "uppercase" },
});
