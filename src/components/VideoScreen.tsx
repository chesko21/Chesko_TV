import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, BackHandler, Platform, Image, Button } from "react-native";
import Video, { DRMType } from "react-native-video";
import { useRoute } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import Toast from "react-native-toast-message";
import NetInfo from "@react-native-community/netinfo";
import * as Animatable from "react-native-animatable";
import { Base64 } from 'js-base64';

Dimensions.get("window");
const AUTO_HIDE_TIME = 10000;

const VideoScreen = () => {
  const route = useRoute();
  const { channel, channelEpg } = route.params;
  const [selectedColor, setSelectedColor] = useState("#eea509");
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [metadata, setMetadata] = useState({});
  const [currentProgram, setCurrentProgram] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const playerRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (Platform.OS !== "android") {
      const backAction = () => {
        BackHandler.exitApp();
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => backHandler.remove();
    }
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      if (!state.isConnected) {
        Toast.show({ type: "error", position: "top", text1: "No internet connection", text2: "Please check your network." });
      }
    });

    return () => {
      Toast.hide();
    };
  }, [channel]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsOverlayVisible(false);
    }, AUTO_HIDE_TIME);

    return () => clearTimeout(timeout);
  }, [isOverlayVisible]);

  useEffect(() => {
    if (channelEpg && channelEpg.length > 0) {
      const currentTime = new Date().getTime();
      const currentProg = channelEpg.find((program) => {
        const startTime = new Date(program.start).getTime();
        const endTime = new Date(program.stop).getTime();
        return currentTime >= startTime && currentTime <= endTime;
      });

      console.log('Current Program:', currentProg);
      setCurrentProgram(currentProg);
    } else {
    }
  }, [channelEpg]);

  const handleScreenTap = () => {
    setIsOverlayVisible(!isOverlayVisible);
  };

  const reloadVideo = () => {
    setReloadKey((prev) => prev + 1);
    setIsLoading(false);
    setErrorMessage(null);
  };

  const onEnd = () => {
    setIsPaused(true);
    setIsOverlayVisible(false);
  };

  const onBuffer = (data) => {
    if (isBuffering !== data.isBuffering) {
      setIsBuffering(data.isBuffering);
      setIsOverlayVisible(data.isBuffering);
    }
  };

  const onError = (error) => {
    const errorMessage = error.error?.errorString || "Unknown error";
    setErrorMessage(errorMessage);
    setIsLoading(false);
    if (errorMessage.includes("DRM")) {
      Toast.show({
        type: "error",
        position: "top",
        text1: "DRM License Error",
        text2: "This video cannot be played due to DRM restrictions.",
      });
    }
    reloadVideo();
  };

  const getDRMType = (licenseType: string, licenseKey: string) => {

    if (licenseType === "clearkey" || licenseType === "org.w3.clearkey") {
      const [key, keyId] = licenseKey.split(":");


      if (key && keyId) {


        return {
          type: DRMType.CLEARKEY,
          keys: [
            {
              kty: "oct",
              k: key,
              kid: keyId
            }
          ],
          type: "temporary"
        };
      } else {
        console.error("Invalid ClearKey format: missing key or keyId.");
        return undefined;
      }
    }

    else if (licenseType === "com.widevine.alpha") {

      return {
        type: DRMType.WIDEVINE,
        licenseServer: licenseKey,
      };
    }

    console.log("No DRM Configuration matched.");
    return undefined;
  };

  const drmConfig = channel.license?.license_key
    ? getDRMType(channel.license.license_type, channel.license.license_key)
    : undefined;

  console.log("DRM Config:", drmConfig);

  const onLoad = (data) => {
    if (duration !== data.duration) {
      setDuration(data.duration);
    }
    setIsLoading(false);
    setIsBuffering(false);
    setErrorMessage(null);
    setMetadata({
      duration: data.duration,
      tvgId: channel.tvg?.id || "Unknown",
      tvgLogo: channel.tvg?.logo || "No Logo",
      licenseType: channel.license?.license_type || "None",
      licenseKey: channel.license?.license_key || "No License Key",
    });
  };

  const renderMetadata = () => {
    return (
      <View style={styles.metadataContainer}>
        {metadata.tvgLogo && <Image source={{ uri: metadata.tvgLogo }} style={styles.logoImage} />}
        <View style={styles.textContainer}>
          <Text style={styles.metadataText}>{channel.name}</Text>
          <Text style={styles.metadataText}>{metadata.tvgId}</Text>
        </View>
      </View>
    );
  };

  const renderProgramInfo = () => {
    if (currentProgram) {
      return (
        <View style={styles.programInfoContainer}>
          <Text style={styles.programTitle}>{currentProgram.title}</Text>
          <Text style={styles.programTime}>
            {new Date(currentProgram.start).toLocaleTimeString()} -{" "}
            {new Date(currentProgram.stop).toLocaleTimeString()}
          </Text>
          <Text style={styles.programDescription}>
            {currentProgram.desc || "No description available."}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.programInfoContainer}>
          <Text style={styles.programTitle}>No Program Playing</Text>
          <Text style={styles.programDescription}>EPG data not available.</Text>
        </View>
      );
    }
  };

  const renderError = () => {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {errorMessage}</Text>
        <Button title="Retry" onPress={reloadVideo} />
      </View>
    );
  };

  return (
    <View style={styles.container} onTouchStart={handleScreenTap}>
      {isLoading && !errorMessage && (
        <View style={styles.loadingContainer}>
          <LottieView source={require("../../assets/animasi/loading.json")} autoPlay loop style={styles.lottie} />
          <Text style={styles.loadingText}>Loading Video...</Text>
        </View>
      )}

      {isBuffering && !isLoading && !errorMessage && (
        <View style={styles.loadingContainer}>
          <LottieView source={require("../../assets/animasi/buffering.json")} autoPlay loop style={styles.lottie} />
          <Text style={styles.loadingText}>Buffering...</Text>
        </View>
      )}

      {errorMessage && renderError()}

      <Video
        style={styles.video}
        ref={playerRef}
        source={{
          uri: channel.url,
          headers: {
            Referer: channel.headers?.Referer,
            "User-Agent": channel.headers?.["User-Agent"],
          }
        }}
        drm={drmConfig}
        onBuffer={onBuffer}
        onError={onError}
        onLoad={onLoad}
        onEnd={onEnd}
        rate={rate}
        resizeMode="contain"
        controls={true}
      />


      {isOverlayVisible && (
        <Animatable.View animation="fadeInDown" duration={500} style={styles.overlayContainer}>
          {renderMetadata()}
          {renderProgramInfo()}
        </Animatable.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: 150,
    height: 150,
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 10,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    padding: 10,
  },
  metadataContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  textContainer: {
    flexDirection: "column",
  },
  metadataText: {
    color: "#fff",
    fontSize: 16,
  },
  programInfoContainer: {
    marginTop: 5,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    borderRadius: 8,
  },
  programTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  programTime: {
    color: "#fff",
    fontSize: 14,
  },
  programDescription: {
    color: "#fff",
    fontSize: 12,
    marginTop: 5,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  errorText: {
    color: "red",
    fontSize: 18,
  },
});

export default VideoScreen;
