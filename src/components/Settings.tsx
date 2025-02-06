import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Playlist from "./Playlist";
import NetworkSettings from "./NetworkSettings";
import AppUpdateSettings from "./AppUpdateSettings";
import AccountSettings from "./AccountSettings";
import Epg from "./Epg";  

const Settings = () => {
    const [activeSection, setActiveSection] = useState<"playlist" | "network" | "appUpdate" | "account" | "epg">("playlist");

    return (
        <View style={styles.container}>
            
            <View style={styles.sidebar}>
                <TouchableOpacity
                    style={[
                        styles.sidebarItem,
                        activeSection === "account" && styles.activeSidebarItem,
                    ]}
                    onPress={() => setActiveSection("account")}
                >
                    <Text style={styles.sidebarText}>Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.sidebarItem,
                        activeSection === "appUpdate" && styles.activeSidebarItem,
                    ]}
                    onPress={() => setActiveSection("appUpdate")}
                >
                    <Text style={styles.sidebarText}>App Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.sidebarItem,
                        activeSection === "epg" && styles.activeSidebarItem,
                    ]}
                    onPress={() => setActiveSection("epg")}
                >
                    <Text style={styles.sidebarText}>EPG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.sidebarItem,
                        activeSection === "network" && styles.activeSidebarItem,
                    ]}
                    onPress={() => setActiveSection("network")}
                >
                    <Text style={styles.sidebarText}>Network & Streaming</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.sidebarItem,
                        activeSection === "playlist" && styles.activeSidebarItem,
                    ]}
                    onPress={() => setActiveSection("playlist")}
                >
                    <Text style={styles.sidebarText}>Playlist</Text>
                </TouchableOpacity>
            </View>

            {/* Konten Utama */}
            <View style={styles.content}>
                {activeSection === "playlist" && <Playlist />}
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
    sidebar: {
        width: "30%",
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
