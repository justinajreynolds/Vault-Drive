import React, { useContext } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TopBar from "../../src/components/TopBar";
import { colors, radii, spacing } from "../../src/theme";
import { useAuth } from "../../src/contexts/AuthContext";
import { formatBytes, getApiBase, getToken } from "../../src/api/client";
import { SidebarToggleCtx } from "./_layout";

export default function Profile() {
  const { user, logout } = useAuth();
  const { open } = useContext(SidebarToggleCtx);
  const router = useRouter();

  const exportFile = async (format: "docx" | "xlsx") => {
    try {
      const token = await getToken();
      const url = `${getApiBase()}/export/${format}?token=${token}`;
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.download = `VaultDrive_Files.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Alert.alert("Export failed", e.message || "Could not export");
    }
  };

  const pct = user ? Math.min(100, (user.storage_used / user.storage_quota) * 100) : 0;

  return (
    <View style={{ flex: 1 }} testID="profile-screen">
      <TopBar title="Profile" onMenu={open} showFolder={false} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.planBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.white} />
            <Text style={styles.planBadgeTxt}>{(user?.plan || "free").replace("_", " ").toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          <View style={styles.card}>
            <View style={styles.storageRow}>
              <Text style={styles.storageValue}>{formatBytes(user?.storage_used || 0)}</Text>
              <Text style={styles.storageOf}>of {formatBytes(user?.storage_quota || 0)}</Text>
            </View>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push("/(app)/plans")} testID="profile-upgrade">
              <Ionicons name="rocket" size={16} color="#fff" />
              <Text style={styles.upgradeTxt}>Upgrade plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <View style={styles.card}>
            <ExportRow
              icon="document-text"
              title="Export to Microsoft Word"
              sub="Download all files metadata as .docx"
              onPress={() => exportFile("docx")}
              testID="export-docx"
            />
            <ExportRow
              icon="grid"
              title="Export to Excel"
              sub="Download all files metadata as .xlsx"
              onPress={() => exportFile("xlsx")}
              testID="export-xlsx"
            />
            <ExportRow
              icon="logo-google"
              title="Export to Google Docs"
              sub="Download .docx — compatible with Google Docs"
              onPress={() => exportFile("docx")}
              testID="export-gdocs"
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            testID="profile-signout"
            style={styles.signout}
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={styles.signoutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function ExportRow({ icon, title, sub, onPress, testID, last }: any) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={[styles.row, last && { borderBottomWidth: 0 }]}
    >
      <View style={styles.rowIcon}><Ionicons name={icon} size={20} color={colors.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="download" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingVertical: spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { color: colors.white, fontSize: 20, fontWeight: "800", marginTop: 12 },
  email: { color: colors.muted, marginTop: 2 },
  planBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, marginTop: 10,
  },
  planBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.muted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  storageRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  storageValue: { color: colors.white, fontSize: 22, fontWeight: "800" },
  storageOf: { color: colors.muted },
  bar: { height: 6, backgroundColor: "rgba(148,163,184,0.2)", borderRadius: 3, marginTop: 10, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.accent },
  upgradeBtn: {
    marginTop: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radii.md,
  },
  upgradeTxt: { color: "#fff", fontWeight: "700" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(59,130,246,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  rowTitle: { color: colors.white, fontWeight: "600" },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  signout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)", padding: 14, borderRadius: radii.md,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.4)",
  },
  signoutTxt: { color: colors.danger, fontWeight: "700" },
});
