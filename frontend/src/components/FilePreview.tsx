import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, Image, TouchableOpacity, Platform, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../theme";
import { formatBytes, formatDate, getApiBase, getToken } from "../api/client";
import type { FileItem } from "./FileCards";

export default function FilePreview({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      setUrl(`${getApiBase()}/files/${file.id}/content?token=${t}`);
    })();
  }, [file.id]);

  const isImage = file.kind === "image" || (file.mime || "").startsWith("image/");
  const isPdf = file.kind === "pdf" || file.mime === "application/pdf";
  const isVideo = file.kind === "video" || (file.mime || "").startsWith("video/");
  const isAudio = file.kind === "audio" || (file.mime || "").startsWith("audio/");

  const renderViewer = () => {
    if (!url) return <ActivityIndicator color={colors.accent} />;
    if (isImage) return <Image source={{ uri: url }} style={styles.image} resizeMode="contain" />;
    if (Platform.OS === "web") {
      if (isPdf) return <iframe src={url} style={{ width: "100%", height: "100%", border: 0 }} title={file.name} />;
      if (isVideo) return <video src={url} controls style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />;
      if (isAudio) return <audio src={url} controls style={{ width: "100%" }} />;
    }
    return (
      <View style={styles.noPreview}>
        <Ionicons name="document" size={64} color={colors.accent} />
        <Text style={styles.noPreviewTxt}>Preview not available here.{"\n"}Tap below to open or download.</Text>
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => {
            if (url) Linking.openURL(url);
          }}
        >
          <Ionicons name="open-outline" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700" }}>Open file</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{file.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="preview-close">
              <Ionicons name="close" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.viewer}>{renderViewer()}</View>
          <View style={styles.meta}>
            <Text style={styles.metaTxt}>{formatBytes(file.size)} · {formatDate(file.created_at)}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center", padding: 16 },
  card: {
    width: "100%",
    maxWidth: 900,
    height: "90%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.white, fontWeight: "700", fontSize: 16, flex: 1 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radii.sm, backgroundColor: colors.bg },
  viewer: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  noPreview: { alignItems: "center", gap: 12, padding: 16 },
  noPreviewTxt: { color: colors.muted, textAlign: "center" },
  openBtn: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: radii.md, alignItems: "center" },
  meta: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  metaTxt: { color: colors.muted, fontSize: 13 },
});
