import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "../theme";
import { formatBytes, formatDate, getApiBase, getToken } from "../api/client";

export type FileItem = {
  id: string;
  name: string;
  mime?: string;
  kind?: string;
  size: number;
  starred?: boolean;
  trashed?: boolean;
  folder_id?: string | null;
  created_at: string;
  updated_at?: string;
  share_token?: string | null;
};

export type FolderItem = {
  id: string;
  name: string;
  parent_id?: string | null;
  created_at: string;
};

const iconForKind = (kind?: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  switch (kind) {
    case "image":
      return { name: "image", color: colors.accent };
    case "video":
      return { name: "play-circle", color: colors.purple };
    case "audio":
      return { name: "musical-notes", color: colors.accent };
    case "pdf":
      return { name: "document-text", color: "#EF4444" };
    case "archive":
      return { name: "archive", color: colors.warning };
    case "spreadsheet":
      return { name: "grid", color: colors.success };
    default:
      return { name: "document", color: colors.accent };
  }
};

export function FolderCard({ folder, onOpen, onRename, onDelete, view = "grid" }: {
  folder: FolderItem;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  view?: "grid" | "list";
}) {
  if (view === "list") {
    return (
      <TouchableOpacity style={styles.listRow} onPress={onOpen} testID={`folder-${folder.id}`}>
        <Ionicons name="folder" size={24} color={colors.accent} />
        <Text style={styles.listName} numberOfLines={1}>{folder.name}</Text>
        <Text style={styles.listMeta}>Folder</Text>
        <Text style={styles.listMeta}>{formatDate(folder.created_at)}</Text>
        <TouchableOpacity onPress={onRename} style={styles.roundBtnSm}>
          <Ionicons name="pencil" size={14} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.roundBtnSm}>
          <Ionicons name="trash" size={14} color={colors.accent} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} testID={`folder-${folder.id}`}>
      <View style={styles.folderIconWrap}>
        <Ionicons name="folder" size={52} color={colors.accent} />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>{folder.name}</Text>
      <Text style={styles.cardSub}>Tap to open</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onRename} style={styles.roundBtn} testID={`folder-rename-${folder.id}`}>
          <Ionicons name="pencil" size={15} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.roundBtn} testID={`folder-delete-${folder.id}`}>
          <Ionicons name="trash" size={15} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function FileCard({
  file,
  view = "grid",
  onDownload,
  onShare,
  onTrash,
  onRename,
  onStar,
  onPreview,
  onRestore,
  onPermanentDelete,
  trashMode = false,
}: {
  file: FileItem;
  view?: "grid" | "list";
  onDownload?: () => void;
  onShare?: () => void;
  onTrash?: () => void;
  onRename?: () => void;
  onStar?: () => void;
  onPreview?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  trashMode?: boolean;
}) {
  const { name: icon, color } = iconForKind(file.kind);

  if (view === "list") {
    return (
      <TouchableOpacity style={styles.listRow} onPress={onPreview} testID={`file-${file.id}`}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={styles.listName} numberOfLines={1}>{file.name}</Text>
        <Text style={styles.listMeta}>{formatBytes(file.size)}</Text>
        <Text style={styles.listMeta}>{formatDate(file.created_at)}</Text>
        {trashMode ? (
          <>
            <TouchableOpacity onPress={onRestore} style={styles.roundBtnSm}><Ionicons name="refresh" size={14} color={colors.accent} /></TouchableOpacity>
            <TouchableOpacity onPress={onPermanentDelete} style={styles.roundBtnSm}><Ionicons name="close" size={14} color={colors.danger} /></TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={onStar} style={styles.roundBtnSm}><Ionicons name={file.starred ? "star" : "star-outline"} size={14} color={colors.warning} /></TouchableOpacity>
            <TouchableOpacity onPress={onDownload} style={styles.roundBtnSm}><Ionicons name="download" size={14} color={colors.accent} /></TouchableOpacity>
            <TouchableOpacity onPress={onShare} style={styles.roundBtnSm}><Ionicons name="link" size={14} color={colors.accent} /></TouchableOpacity>
            <TouchableOpacity onPress={onTrash} style={styles.roundBtnSm}><Ionicons name="trash" size={14} color={colors.accent} /></TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPreview} testID={`file-${file.id}`}>
      <View style={styles.fileIconWrap}>
        <Ionicons name={icon} size={48} color={color} />
      </View>
      <Text style={styles.cardName} numberOfLines={1}>{file.name}</Text>
      <Text style={styles.cardSub}>
        {formatBytes(file.size)} · {formatDate(file.created_at)}
      </Text>
      <View style={styles.actionRow}>
        {trashMode ? (
          <>
            <TouchableOpacity onPress={onRestore} style={styles.roundBtn}>
              <Ionicons name="refresh" size={15} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onPermanentDelete} style={[styles.roundBtn, { borderColor: colors.danger }]}>
              <Ionicons name="close" size={15} color={colors.danger} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={onStar} style={styles.roundBtn} testID={`file-star-${file.id}`}>
              <Ionicons name={file.starred ? "star" : "star-outline"} size={15} color={colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDownload} style={styles.roundBtn} testID={`file-download-${file.id}`}>
              <Ionicons name="download" size={15} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShare} style={styles.roundBtn} testID={`file-share-${file.id}`}>
              <Ionicons name="link" size={15} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onTrash} style={styles.roundBtn} testID={`file-trash-${file.id}`}>
              <Ionicons name="trash" size={15} color={colors.accent} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export async function downloadFile(file: FileItem) {
  const token = await getToken();
  const url = `${getApiBase()}/files/${file.id}/content?token=${token}`;
  if (Platform.OS === "web") {
    // Use programmatic anchor with fetch to respect auth header-free query variant
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    await Linking.openURL(url);
  }
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    margin: 6,
  },
  folderIconWrap: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  fileIconWrap: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cardName: { color: colors.white, fontWeight: "700", fontSize: 14, marginTop: 4, textAlign: "center" },
  cardSub: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  roundBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
    backgroundColor: "rgba(59,130,246,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  roundBtnSm: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listName: { color: colors.white, flex: 1, fontWeight: "600", fontSize: 14 },
  listMeta: { color: colors.muted, fontSize: 12, minWidth: 80, textAlign: "right" },
});
