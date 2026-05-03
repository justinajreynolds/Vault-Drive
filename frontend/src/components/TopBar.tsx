import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { colors, radii, spacing } from "../theme";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError, getApiBase, getToken } from "../api/client";

type Props = {
  title: string;
  onMenu?: () => void;
  onSearch?: (q: string) => void;
  onNewFolder?: () => void;
  onUploaded?: () => void;
  showFolder?: boolean;
  currentFolderId?: string | null;
};

export default function TopBar({
  title,
  onMenu,
  onSearch,
  onNewFolder,
  onUploaded,
  showFolder = true,
  currentFolderId = null,
}: Props) {
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const { user, refresh } = useAuth();

  const doUpload = async () => {
    try {
      setUploading(true);
      const res = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      const token = await getToken();
      for (const asset of res.assets) {
        const form = new FormData();
        if (Platform.OS === "web") {
          // On web, asset.file is a File object
          const fileObj = (asset as any).file;
          if (fileObj) {
            form.append("file", fileObj, asset.name);
          } else if (asset.uri) {
            const resp = await fetch(asset.uri);
            const blob = await resp.blob();
            form.append("file", blob as any, asset.name);
          }
        } else {
          form.append("file", {
            uri: asset.uri,
            name: asset.name || "upload",
            type: asset.mimeType || "application/octet-stream",
          } as any);
        }
        if (currentFolderId) form.append("folder_id", currentFolderId);

        const r = await fetch(`${getApiBase()}/files/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || `Upload failed (${r.status})`);
        }
      }
      await refresh();
      onUploaded?.();
      Alert.alert("Upload complete", `${res.assets.length} file(s) uploaded`);
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.root} testID="topbar">
      {onMenu && (
        <TouchableOpacity onPress={onMenu} style={styles.iconBtn} testID="menu-btn">
          <Ionicons name="menu" size={20} color={colors.accent} />
        </TouchableOpacity>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.search}>
        <Ionicons name="search" size={15} color={colors.muted} />
        <TextInput
          testID="search-input"
          placeholder="Search files..."
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={(t) => {
            setQ(t);
            onSearch?.(t);
          }}
          style={styles.searchInput}
        />
      </View>

      {showFolder && (
        <TouchableOpacity testID="new-folder-btn" onPress={onNewFolder} style={styles.secBtn}>
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={styles.secBtnTxt}>Folder</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity testID="upload-btn" onPress={doUpload} style={styles.priBtn} disabled={uploading}>
        <Ionicons name={uploading ? "cloud-upload" : "cloud-upload-outline"} size={16} color="#fff" />
        <Text style={styles.priBtnTxt}>{uploading ? "Uploading..." : "Upload"}</Text>
      </TouchableOpacity>

      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 68,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.white, fontWeight: "700", fontSize: 16, marginLeft: 4 },
  search: {
    flex: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14, outlineStyle: "none" as any, height: "100%" },
  secBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  secBtnTxt: { color: colors.white, fontWeight: "600", fontSize: 13 },
  priBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  priBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontWeight: "800" },
});
