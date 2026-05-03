import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, LOGO_URL, radii, spacing } from "../theme";
import { useAuth } from "../contexts/AuthContext";
import { formatBytes } from "../api/client";

type Item = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; href: string };

const ITEMS: Item[] = [
  { key: "dashboard", label: "Dashboard", icon: "home", href: "/(app)/dashboard" },
  { key: "files", label: "My Files", icon: "folder", href: "/(app)/files" },
  { key: "recent", label: "Recent", icon: "time", href: "/(app)/recent" },
  { key: "starred", label: "Starred", icon: "star", href: "/(app)/starred" },
  { key: "activity", label: "Activity", icon: "pulse", href: "/(app)/activity" },
  { key: "trash", label: "Trash", icon: "trash", href: "/(app)/trash" },
  { key: "plans", label: "Plans & Billing", icon: "flash", href: "/(app)/plans" },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const go = (href: string) => {
    router.push(href as any);
    onNavigate?.();
  };

  const storagePct = user ? Math.min(100, (user.storage_used / user.storage_quota) * 100) : 0;
  const planLabel = user?.plan === "free" ? "Free Plan" : (user?.plan || "").replace("_", " ").toUpperCase();

  return (
    <View style={[styles.sidebar, !isWide && styles.sidebarMobile]} testID="app-sidebar">
      <View style={styles.brand}>
        <View style={styles.brandLogoWrap}>
          <Image source={{ uri: LOGO_URL }} style={styles.brandLogo} resizeMode="contain" />
        </View>
        <View>
          <Text style={styles.brandTitle}>VaultDrive</Text>
          <Text style={styles.brandSub}>SECURE CLOUD</Text>
        </View>
      </View>

      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {ITEMS.map((it) => {
          const active = pathname?.startsWith(it.href) || pathname?.endsWith("/" + it.key);
          return (
            <TouchableOpacity
              key={it.key}
              testID={`nav-${it.key}`}
              onPress={() => go(it.href)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <View style={[styles.navIcon, active && styles.navIconActive]}>
                <Ionicons name={it.icon} size={18} color={active ? colors.white : colors.accent} />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{it.label}</Text>
              {active && <View style={styles.navDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.storageCard}>
          <View style={styles.storageHeader}>
            <View style={styles.storageIcon}>
              <Ionicons name="cloud" size={18} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storageLabel}>STORAGE</Text>
              <Text style={styles.storageValue}>
                {formatBytes(user?.storage_used || 0)}{" "}
                <Text style={styles.storageOf}>of {formatBytes(user?.storage_quota || 0)}</Text>
              </Text>
              <Text style={styles.storagePlan}>{planLabel}</Text>
            </View>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${storagePct}%` }]} />
          </View>
          <TouchableOpacity
            testID="upgrade-plan-btn"
            style={styles.upgradeBtn}
            onPress={() => go("/(app)/plans")}
          >
            <Text style={styles.upgradeTxt}>Upgrade plan</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.userRow} onPress={() => go("/(app)/profile")} testID="sidebar-profile">
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "User"}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="signout-btn"
          onPress={async () => {
            await logout();
            router.replace("/(auth)/login");
          }}
          style={styles.signoutBtn}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.white} />
          <Text style={styles.signoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: spacing.md,
    flex: 1,
  },
  sidebarMobile: { width: 290 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: { width: 36, height: 36 },
  brandTitle: { color: colors.white, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  brandSub: { color: colors.muted, fontSize: 9, letterSpacing: 2, marginTop: 2 },
  nav: { flex: 1, paddingTop: spacing.md, paddingHorizontal: spacing.sm },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginBottom: 4,
  },
  navItemActive: { backgroundColor: colors.bg, borderWidth: 1, borderColor: "rgba(59,130,246,0.3)" },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: { backgroundColor: colors.primary },
  navLabel: { color: colors.muted, fontSize: 15, fontWeight: "500", flex: 1 },
  navLabelActive: { color: colors.white, fontWeight: "700" },
  navDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },

  bottom: { paddingHorizontal: spacing.sm, gap: 10 },
  storageCard: { backgroundColor: colors.bg, borderRadius: radii.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  storageHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  storageIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  storageLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5 },
  storageValue: { color: colors.white, fontSize: 14, fontWeight: "700", marginTop: 2 },
  storageOf: { color: colors.muted, fontWeight: "400" },
  storagePlan: { color: colors.accent, fontSize: 11, marginTop: 2 },
  bar: { height: 4, backgroundColor: "rgba(148,163,184,0.2)", borderRadius: 2, marginTop: 10, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.accent },
  upgradeBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  upgradeTxt: { color: "#fff", fontWeight: "700" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontWeight: "800" },
  userName: { color: colors.white, fontWeight: "600", fontSize: 13 },
  userEmail: { color: colors.muted, fontSize: 11 },
  signoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signoutTxt: { color: colors.white, fontWeight: "600" },
});
