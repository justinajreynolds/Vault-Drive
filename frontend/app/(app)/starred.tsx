import React, { useCallback, useContext, useState } from "react";
import { View, ScrollView, StyleSheet, Alert, RefreshControl, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import TopBar from "../../src/components/TopBar";
import { api, formatApiError } from "../../src/api/client";
import { colors, spacing } from "../../src/theme";
import { FileCard, FileItem, downloadFile } from "../../src/components/FileCards";
import FilePreview from "../../src/components/FilePreview";
import { SidebarToggleCtx } from "./_layout";

export default function Starred() {
  const { open } = useContext(SidebarToggleCtx);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/files`, { params: { starred: true } });
      setFiles(data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1 }} testID="starred-screen">
      <TopBar title="Starred" onMenu={open} onUploaded={load} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {files.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", padding: 32 }}>
            No starred files yet. Star a file from My Files to keep it handy here.
          </Text>
        ) : (
          <View style={styles.grid}>
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                view="grid"
                onPreview={() => setPreview(f)}
                onDownload={() => downloadFile(f)}
                onStar={async () => { try { await api.post(`/files/${f.id}/star`); load(); } catch (e) { Alert.alert("Error", formatApiError(e)); } }}
                onTrash={async () => { try { await api.post(`/files/${f.id}/trash`); load(); } catch (e) { Alert.alert("Error", formatApiError(e)); } }}
                onShare={async () => { try { const { data } = await api.post(`/files/${f.id}/share`); Alert.alert("Share link", data.share_token); } catch (e) { Alert.alert("Error", formatApiError(e)); } }}
              />
            ))}
          </View>
        )}
      </ScrollView>
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
