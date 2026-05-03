import React, { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { api, formatBytes, timeAgo } from "../../src/api/client";
import { colors, radii, spacing } from "../../src/theme";
import TopBar from "../../src/components/TopBar";
import { SidebarToggleCtx } from "./_layout";

type Stats = {
  total_files: number;
  total_folders: number;
  starred: number;
  trashed: number;
  storage_used: number;
  storage_quota: number;
  storage_pct: number;
};

type Activity = {
  id: string;
  action: string;
  target_type: string;
  target_name: string;
  timestamp: string;
};

const QUICK = [
  { label: "Documents", icon: "document-text", color: colors.accent, kind: "document" },
  { label: "Images", icon: "image", color: colors.accent, kind: "image" },
  { label: "Videos", icon: "play-circle", color: colors.purple, kind: "video" },
  { label: "Audio", icon: "musical-notes", color: colors.accent, kind: "audio" },
  { label: "Archives", icon: "archive", color: colors.warning, kind: "archive" },
] as const;

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const { open } = useContext(SidebarToggleCtx);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, a] = await Promise.all([api.get("/stats"), api.get("/activity?limit=6")]);
      setStats(s.data);
      setActivity(a.data);
    } catch {}
  };

  useFocusEffect(
    useCallback(() => {
      load();
      refresh();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    await refresh();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <View style={{ flex: 1 }} testID="dashboard-screen">
      <TopBar
        title="Dashboard"
        onMenu={open}
        onUploaded={load}
        onNewFolder={() => router.push("/(app)/files")}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.greeting}>
          Good to see you, <Text style={{ color: colors.accent }}>{user?.name?.split(" ")[0] || user?.email}</Text>
        </Text>
        <Text style={styles.date}>{today}</Text>

        <TouchableOpacity style={styles.uploadCard} onPress={() => router.push("/(app)/files")} testID="upload-card">
          <View style={styles.uploadIcon}>
            <Ionicons name="cloud-upload" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadTitle}>Upload files</Text>
            <Text style={styles.uploadSub}>Tap here to open My Files and upload</Text>
          </View>
          <Ionicons name="add" size={28} color={colors.accent} />
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <StatTile icon="document-text" label="Total Files" value={stats?.total_files ?? 0} tint={colors.accent} />
          <StatTile icon="folder" label="Folders" value={stats?.total_folders ?? 0} tint={colors.purple} />
        </View>
        <View style={styles.statsRow}>
          <StatTile icon="star" label="Starred" value={stats?.starred ?? 0} tint={colors.accent} />
          <StatTile icon="cloud" label="Storage Used" value={`${stats?.storage_pct?.toFixed?.(0) ?? 0}%`} tint={colors.success} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <TouchableOpacity onPress={() => router.push("/(app)/files")}>
              <Text style={styles.link}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {QUICK.map((q) => (
              <TouchableOpacity
                key={q.label}
                style={styles.quickChip}
                onPress={() => router.push(`/(app)/files?kind=${q.kind}`)}
                testID={`quick-${q.kind}`}
              >
                <View style={[styles.quickIcon, { backgroundColor: "#fff" }]}>
                  <Ionicons name={q.icon as any} size={22} color={q.color} />
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/(app)/activity")}>
              <Text style={styles.link}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityCard}>
            {activity.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: "center", padding: 16 }}>
                No activity yet. Upload your first file to get started!
              </Text>
            ) : (
              activity.map((a, idx) => (
                <View key={a.id} style={[styles.activityRow, idx === activity.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.activityIcon}>
                    <Ionicons
                      name={
                        a.action === "uploaded"
                          ? "cloud-upload"
                          : a.action === "deleted"
                          ? "trash"
                          : a.action === "renamed"
                          ? "pencil"
                          : a.action === "trashed"
                          ? "trash-bin"
                          : a.action === "restored"
                          ? "refresh"
                          : a.action === "shared"
                          ? "link"
                          : a.action === "starred"
                          ? "star"
                          : "pulse"
                      }
                      size={16}
                      color={colors.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityName} numberOfLines={1}>{a.target_name}</Text>
                    <Text style={styles.activityMeta}>
                      {a.action.charAt(0).toUpperCase() + a.action.slice(1)} · {timeAgo(a.timestamp)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatTile({ icon, label, value, tint }: { icon: any; label: string; value: any; tint: string }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: "rgba(59,130,246,0.1)" }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: 80 },
  greeting: { color: colors.white, fontSize: 24, fontWeight: "800", marginTop: 8 },
  date: { color: colors.muted, marginTop: 4 },
  uploadCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: { color: colors.accent, fontWeight: "800", fontSize: 18 },
  uploadSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { color: colors.muted, marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: colors.white, fontSize: 16, fontWeight: "700" },
  link: { color: colors.accent, fontWeight: "600" },
  quickChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    width: 110,
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickLabel: { color: colors.white, fontWeight: "700", fontSize: 13 },
  activityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: "rgba(59,130,246,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  activityName: { color: colors.white, fontWeight: "600" },
  activityMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
