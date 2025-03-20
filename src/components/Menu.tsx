import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Text,
  Modal,
  useTVEventHandler,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";

interface MenuProps {
  onReloadPress: () => Promise<void>;
  onExitPress: () => void;
  onSettingsPress: () => void;
  onRecentWatchPress: () => void;
  isReloading: boolean;
}

const Menu = ({
  onReloadPress,
  onExitPress,
  onSettingsPress,
  onRecentWatchPress,
  isReloading,
}: MenuProps) => {
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [isExitModalVisible, setExitModalVisible] = useState(false);
  const [focusedModalButton, setFocusedModalButton] = useState<string | null>(null);
  const navigation = useNavigation();

  useTVEventHandler((evt) => {
    if (evt && evt.eventType === "select") {
      handleSelectAction();
    }
  });

  const handleSelectAction = () => {
    switch (focusedItem) {
      case "reload":
        onReloadPress();
        break;
      case "settings":
        handleSettings();
        break;
      case "recent":
        onRecentWatchPress();
        break;
      case "exit":
        handleExit();
        break;
    }
  };

  const handleExit = () => {
    setExitModalVisible(true);
  };

  const handleConfirmExit = () => {
    setExitModalVisible(false);
    onExitPress();
  };

  const handleCancelExit = () => {
    setExitModalVisible(false);
  };

  const handleSettings = () => {
    Toast.show({
      type: "info",
      position: "top",
      text1: "Opening Settings",
      text2: "You are now viewing the settings page.",
    });
    onSettingsPress();
  };

  return (
    <View style={styles.menuContainer}>
      <Image source={require("../../assets/images/ic_launcher.png")} style={styles.logo} />
      <View style={styles.menuButtons}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => setFocusedItem(item.id)}
            onFocus={() => setFocusedItem(item.id)}
            onBlur={() => setFocusedItem(null)}
            onPress={() => setFocusedItem(item.id)}
            style={[styles.menuItem, focusedItem === item.id && styles.focusedItem]}
            disabled={item.id === "reload" && isReloading}
          >
            {item.id === "reload" && isReloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name={item.icon} size={24} color="#fff" />
            )}
            {focusedItem === item.id && <Text style={styles.menuText}>{item.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isExitModalVisible}
        onRequestClose={handleCancelExit}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Are you sure you want to exit?</Text>
            <View style={styles.modalButtons}>
              {modalButtons.map((button) => (
                <TouchableOpacity
                  key={button.id}
                  onPress={() => button.id === "confirm" ? handleConfirmExit() : handleCancelExit()}
                  onFocus={() => setFocusedModalButton(button.id)}
                  onBlur={() => setFocusedModalButton(null)}
                  style={[styles.modalButton, focusedModalButton === button.id && styles.focusedModalButton]}
                >
                  <Icon name={button.icon} size={24} color="#fff" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const menuItems = [
  { id: "reload", icon: "refresh", label: "Reload" },
  { id: "settings", icon: "settings", label: "Settings" },
  { id: "recent", icon: "timer", label: "Recent" },
  { id: "exit", icon: "exit-to-app", label: "Exit" },
];

const modalButtons = [
  { id: "cancel", icon: "close" },
  { id: "confirm", icon: "check" },
];

const styles = StyleSheet.create({
  menuContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#24538e",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    justifyContent: "flex-start",
  },
  logo: {
    width: 40,
    height: 40,
    marginLeft: 10,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 50,
  },
  menuButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    flexGrow: 1,
  },
  menuItem: {
    marginHorizontal: 10,
    alignItems: "center",
  },
  focusedItem: {
    backgroundColor: "rgba(16, 25, 71, 0.85)",
    borderRadius: 10,
    padding: 2,
    width: 60,
  },
  menuText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 200,
    padding: 10,
    backgroundColor: "rgba(243, 239, 3, 0.88)",
    borderRadius: 10,
  },
  modalText: {
    fontSize: 15,
    marginBottom: 10,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  modalButton: {
    padding: 4,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
  },
  focusedModalButton: {
    backgroundColor: "#24538e",
  },
});

export default Menu;