import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";

const Playlist = () => {
  const defaultPlaylistUrl = "https://pastebin.com/raw/JyCSD9r1";
  const STORAGE_KEY = "playlistUrls";

  const [playlistName, setPlaylistName] = useState<string>("");
  const [playlistUrl, setPlaylistUrl] = useState<string>("");
  const [savedUrls, setSavedUrls] = useState<
    { name: string; url: string; isActive: boolean }[]
  >([]);
  const isMounted = useRef(true);

  useEffect(() => {
    loadSavedUrls();
    return () => {
      isMounted.current = false;
    };
  }, []);

  
  useEffect(() => {
    if (savedUrls.length) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedUrls));
    }
  }, [savedUrls]);

  const isValidUrl = (url: string): boolean => {
    const regex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/gm;
    return regex.test(url);
  };
  const loadSavedUrls = async (): Promise<void> => {
    try {
      const storedUrls = await AsyncStorage.getItem(STORAGE_KEY);
      let parsedUrls = storedUrls ? JSON.parse(storedUrls) : [];

      if (!parsedUrls.some((item: { url: string }) => item.url === defaultPlaylistUrl)) {
        parsedUrls.unshift({
          name: "chesko_tv",
          url: defaultPlaylistUrl,
          isActive: true,
        });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsedUrls));
      }

      setSavedUrls(parsedUrls);
    } catch (error) {
      console.error("Failed to load saved URLs", error);
    }
  };

  const handleSaveSettings = (): void => {
    if (!playlistName || !playlistUrl) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please fill in both Playlist Name and URL!",
      });
      return;
    }

    if (!isValidUrl(playlistUrl)) {
      Toast.show({
        type: "error",
        text1: "Invalid URL",
        text2: "Please enter a valid URL!",
      });
      return;
    }

    const newUrl = { name: playlistName, url: playlistUrl, isActive: false };
    const updatedUrls = savedUrls.map((item) => ({ ...item, isActive: false }));
    updatedUrls.unshift(newUrl);
    setSavedUrls(updatedUrls);
    setPlaylistName("");
    setPlaylistUrl("");

    Toast.show({
      type: "success",
      text1: "Settings Saved",
      text2: "Your playlist has been saved successfully!",
    });
  };

const handleDeleteUrl = (url: string): void => {
  if (url === defaultPlaylistUrl) {
    Alert.alert("Error", "The default URL cannot be deleted.");
    return;
  }

  const updatedUrls = savedUrls.filter((item) => item.url !== url);
  setSavedUrls(updatedUrls);

  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUrls));

  Toast.show({
    type: "success",
    text1: "URL Deleted",
    text2: "The playlist URL has been deleted successfully!",
  });
};

const handleToggleActive = (url: string): void => {
  const updatedUrls = savedUrls.map((item) => ({
    ...item,
    isActive: item.url === url,
  }));

  setSavedUrls(updatedUrls);

  const activeItem = updatedUrls.find((item) => item.isActive);

  const filteredUrls = updatedUrls.filter((item) => item.isActive || item.url === defaultPlaylistUrl);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredUrls));

  if (activeItem) {
    DeviceEventEmitter.emit("ActiveURLChanged", activeItem.url); 
    Toast.show({
      type: "success",
      text1: "Playlist Activated",
      text2: `${activeItem.name} is now active.`,
    });
  }
};


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Playlist Settings</Text>

      <View style={styles.itemList}>
        <Text style={styles.label}>Enter Playlist Name:</Text>
        <TextInput
          value={playlistName}
          onChangeText={setPlaylistName}
          placeholder="Enter Playlist Name"
          style={styles.input}
        />

        <Text style={styles.label}>Enter Playlist URL:</Text>
        <TextInput
          value={playlistUrl}
          onChangeText={setPlaylistUrl}
          placeholder="Enter Playlist URL"
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.saveButton, (!playlistName || !playlistUrl) && { opacity: 0.5 }]}
          onPress={handleSaveSettings}
          disabled={!playlistName || !playlistUrl}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>

        <View style={styles.savedUrlsContainer}>
          {savedUrls.length > 0 ? (
            <>
              <Text style={styles.savedUrlsTitle}>Saved Playlist URLs:</Text>
              {savedUrls.map((item, index) => (
                <View key={index} style={styles.savedUrlItem}>
                  <Text style={[styles.savedUrlText, item.isActive && styles.activeText]}>
                    {item.name} - {item.isActive ? "(Active)" : "(Deactive)"}
                  </Text>

                  <View style={styles.checkboxRow}>
                    <Checkbox value={item.isActive} onValueChange={() => handleToggleActive(item.url)} />
                    <Text style={styles.checkboxLabel}>Activate</Text>
                  </View>

                  {item.url !== defaultPlaylistUrl && (
                    <TouchableOpacity onPress={() => handleDeleteUrl(item.url)}>
                      <Text style={styles.deleteButton}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.noSavedUrlsText}>No URLs saved yet.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 15,
    backgroundColor: "#1c1c1c",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  itemList: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    color: "#fff",
    backgroundColor: "#333",
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    maxWidth: 70,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  savedUrlsContainer: {
    marginTop: 20,
  },
  savedUrlsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  savedUrlItem: {
    backgroundColor: "#333",
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  savedUrlText: {
    fontSize: 14,
    color: "#fff",
  },
  activeText: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  checkboxLabel: {
    color: "#fff",
    marginLeft: 10,
  },
  deleteButton: {
    color: "#ff4747",
    marginTop: 10,
    textDecorationLine: "underline",
  },
  noSavedUrlsText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});

export default Playlist;
