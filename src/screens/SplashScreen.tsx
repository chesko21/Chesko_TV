import axios from "axios";
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";

const SplashScreen = ({ navigation }) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    axios
      .get("https://lottie.host/1a7aa322-135c-4c7f-bb72-40ef7d0813d6/PnFE3AmboE.json")
      .then((response) => {
        setAnimationData(response.data);
      })
      .catch((err) => console.error("Error loading animation:", err));

    setTimeout(() => {
      navigation.replace("Home");
    }, 6000);
  }, [navigation]);

  if (!animationData) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LottieView
        source={animationData}
        autoPlay
        loop
        style={styles.lottie}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  lottie: {
    width: 400,
    height: 400,
    justifyContent: 'center',
    alignItems: "center",

  },
});

export default SplashScreen;
