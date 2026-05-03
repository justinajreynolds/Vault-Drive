import React, { useCallback, useContext, useState } from "react";
import { View, ScrollView, StyleSheet, Alert, RefreshControl, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import TopBar from "../../src/components/TopBar";
import { api, formatApiError } from "../../src/api/client";
import { colors, spacing } from "../../src/theme";
import { FileCard, FileItem } from "../../src/components/FileCards";
import { ConfirmModal } from "../../src/components/Modals";
import { SidebarToggleCtx } from "./_layout";

export default function Trash() {
  const { open } = useContext(SidebarToggleCtx);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<FileItem | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/files`, { params: { trashed: true } });
      setFiles(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const restore = async (f: FileItem) => {
    try {
      await api.post(`/files/${f.id}/restore`);
      await load();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const permanentDelete = async () => {
    if (!confirm) return;
    try {
      await api.delete(`/files/${confirm.id}/permanent`);
      setConfirm(null);
      await load();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  return (
    <View style={{ flex: 1 }} testID="trash-screen">
      <TopBar title="Trash" onMenu={open} showFolder={false} onUploaded={load} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {files.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", padding: 32 }}>Trash is empty</Text>
        ) : (
          <View style={styles.grid}>
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                view="grid"
                trashMode
                onRestore={() => restore(f)}
                onPermanentDelete={() => setConfirm(f)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <ConfirmModal
        visible={!!confirm}
        title="Delete permanently"
        message={`"${confirm?.name}" will be permanently deleted. This cannot be undone.`}
        confirmText="Delete forever"
        danger
        onClose={() => setConfirm(null)}
        onConfirm={permanentDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
