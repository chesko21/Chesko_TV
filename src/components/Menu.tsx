import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Text, Modal } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-toast-message";


interface MenuProps {
  onReloadPress: () => Promise<void>;
  onExitPress: () => void;
  onSettingsPress: () => void;
  onFavoritesPress: () => void;
  onRecentWatchPress: () => void;
  isReloading: boolean;
}

const Menu = ({
  onReloadPress,
  onExitPress,
  onSettingsPress,
  onFavoritesPress,
  onRecentWatchPress,
  isReloading,
}: MenuProps) => {
  const [focusedItem, setFocusedItem] = useState<string | null>(null); 
  const [isExitModalVisible, setExitModalVisible] = useState(false); 
  const [focusedModalButton, setFocusedModalButton] = useState<string | null>(null); 

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
        {/* Reload Button */}
        <TouchableOpacity
          onPress={onReloadPress}
          onFocus={() => setFocusedItem("reload")}
          onBlur={() => setFocusedItem(null)}
          style={[styles.menuItem, focusedItem === "reload" && styles.focusedItem]}
          disabled={isReloading}
        >
          {isReloading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="refresh" size={24} color="#fff" />}
          {focusedItem === "reload" && <Text style={styles.menuText}>Reload</Text>}
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity
           onPress={handleSettings}
          onFocus={() => setFocusedItem("settings")}
          onBlur={() => setFocusedItem(null)}
          style={[styles.menuItem, focusedItem === "settings" && styles.focusedItem]}
        >
          <Icon name="settings" size={24} color="#fff" />
          {focusedItem === "settings" && <Text style={styles.menuText}>Settings</Text>}
        </TouchableOpacity>

        {/* Favorites Button */}
        <TouchableOpacity
          onPress={onFavoritesPress}
          onFocus={() => setFocusedItem("favorites")}
          onBlur={() => setFocusedItem(null)}
          style={[styles.menuItem, focusedItem === "favorites" && styles.focusedItem]}
        >
          <Icon name="favorite" size={24} color="#fff" />
          {focusedItem === "favorites" && <Text style={styles.menuText}>Favorites</Text>}
        </TouchableOpacity>

        {/* Recent Watch Button */}
        <TouchableOpacity
          onPress={onRecentWatchPress}
          onFocus={() => setFocusedItem("recent")}
          onBlur={() => setFocusedItem(null)}
          style={[styles.menuItem, focusedItem === "recent" && styles.focusedItem]}
        >
          <Icon name="timer" size={24} color="#fff" />
          {focusedItem === "recent" && <Text style={styles.menuText}>Recent</Text>}
        </TouchableOpacity>

        {/* Exit Button */}
        <TouchableOpacity
          onPress={handleExit} 
          onFocus={() => setFocusedItem("exit")}
          onBlur={() => setFocusedItem(null)}
          style={[styles.menuItem, focusedItem === "exit" && styles.focusedItem]}
        >
          <Icon name="exit-to-app" size={24} color="#fff" />
          {focusedItem === "exit" && <Text style={styles.menuText}>Exit</Text>}
        </TouchableOpacity>

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
              <TouchableOpacity
                onPress={handleCancelExit}
                onFocus={() => setFocusedModalButton("cancel")}
                onBlur={() => setFocusedModalButton(null)}
                style={[styles.modalButton, focusedModalButton === "cancel" && styles.focusedModalButton]}
              >
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmExit}
                onFocus={() => setFocusedModalButton("confirm")}
                onBlur={() => setFocusedModalButton(null)}
                style={[styles.modalButton, focusedModalButton === "confirm" && styles.focusedModalButton]}
              >
                <Icon name="check" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#24538e",
    borderBottomWidth: 1,
    borderBottomColor: "#444",
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
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  menuItem: {
    marginHorizontal: 10,
    alignItems: "center", 
  },
  focusedItem: {
    backgroundColor:"rgba(16, 25, 71, 0.5)",
    borderRadius: 10,
    padding: 2,
    width: 50,
  },
  menuText: {
    color: "#fff",
    fontSize: 5,
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
  }
});

export default Menu;
