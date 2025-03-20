import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTVEventHandler } from "react-native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { DeviceEventEmitter } from "react-native";

const Playlist = ({ isFocused }) => {
  const [focusedItem, setFocusedItem] = useState(null);
  const defaultPlaylistUrl = "https://pastebin.com/raw/JyCSD9r1";
  const STORAGE_KEY = "playlistUrls";
  const [playlistName, setPlaylistName] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [savedUrls, setSavedUrls] = useState([]);
  const playlistNameRef = useRef(null);
  const playlistUrlRef = useRef(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    const loadSavedUrls = async () => {
      try {
        const storedUrls = await AsyncStorage.getItem(STORAGE_KEY);
        let parsedUrls = storedUrls ? JSON.parse(storedUrls) : [];

        if (!parsedUrls.some(item => item.url === defaultPlaylistUrl)) {
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

    loadSavedUrls();
  }, []);

  useEffect(() => {
    if (savedUrls.length) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedUrls));
    }
  }, [savedUrls]);

  const isValidUrl = (url) => {
    const regex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/gm;
    return regex.test(url);
  };

  const handleSaveSettings = () => {
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

  const handleDeleteUrl = (url) => {
    if (url === defaultPlaylistUrl) {
      Alert.alert("Error", "The default URL cannot be deleted.");
      return;
    }

    const updatedUrls = savedUrls.filter(item => item.url !== url);
    setSavedUrls(updatedUrls);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUrls));

    Toast.show({
      type: "success",
      text1: "URL Deleted",
      text2: "The playlist URL has been deleted successfully!",
    });
  };

  const handleToggleActive = (url) => {
    const updatedUrls = savedUrls.map(item => ({
      ...item,
      isActive: item.url === url,
    }));

    setSavedUrls(updatedUrls);
    
    const activeItem = updatedUrls.find(item => item.isActive);
    const filteredUrls = updatedUrls.filter(item => item.isActive || item.url === defaultPlaylistUrl);
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

  useTVEventHandler((evt) => {
    if (evt) {
      switch (evt.eventType) {
        case "up":
          navigateUp();
          break;
        case "down":
          navigateDown();
          break;
        case "select":
          handleSelect();
          break;
      }
    }
  });

  const navigateUp = () => {
    if (focusedItem === "url") {
      setFocusedItem("name");
    } else if (focusedItem === "save") {
      setFocusedItem("url");
    } else if (focusedItem === "name") {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const navigateDown = () => {
    if (focusedItem === "name") {
      setFocusedItem("url");
    } else if (focusedItem === "url") {
      setFocusedItem("save");
    } else if (focusedItem === "save") {
      if (savedUrls.length > 0) {
        setFocusedItem(`checkbox-0`);
      }
    } else if (focusedItem?.startsWith("checkbox-")) {
      const index = parseInt(focusedItem.split("-")[1]);
      if (index < savedUrls.length - 1) {
        setFocusedItem(`checkbox-${index + 1}`);
      }
    }
  };

  const handleSelect = () => {
    if (focusedItem === "name") {
      playlistNameRef.current?.focus();
    } else if (focusedItem === "url") {
      playlistUrlRef.current?.focus();
      handleSaveSettings();
    } else if (focusedItem?.startsWith("checkbox-")) {
      const index = parseInt(focusedItem.split("-")[1]);
      handleToggleActive(savedUrls[index]?.url);
    } else if (focusedItem?.startsWith("delete-")) {
      const index = parseInt(focusedItem.split("-")[1]);
      handleDeleteUrl(savedUrls[index]?.url);
    } else if (focusedItem === "save") {
      handleSaveSettings();
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.container}
      style={[
        { borderColor: isFocused ? 'blue' : 'transparent', borderWidth: 2 },
        styles.scrollView
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Playlist Settings</Text>
      
      <View style={styles.itemList}>
        <Text style={styles.label}>Enter Playlist Name:</Text>
        <TextInput
          ref={playlistNameRef}
          value={playlistName}
          onChangeText={setPlaylistName}
          placeholder="Enter Playlist Name"
          style={[styles.input, focusedItem === "name" && styles.focusedInput]}
          onFocus={() => setFocusedItem("name")}
          onBlur={() => setFocusedItem(null)}
        />

        <Text style={styles.label}>Enter Playlist URL:</Text>
        <TextInput
          ref={playlistUrlRef}
          value={playlistUrl}
          onChangeText={setPlaylistUrl}
          placeholder="Enter Playlist URL"
          style={[styles.input, focusedItem === "url" && styles.focusedInput]}
          onFocus={() => setFocusedItem("url")}
          onBlur={() => setFocusedItem(null)}
        />

        <TouchableOpacity
          onFocus={() => setFocusedItem("save")}
          onBlur={() => setFocusedItem(null)}
          style={[
            styles.saveButton,
            focusedItem === "save" && { backgroundColor: "#24538e" },
          ]}
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
                    {item.name} - {item.isActive ? "(Active)" : "(Inactive)"}
                  </Text>
                  
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity
                      onFocus={() => setFocusedItem(`checkbox-${index}`)}
                      onBlur={() => {
                        if (focusedItem === `checkbox-${index}`) {
                          setFocusedItem(null);
                        }
                      }}
                      style={[
                        styles.checkboxContainer,
                        focusedItem === `checkbox-${index}` && styles.focusedCheckbox,
                      ]}
                      onPress={() => handleToggleActive(item.url)}
                      focusable
                    >
                      <Checkbox
                        value={item.isActive}
                        onValueChange={() => handleToggleActive(item.url)}
                      />
                      <Text style={styles.checkboxLabel}>Activate</Text>
                    </TouchableOpacity>
                  </View>

                  {item.url !== defaultPlaylistUrl && (
                    <TouchableOpacity
                      onFocus={() => setFocusedItem(`delete-${index}`)}
                      onBlur={() => {
                        if (focusedItem === `delete-${index}`) {
                          setFocusedItem(null);
                        }
                      }}
                      onPress={() => handleDeleteUrl(item.url)}
                      style={[
                        styles.deleteButton,
                        focusedItem === `delete-${index}` && { backgroundColor: "#24538e" },
                      ]}
                      focusable
                    >
                      <Text style={styles.deleteButtonLabel}>Delete</Text>
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
  focusedInput: {
    backgroundColor: "#24538e",
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
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 5,
    borderRadius: 5,
  },
  focusedCheckbox: {
    backgroundColor: "#24538e",
  },
  checkboxLabel: {
    color: "#fff",
    marginLeft: 10,
  },
  deleteButton: {
    color: "#ff4747",
    marginTop: 10,
  },
  deleteButtonLabel: {
    color: "#ff4747",
    textDecorationLine: "underline",
  },
  noSavedUrlsText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});

export default Playlist;