import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Modal,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Slot, useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import Sidebar from "../../src/components/Sidebar";
import { colors } from "../../src/theme";

// Shared context for sidebar toggle
export const SidebarToggleCtx = React.createContext<{ open: () => void }>({ open: () => {} });

export default function AppLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/(auth)/login");
  }, [loading, user]);

  if (!user) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SidebarToggleCtx.Provider value={{ open: () => setDrawerOpen(true) }}>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <View style={styles.row}>
          {isWide && (
            <View style={styles.sidebarWrap}>
              <Sidebar />
            </View>
          )}
          <View style={styles.content}>
            <Slot />
          </View>
        </View>

        {!isWide && (
          <Modal
            visible={drawerOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setDrawerOpen(false)}
          >
            <View style={styles.drawerOverlay}>
              <View style={styles.drawerSidebar}>
                <Sidebar onNavigate={() => setDrawerOpen(false)} />
              </View>
              <TouchableOpacity
                style={styles.drawerBackdrop}
                activeOpacity={1}
                onPress={() => setDrawerOpen(false)}
              />
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </SidebarToggleCtx.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  row: { flex: 1, flexDirection: "row" },
  sidebarWrap: { width: 280 },
  content: { flex: 1, backgroundColor: colors.bg },
  drawerOverlay: { flex: 1, flexDirection: "row" },
  drawerSidebar: { width: 290, backgroundColor: colors.surface },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
});
