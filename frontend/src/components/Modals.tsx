import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { colors, radii, spacing } from "../theme";

export function PromptModal({
  visible,
  title,
  initialValue = "",
  placeholder,
  confirmText = "OK",
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  React.useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={styles.card} testID="prompt-modal">
          <Text style={styles.title}>{title}</Text>
          <TextInput
            testID="prompt-input"
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            autoFocus
            style={styles.input}
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnSec]}>
              <Text style={{ color: colors.white, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="prompt-confirm"
              onPress={() => {
                if (value.trim()) onConfirm(value.trim());
              }}
              style={[styles.btn, styles.btnPri]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={{ color: colors.muted, marginTop: 8 }}>{message}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnSec]}>
              <Text style={{ color: colors.white, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.btn, danger ? { backgroundColor: colors.danger } : styles.btnPri]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.white, fontSize: 18, fontWeight: "700" },
  input: {
    marginTop: spacing.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 48,
    color: colors.white,
    fontSize: 15,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: spacing.lg },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radii.md },
  btnSec: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  btnPri: { backgroundColor: colors.primary },
});
