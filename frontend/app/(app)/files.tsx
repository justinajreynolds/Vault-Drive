import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import TopBar from "../../src/components/TopBar";
import { api, formatApiError, getApiBase } from "../../src/api/client";
import { colors, radii, spacing } from "../../src/theme";
import { SidebarToggleCtx } from "./_layout";
import { FileCard, FolderCard, FileItem, FolderItem, downloadFile } from "../../src/components/FileCards";
import { ConfirmModal, PromptModal } from "../../src/components/Modals";
import FilePreview from "../../src/components/FilePreview";

export default function FilesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ folder?: string; kind?: string }>();
  const { open } = useContext(SidebarToggleCtx);
  const folderId = (params.folder as string) || null;
  const kindFilter = (params.kind as string) || null;

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderItem[]>([]);

  const [showFolderPrompt, setShowFolderPrompt] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const load = async () => {
    try {
      const folderParams: any = folderId ? { parent_id: folderId } : {};
      const fileParams: any = {};
      if (folderId) fileParams.folder_id = folderId;
      if (search) fileParams.search = search;
      const [fo, fi] = await Promise.all([
        api.get(`/folders`, { params: folderParams }),
        api.get(`/files`, { params: fileParams }),
      ]);
      setFolders(fo.data);
      let data: FileItem[] = fi.data;
      if (kindFilter) data = data.filter((f) => f.kind === kindFilter);
      setFiles(data);
      if (folderId) {
        try {
          const crumbs: FolderItem[] = [];
          const { data: all } = await api.get(`/folders`, { params: { all: true } });
          const map = new Map<string, FolderItem>();
          (all as FolderItem[]).forEach((f) => map.set(f.id, f));
          let currentId: string | null = folderId;
          const seen = new Set<string>();
          while (currentId && !seen.has(currentId)) {
            seen.add(currentId);
            const f = map.get(currentId);
            if (!f) break;
            crumbs.unshift(f);
            currentId = f.parent_id || null;
          }
          setBreadcrumbs(crumbs);
        } catch {
          setBreadcrumbs([]);
        }
      } else {
        setBreadcrumbs([]);
      }
    } catch (e) {
      // swallow
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [folderId, kindFilter, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const createFolder = async (name: string) => {
    try {
      await api.post("/folders", { name, parent_id: folderId });
      setShowFolderPrompt(false);
      await load();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const doRename = async (newName: string) => {
    if (!renameTarget) return;
    try {
      if (renameTarget.type === "file") {
        await api.put(`/files/${renameTarget.id}`, { name: newName });
      } else {
        await api.put(`/folders/${renameTarget.id}`, { name: newName });
      }
      setRenameTarget(null);
      await load();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "file") {
        await api.post(`/files/${confirmDelete.id}/trash`);
      } else {
        await api.delete(`/folders/${confirmDelete.id}`);
      }
      setConfirmDelete(null);
      await load();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const starFile = async (f: FileItem) => {
    try {
      await api.post(`/files/${f.id}/star`);
      await load();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const shareFile = async (f: FileItem) => {
    try {
      const { data } = await api.post(`/files/${f.id}/share`);
      const link = `${getApiBase()}/public/${data.share_token}/content`;
      if (Platform.OS === "web" && (navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(link);
      } else {
        try { (Clipboard as any).setString?.(link); } catch {}
      }
      Alert.alert("Share link copied", link);
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const title = kindFilter ? `${kindFilter.charAt(0).toUpperCase() + kindFilter.slice(1)}s` : "My Files";

  return (
    <View style={{ flex: 1 }} testID="files-screen">
      <TopBar
        title={title}
        onMenu={open}
        onSearch={setSearch}
        onNewFolder={() => setShowFolderPrompt(true)}
        onUploaded={load}
        currentFolderId={folderId}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity onPress={() => router.push("/(app)/files")}>
            <Text style={[styles.breadcrumb, !folderId && styles.breadcrumbActive]}>My Files</Text>
          </TouchableOpacity>
          {breadcrumbs.map((b, i) => (
            <View key={b.id} style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              <TouchableOpacity onPress={() => router.push({ pathname: "/(app)/files", params: { folder: b.id } })}>
                <Text style={[styles.breadcrumb, i === breadcrumbs.length - 1 && styles.breadcrumbActive]}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {title} <Text style={styles.count}>{folders.length + files.length} items</Text>
          </Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              testID="view-grid"
              onPress={() => setView("grid")}
              style={[styles.toggleBtn, view === "grid" && styles.toggleBtnActive]}
            >
              <Ionicons name="grid" size={16} color={view === "grid" ? colors.accent : colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="view-list"
              onPress={() => setView("list")}
              style={[styles.toggleBtn, view === "list" && styles.toggleBtnActive]}
            >
              <Ionicons name="list" size={16} color={view === "list" ? colors.accent : colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {folders.length === 0 && files.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-upload-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyTitle}>No files yet</Text>
            <Text style={styles.emptySub}>Tap Upload to add your first file</Text>
          </View>
        ) : (
          <View style={view === "grid" ? styles.gridWrap : undefined}>
            {folders.map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                view={view}
                onOpen={() => router.push({ pathname: "/(app)/files", params: { folder: f.id } })}
                onRename={() => setRenameTarget({ type: "folder", id: f.id, name: f.name })}
                onDelete={() => setConfirmDelete({ type: "folder", id: f.id, name: f.name })}
              />
            ))}
            {files.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                view={view}
                onPreview={() => setPreviewFile(f)}
                onDownload={() => downloadFile(f)}
                onShare={() => shareFile(f)}
                onTrash={() => setConfirmDelete({ type: "file", id: f.id, name: f.name })}
                onStar={() => starFile(f)}
                onRename={() => setRenameTarget({ type: "file", id: f.id, name: f.name })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <PromptModal
        visible={showFolderPrompt}
        title="New folder"
        placeholder="Folder name"
        confirmText="Create"
        onClose={() => setShowFolderPrompt(false)}
        onConfirm={createFolder}
      />
      <PromptModal
        visible={!!renameTarget}
        title={renameTarget?.type === "folder" ? "Rename folder" : "Rename file"}
        initialValue={renameTarget?.name || ""}
        confirmText="Rename"
        onClose={() => setRenameTarget(null)}
        onConfirm={doRename}
      />
      <ConfirmModal
        visible={!!confirmDelete}
        title="Move to trash"
        message={`"${confirmDelete?.name}" will be moved to Trash.`}
        confirmText="Move to Trash"
        danger
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
      />
      {previewFile && <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  breadcrumbRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  breadcrumb: { color: colors.muted, fontSize: 13, paddingHorizontal: 4 },
  breadcrumbActive: { color: colors.white, fontWeight: "700" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { color: colors.white, fontSize: 20, fontWeight: "800" },
  count: { color: colors.muted, fontSize: 13, fontWeight: "500" },
  viewToggle: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  toggleBtn: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  toggleBtnActive: { backgroundColor: colors.bg, borderRadius: radii.md },
  gridWrap: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  empty: { alignItems: "center", padding: 48, opacity: 0.7 },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptySub: { color: colors.muted, marginTop: 4 },
});
