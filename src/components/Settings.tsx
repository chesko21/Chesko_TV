import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    Alert,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";

const Settings = () => {
    const defaultPlaylistUrl = "https://pastebin.com/raw/JyCSD9r1";
    const STORAGE_KEY = "playlistUrls";

    const [playlistName, setPlaylistName] = useState<string>("");
    const [playlistUrl, setPlaylistUrl] = useState<string>("");
    const [savedUrls, setSavedUrls] = useState<{ name: string; url: string; isActive: boolean }[]>([]);
    const [isPlaylistVisible, setIsPlaylistVisible] = useState<boolean>(true); // Untuk toggle sidebar

    // Load the saved URLs and ensure the default URL is present.
    const loadSavedUrls = async () => {
        try {
            const storedUrls = await AsyncStorage.getItem(STORAGE_KEY);
            let parsedUrls = storedUrls ? JSON.parse(storedUrls) : [];
            if (!parsedUrls.some((item: { url: string }) => item.url === defaultPlaylistUrl)) {
                parsedUrls.unshift({ name: "Default Playlist", url: defaultPlaylistUrl, isActive: true });
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsedUrls));
            }
            setSavedUrls(parsedUrls);
        } catch (error) {
            console.error("Failed to load saved URLs", error);
        }
    };

    // Save the updated URLs array to AsyncStorage.
    const saveUrlsToStorage = async (urls: { name: string; url: string; isActive: boolean }[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
        } catch (error) {
            console.error("Failed to save URLs", error);
        }
    };

    const handleSaveSettings = () => {
        if (playlistName && playlistUrl) {
            const newUrl = { name: playlistName, url: playlistUrl, isActive: false };
            const updatedUrls = savedUrls.map((item) =>
                item.url === defaultPlaylistUrl ? { ...item, isActive: false } : item
            );
            updatedUrls.unshift(newUrl);
            setSavedUrls(updatedUrls);
            saveUrlsToStorage(updatedUrls);
            setPlaylistName("");
            setPlaylistUrl("");
            Toast.show({
                type: "success",
                position: "top",
                text1: "Settings Saved",
                text2: "Your playlist has been saved successfully!",
            });
        } else {
            Alert.alert("Validation Error", "Please fill in both Playlist Name and URL!");
        }
    };

    const handleDeleteUrl = (url: string) => {
        if (url === defaultPlaylistUrl) {
            Alert.alert("Error", "The default URL cannot be deleted.");
        } else {
            const updatedUrls = savedUrls.filter((item) => item.url !== url);
            setSavedUrls(updatedUrls);
            saveUrlsToStorage(updatedUrls);
            Toast.show({
                type: "success",
                position: "top",
                text1: "URL Deleted",
                text2: "The playlist URL has been deleted successfully!",
            });
        }
    };

    const handleToggleActive = (url: string) => {
        const updatedUrls = savedUrls.map((item) => ({
            ...item,
            isActive: item.url === url ? !item.isActive : false,
        }));

        setSavedUrls(updatedUrls);
        saveUrlsToStorage(updatedUrls);

        const activeItem = updatedUrls.find((item) => item.url === url);
        if (activeItem?.isActive) {
            Toast.show({
                type: "success",
                position: "top",
                text1: "Playlist Activated",
                text2: `${activeItem.name} is now active.`,
            });
        }
    };

    const togglePlaylistVisibility = () => {
        setIsPlaylistVisible(!isPlaylistVisible);
    };

    useEffect(() => {
        loadSavedUrls();
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>IPTV Settings</Text>
            <View style={styles.mainContent}>
                <View style={styles.sidebar}>
                    <TouchableOpacity onPress={togglePlaylistVisibility}>
                        <Text style={styles.menuItem}>
                            Playlist {isPlaylistVisible ? "▲" : "▼"}
                        </Text>
                    </TouchableOpacity>
                </View>
                {isPlaylistVisible && (
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
                        <View style={styles.buttonContainer}>
                            <Button title="Save" onPress={handleSaveSettings} />
                        </View>
                        <View style={styles.savedUrlsContainer}>
                            {savedUrls.length > 0 ? (
                                <View>
                                    <Text style={styles.savedUrlsTitle}>Saved Playlist URLs:</Text>
                                    {savedUrls.map((item, index) => (
                                        <View key={index} style={styles.savedUrlItem}>
                                            <Text style={styles.savedUrlText}>
                                                {item.name} - {item.url === defaultPlaylistUrl ? "Default Playlist" : item.url}
                                            </Text>

                                            <View style={styles.checkboxRow}>
                                                <Checkbox
                                                    value={item.isActive}
                                                    onValueChange={() => handleToggleActive(item.url)}
                                                />
                                                <Text style={styles.checkboxLabel}>Activate Playlist</Text>
                                            </View>
                                            {item.url !== defaultPlaylistUrl && (
                                                <TouchableOpacity onPress={() => handleDeleteUrl(item.url)}>
                                                    <Text style={styles.actionButton}>Delete</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.noSavedUrlsText}>No URLs saved yet.</Text>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: "flex-start",
        padding: 10,
        backgroundColor: "#1c1c1c",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 30,
        textAlign: "left",
    },
    mainContent: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    sidebar: {
        width: "30%",
        paddingRight: 10,
        borderRightWidth: 1,
        borderColor: "#333",
    },
    menuItem: {
        fontSize: 18,
        color: "#fff",
        marginBottom: 10,
    },
    itemList: {
        width: "70%",
        paddingLeft: 15,
    },
    label: {
        fontSize: 16,
        color: "#fff",
        marginBottom: 5,
        textAlign: "left",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
    },
    input: {
        height: 40,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        color: "#fff",
        backgroundColor: "#333",
        flex: 1,
        marginRight: 10,
    },
    buttonContainer: {
        width: 150,
        alignItems: "flex-start",
        marginTop: 10,
    },
    savedUrlsContainer: {
        marginTop: 30,
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
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
    },
    checkboxLabel: {
        fontSize: 14,
        color: "#fff",
        marginLeft: 10,
    },
    actionButton: {
        color: "#ff4747",
        fontSize: 14,
        marginTop: 10,
        textDecorationLine: "underline",
    },
    noSavedUrlsText: {
        fontSize: 16,
        color: "#fff",
        textAlign: "center",
    },
});
export default Settings;
