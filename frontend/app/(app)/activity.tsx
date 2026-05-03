import React, { useCallback, useContext, useState } from "react";
import { View, ScrollView, StyleSheet, Text, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import TopBar from "../../src/components/TopBar";
import { api, timeAgo } from "../../src/api/client";
import { colors, radii, spacing } from "../../src/theme";
import { SidebarToggleCtx } from "./_layout";

type Activity = { id: string; action: string; target_type: string; target_name: string; timestamp: string };

const ICONS: Record<string, string> = {
  uploaded: "cloud-upload",
  deleted: "trash",
  renamed: "pencil",
  trashed: "trash-bin",
  restored: "refresh",
  shared: "link",
  starred: "star",
  unstarred: "star-outline",
  downloaded: "download",
  created: "add-circle",
  upgraded: "rocket",
  exported: "document-text",
};

export default function Activity() {
  const { open } = useContext(SidebarToggleCtx);
  const [items, setItems] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/activity", { params: { limit: 100 } });
      setItems(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1 }} testID="activity-screen">
      <TopBar title="Activity Timeline" onMenu={open} onUploaded={load} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {items.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", padding: 32 }}>No activity yet</Text>
        ) : (
          <View style={styles.timeline}>
            {items.map((a, i) => (
              <View key={a.id} style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name={(ICONS[a.action] as any) || "pulse"} size={16} color={colors.accent} />
                </View>
                {i < items.length - 1 && <View style={styles.line} />}
                <View style={styles.content}>
                  <Text style={styles.action}>
                    <Text style={styles.actionBold}>{a.action.charAt(0).toUpperCase() + a.action.slice(1)}</Text>
                    {" "}
                    <Text style={styles.dim}>a {a.target_type}</Text>
                  </Text>
                  <Text style={styles.name} numberOfLines={1}>{a.target_name}</Text>
                  <Text style={styles.time}>{timeAgo(a.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {},
  row: { flexDirection: "row", gap: 12, marginBottom: 16, position: "relative" },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
    zIndex: 1,
  },
  line: { position: "absolute", left: 17, top: 36, width: 2, bottom: -16, backgroundColor: colors.border },
  content: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  action: { color: colors.muted, fontSize: 13 },
  actionBold: { color: colors.accent, fontWeight: "700" },
  dim: { color: colors.muted },
  name: { color: colors.white, fontWeight: "600", marginTop: 2 },
  time: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
