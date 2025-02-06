// src/components/AccountSettings.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const AccountSettings = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Account Settings</Text>
            <View style={styles.comingSoonContainer}>
                <Text style={styles.comingSoonText}>Coming Soon...</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1c1c1c",
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 20,
    },
    comingSoonContainer: {
        padding: 20,
        backgroundColor: "#333",
        borderRadius: 5,
        alignItems: "center",
    },
    comingSoonText: {
        fontSize: 18,
        color: "#fff",
    },
});

export default AccountSettings;
