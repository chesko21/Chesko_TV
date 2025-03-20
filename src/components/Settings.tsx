import React, { useState } from "react";
import { useTVEventHandler, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from '@react-navigation/native';
import Playlist from "./Playlist";
import NetworkSettings from "./NetworkSettings";
import AppUpdateSettings from "./AppUpdateSettings";
import AccountSettings from "./AccountSettings";
import Epg from "./Epg";

const Settings = () => {
    const navigation = useNavigation();
    const [focusedItem, setFocusedItem] = useState < string | null > (null);
    const [activeSection, setActiveSection] = useState < "goback" | "playlist" | "network" | "appUpdate" | "account" | "epg" > ("playlist");
    
    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
           
            navigation.navigate('Home');
        }
    };

    // Handler for TV remote events
    useTVEventHandler((evt) => {
        if (evt && evt.eventType === "select") {
            if (focusedItem === "goback") setActiveSection("goback");
            else if (focusedItem === "playlist") setActiveSection("playlist");
            else if (focusedItem === "appUpdate") setActiveSection("appUpdate");
            else if (focusedItem === "epg") setActiveSection("epg");
            else if (focusedItem === "network") setActiveSection("network");
            else if (focusedItem === "account") setActiveSection("account");
        }
    });

    return (
        <View style={styles.container}>
            {/* Sidebar */}
            <View style={styles.sidebar}>
                <TouchableOpacity
                    onFocus={() => setFocusedItem("goBack")}
                    onBlur={() => setFocusedItem(null)}
                    style={[
                        styles.sidebarItem,
                        activeSection === "goback" && styles.activeSidebarItem,
                        focusedItem === "goBack" && { backgroundColor: "#24538e" },
                    ]}
                    onPress={handleBack}
                >
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onFocus={() => setFocusedItem("playlist")}
                    onBlur={() => setFocusedItem(null)}
                    style={[
                        styles.sidebarItem,
                        activeSection === "playlist" && styles.activeSidebarItem,
                        focusedItem === "playlist" && { backgroundColor: "#24538e" },
                    ]}
                    onPress={() => setActiveSection("playlist")}
                >
                    <Text style={styles.sidebarText}>Playlist</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onFocus={() => setFocusedItem("account")}
                    onBlur={() => setFocusedItem(null)}
                    style={[
                        styles.sidebarItem,
                        activeSection === "account" && styles.activeSidebarItem,
                        focusedItem === "account" && { backgroundColor: "#24538e" },
                    ]}
                    onPress={() => setActiveSection("account")}
                >
                    <Text style={styles.sidebarText}>Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onFocus={() => setFocusedItem("appUpdate")}
                    onBlur={() => setFocusedItem(null)}
                    style={[
                        styles.sidebarItem,
                        activeSection === "appUpdate" && styles.activeSidebarItem,
                        focusedItem === "appUpdate" && { backgroundColor: "#24538e" },
                    ]}
                    onPress={() => setActiveSection("appUpdate")}
                >
                    <Text style={styles.sidebarText}>App Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onFocus={() => setFocusedItem("epg")}
                    onBlur={() => setFocusedItem(null)}
                    style={[
                        styles.sidebarItem,
                        activeSection === "epg" && styles.activeSidebarItem,
                        focusedItem === "epg" && { backgroundColor: "#24538e" },
                    ]}
                    onPress={() => setActiveSection("epg")}
                >
                    <Text style={styles.sidebarText}>EPG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onFocus={() => setFocusedItem("network")}
                    onBlur={() => setFocusedItem(null)}
                    style={[
                        styles.sidebarItem,
                        activeSection === "network" && styles.activeSidebarItem,
                        focusedItem === "network" && { backgroundColor: "#24538e" },
                    ]}
                    onPress={() => setActiveSection("network")}
                >
                    <Text style={styles.sidebarText}>Network & Streaming</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                {activeSection === "goBack" && <Playlist isFocused={activeSection === "goBack"} />}
                {activeSection === "playlist" && <Playlist/>}
                {activeSection === "network" && <NetworkSettings />}
                {activeSection === "appUpdate" && <AppUpdateSettings />}
                {activeSection === "account" && <AccountSettings />}
                {activeSection === "epg" && <Epg />}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#1c1c1c",
    },
    backButton: {
        padding: 10,
        backgroundColor: "#333",
        marginBottom: 10,
        borderRadius: 5,
    },
    backButtonText: {
        color: "#fff",
        fontSize: 16,
    },
    sidebar: {
        width: "25%",
        borderRightWidth: 1,
        borderRightColor: "#333",
        paddingVertical: 20,
        paddingHorizontal: 10,
    },
    sidebarItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    activeSidebarItem: {
        backgroundColor: "#24538e",
        borderRadius: 5,
    },
    sidebarText: {
        color: "#fff",
        fontSize: 18,
    },
    content: {
        flex: 1,
        padding: 10,
    },
});

export default Settings;