import React, { useCallback, useContext, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import TopBar from "../../src/components/TopBar";
import { api, formatApiError, formatBytes } from "../../src/api/client";
import { colors, radii, spacing } from "../../src/theme";
import { SidebarToggleCtx } from "./_layout";
import { useAuth } from "../../src/contexts/AuthContext";

type Plan = { id: string; name: string; storage_bytes: number; price: number; features: string[] };

const PLAN_ICONS: Record<string, { icon: any; color: string }> = {
  free: { icon: "sparkles", color: colors.accent },
  pro: { icon: "flash", color: colors.accent },
  premium: { icon: "diamond", color: colors.purple },
  premium_plus: { icon: "rocket", color: colors.warning },
};

export default function Plans() {
  const { open } = useContext(SidebarToggleCtx);
  const { user, refresh } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<string>("free");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/plans");
      setPlans(data.plans);
      setCurrent(data.current);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const upgrade = async (planId: string) => {
    try {
      await api.post("/plans/upgrade", { plan_id: planId });
      await refresh();
      await load();
      Alert.alert("Plan updated", "Your plan has been successfully updated.");
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  return (
    <View style={{ flex: 1 }} testID="plans-screen">
      <TopBar title="Plans & Billing" onMenu={open} showFolder={false} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.header}>Choose your plan</Text>
        <Text style={styles.sub}>Scale your vault as you grow. Cancel anytime.</Text>

        <View style={styles.usage}>
          <Text style={styles.usageText}>
            Using <Text style={{ color: colors.white, fontWeight: "700" }}>{formatBytes(user?.storage_used || 0)}</Text> of{" "}
            <Text style={{ color: colors.white, fontWeight: "700" }}>{formatBytes(user?.storage_quota || 0)}</Text>
          </Text>
        </View>

        <View style={styles.grid}>
          {plans.map((p) => {
            const isCurrent = p.id === current;
            const isPopular = p.id === "pro";
            const iconInfo = PLAN_ICONS[p.id] || { icon: "star", color: colors.accent };
            return (
              <View
                key={p.id}
                style={[
                  styles.card,
                  isPopular && styles.cardPopular,
                ]}
                testID={`plan-${p.id}`}
              >
                {isPopular && (
                  <View style={styles.pop}>
                    <Text style={styles.popTxt}>Most Popular</Text>
                  </View>
                )}
                <View style={[styles.planIcon, { backgroundColor: iconInfo.color + "33" }]}>
                  <Ionicons name={iconInfo.icon} size={22} color={iconInfo.color} />
                </View>
                <Text style={styles.planName}>{p.name}</Text>
                <Text style={styles.planStorage}>{formatBytes(p.storage_bytes)}</Text>
                <Text style={styles.price}>
                  ${p.price.toFixed(2)}
                  <Text style={styles.priceUnit}>/month</Text>
                </Text>
                <View style={{ marginTop: 12, gap: 8 }}>
                  {p.features.map((f) => (
                    <View key={f} style={styles.feature}>
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
                {isCurrent ? (
                  <View style={[styles.btn, styles.btnCurrent]}>
                    <Text style={styles.btnCurrentTxt}>Current plan</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    testID={`upgrade-${p.id}`}
                    style={[styles.btn, styles.btnUpgrade]}
                    onPress={() => upgrade(p.id)}
                  >
                    <Text style={styles.btnUpgradeTxt}>Upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { color: colors.white, fontSize: 28, fontWeight: "800", textAlign: "center", marginTop: 8 },
  sub: { color: colors.muted, textAlign: "center", marginTop: 6, marginBottom: spacing.lg },
  usage: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  usageText: { color: colors.muted, fontSize: 13 },
  grid: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    position: "relative",
  },
  cardPopular: { borderColor: colors.accent, borderWidth: 2, shadowColor: colors.accent, shadowOpacity: 0.2, shadowRadius: 12 },
  pop: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  popTxt: {
    backgroundColor: colors.accent,
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  planIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  planName: { color: colors.white, fontSize: 22, fontWeight: "800" },
  planStorage: { color: colors.muted, marginTop: 2 },
  price: { color: colors.white, fontSize: 32, fontWeight: "800", marginTop: 12 },
  priceUnit: { color: colors.muted, fontSize: 14, fontWeight: "500" },
  feature: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: colors.white },
  btn: {
    marginTop: spacing.lg,
    height: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCurrent: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  btnCurrentTxt: { color: colors.muted, fontWeight: "600" },
  btnUpgrade: { backgroundColor: colors.primary },
  btnUpgradeTxt: { color: "#fff", fontWeight: "700" },
});
