import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, BackHandler, Platform, Image, Button } from "react-native";
import Video, { DRMType } from "react-native-video";
import { useRoute } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import Toast from "react-native-toast-message";
import NetInfo from "@react-native-community/netinfo";
import * as Animatable from "react-native-animatable";

Dimensions.get("window");
const AUTO_HIDE_TIME = 10000;


const VideoScreen = () => {
  const route = useRoute<RouteProp<VideoScreenRouteParams>>();
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
      console.log("No EPG data available for this channel.");
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
  
  const onBuffer = (data: { isBuffering: boolean }) => {
    if (isBuffering !== data.isBuffering) {
      setIsBuffering(data.isBuffering);
      setIsOverlayVisible(data.isBuffering);
    }
  };
  

  const onError = (error: { error: { errorString?: string } }) => {
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
  

  const getDRMType = (licenseType: any) => {
    switch (licenseType) {
      case "clearkey":
        return DRMType.CLEARKEY;
      case "com.widevine.alpha":
        return DRMType.WIDEVINE;
      case "org.w3.clearkey":
        return DRMType.CLEARKEY;
      default:
        return DRMType.WIDEVINE;
    }
  };

  const drmConfig = channel.license?.license_key ? {
    type: getDRMType(channel.license.license_type),
    licenseServer: channel.license.license_key,
  } : undefined;

  const onLoad = (data: { duration: React.SetStateAction<number> }) => {
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
        source={{ uri: channel.url, headers: { Referer: channel.headers?.Referer, "User-Agent": channel.headers?.["User-Agent"] } }}
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
        <Animatable.View animation="fadeInDown" duration={500} style={styles.overlay}>
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
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "black",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(18, 18, 18, 0.7)",
    zIndex: 1,
    padding: 20,
    flex: 1,
  },
  lottie: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignContent: "center",
  },
  loadingText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "400",
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    backgroundColor: "rgba(18, 7, 119, 0.44)",
    padding: 12,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    flexDirection: "row",
    paddingHorizontal: 30,
    zIndex: 2,
  },
  metadataContainer: {
    backgroundColor: "transparent",
    borderRadius: 5,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  logoImage: {
    width: 50,
    height: 50,
    marginRight: 10,
    borderRadius: 5,
  },
  textContainer: {
    flexDirection: "column",
    justifyContent: "center",
  },
  metadataText: {
    color: "#fff",
    fontSize: 12,
    marginBottom: 5,
  },
  programInfoContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "transparant",
    padding: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  programTitle: {
    color: "#fff",
    fontSize: 16,
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
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -100 }, { translateY: -50 }],
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  errorText: {
    color: "red",
    fontSize: 18,
  },
});

export default VideoScreen;
