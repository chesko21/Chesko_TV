import React, { useState, useEffect, useRef,useMemo  } from "react";
import { View, Text, StyleSheet, Dimensions, BackHandler, Platform, Image, Button } from "react-native";
import Video, { DRMType } from "react-native-video";
import { useRoute } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import Toast from "react-native-toast-message";
import NetInfo from "@react-native-community/netinfo";
import * as Animatable from "react-native-animatable";
import { Base64 } from 'js-base64';
import { Buffer } from "buffer";


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
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
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
    console.error("Video Playback Error:", errorMessage);

    setErrorMessage(errorMessage);
    setIsLoading(false);
    setIsPaused(true); // Hentikan pemutaran jika ada error

    if (errorMessage.includes("DRM")) {
        Toast.show({
            type: "error",
            position: "top",
            text1: "DRM Error",
            text2: "ClearKey DRM mungkin tidak cocok atau salah konfigurasi.",
        });
    } else {
        Toast.show({
            type: "error",
            position: "top",
            text1: "Playback Error",
            text2: errorMessage,
        });
    }
};


const hexToBase64 = (hex) => {
  if (!/^[a-fA-F0-9]+$/.test(hex)) {
    console.warn(`Invalid HEX input: ${hex}`);
    return null;
  }
  const base64 = Buffer.from(hex, "hex").toString("base64");
  // Konversi Base64 standar ke Base64 URL-safe
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};


const getDRMType = (licenseType, licenseKey) => {
  if (!licenseType || !licenseKey) return undefined;

  if (licenseType.toLowerCase() === "clearkey") {
    const keyPairs = {};
    
    console.log("Raw DRM Keys:", licenseKey);  // Log raw keys sebelum splitting
    
    licenseKey.split(",").forEach(pair => {
      const [kid, key] = pair.split(":").map(item => item.trim());
      console.log(`Raw KID: ${kid}, Raw Key: ${key}`); // Log masing-masing KID/Key sebelum konversi

      const base64Kid = hexToBase64(kid);
      const base64Key = hexToBase64(key);

      if (base64Kid && base64Key) {
        keyPairs[base64Kid] = base64Key;
      } else {
        console.warn(`Invalid DRM Key Pair: KID=${kid}, Key=${key}`);
      }
    });

    if (Object.keys(keyPairs).length === 0) {
      console.warn("Invalid ClearKey DRM configuration");
      return undefined;
    }

    return {
      type: "clearkey",
      keys: keyPairs,
      headers: {},
    };
  }

  if (licenseType.toLowerCase() === "widevine" || licenseType === "com.widevine.alpha") {
    return {
      type: "widevine",
      licenseServer: licenseKey,
      headers: {},
    };
  }

  return undefined;
};


const drmConfig = useMemo(() => {
  return channel.license?.license_key
    ? getDRMType(channel.license.license_type, channel.license.license_key)
    : undefined;
}, [channel.license?.license_key]);

console.log("Final DRM Config:", JSON.stringify(drmConfig, null, 2));

  const onLoad = (data) => {
    setTimeout(() => {
      setIsLoading(false);
      setIsBuffering(false);
      setErrorMessage(null);
    }, 1000);

    setDuration(data.duration);
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
          <LottieView
            key={reloadKey}
            source={require("../../assets/animasi/loading.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
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
        source={{
          uri: channel.url,
          headers: {
            Referer: channel.headers?.Referer,
            "User-Agent": channel.headers?.["User-Agent"],
          },
          drm: drmConfig
        }}
        style={styles.video}
        ref={playerRef}
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
    flex: 1,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
