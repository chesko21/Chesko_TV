import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { debounce } from "lodash";
import { View, Text, StyleSheet, Dimensions, Image, Button, TouchableOpacity, Modal, useWindowDimensions } from "react-native";
import Video from "react-native-video";
import { useRoute } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import Toast from "react-native-toast-message";
import * as Animatable from "react-native-animatable";
import { Buffer, WithImplicitCoercion } from "buffer";
import { DOMParser } from 'xmldom';
import CustomControls from "./CustomControls";

const VideoScreen: React.FC = () => {
  const [isMuted, setIsMuted] = useState < boolean > (false);

  const [currentTime, setCurrentTime] = useState(0);
  const route = useRoute();
  const { channel, channelEpg }: { channel: any; channelEpg: any; } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [metadata, setMetadata] = useState({});
  const [isPaused, setIsPaused] = useState(false);
  const [videoResolutions, setVideoResolutions] = useState([]);
  const [audioResolutions, setAudioResolutions] = useState([]);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const playerRef = useRef(null);
  const isMounted = useRef(true);
  const hideControlsTimeout = useRef(null);
  const [currentProgram, setCurrentProgram] = useState(null);

  const { width, height } = useWindowDimensions();

  const videoStyle = {
    width: width,
    height: height,
    alignSelf: 'center',
  };

  useEffect(() => {
    if (channelEpg && channelEpg.programs) {
      const now = new Date();
      const current = channelEpg.programs.find((program: { start: string | number | Date; stop: string | number | Date; }) => {
        const start = new Date(program.start);
        const end = new Date(program.stop);
        return now >= start && now <= end;
      });
      setCurrentProgram(current || null);
    }
  }, [channelEpg]);


  const handleScreenTap = () => {
    setIsOverlayVisible(true);
    setIsControlsVisible(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    hideControlsTimeout.current = setTimeout(() => {
      setIsOverlayVisible(false);
      setIsControlsVisible(false);
    }, 30000);
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Deteksi jenis stream (DASH atau HLS)
  const detectStreamType = (url: string | string[]) => {
    if (url.includes('.mpd')) {
      return 'dash';
    } else if (url.includes('.m3u8')) {
      return 'hls';
    } else {
      return 'unknown';
    }
  };

  // Parsing manual untuk MPD (DASH)
  const parseMpdManually = (mpdText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(mpdText, "text/xml");

    const adaptations = xmlDoc.getElementsByTagName("AdaptationSet");
    const resolutions = [];

    for (let i = 0; i < adaptations.length; i++) {
      const adaptation = adaptations[i];
      const contentType = adaptation.getAttribute("contentType");

      if (contentType === "video") {
        const representations = adaptation.getElementsByTagName("Representation");
        for (let j = 0; j < representations.length; j++) {
          const representation = representations[j];
          const id = representation.getAttribute("id");
          const width = parseInt(representation.getAttribute("width") || "0");
          const height = parseInt(representation.getAttribute("height") || "0");
          const bandwidth = parseInt(representation.getAttribute("bandwidth") || "0");
          const codecs = representation.getAttribute("codecs") || "unknown";

          resolutions.push({
            id,
            width,
            height,
            bandwidth,
            codecs,
            type: "video",
          });
        }
      } else if (contentType === "audio") {
        const representations = adaptation.getElementsByTagName("Representation");
        for (let j = 0; j < representations.length; j++) {
          const representation = representations[j];
          const id = representation.getAttribute("id");
          const bandwidth = parseInt(representation.getAttribute("bandwidth") || "0");
          const audioSamplingRate = parseInt(representation.getAttribute("audioSamplingRate") || "0");
          const codecs = representation.getAttribute("codecs") || "unknown";

          resolutions.push({
            id,
            bandwidth,
            audioSamplingRate,
            codecs,
            type: "audio",
          });
        }
      }
    }

    return resolutions;
  };

  // Parsing manual untuk M3U8 (HLS)
  const parseM3u8Manually = (m3u8Text: string) => {
    const lines = m3u8Text.split("\n");
    const resolutions = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
        const resolutionMatch = lines[i].match(/RESOLUTION=(\d+x\d+)/);
        const bandwidthMatch = lines[i].match(/BANDWIDTH=(\d+)/);

        if (resolutionMatch && bandwidthMatch) {
          const [width, height] = resolutionMatch[1].split("x");
          resolutions.push({
            id: resolutionMatch[1],
            width: parseInt(width),
            height: parseInt(height),
            bandwidth: parseInt(bandwidthMatch[1]),
          });
        }
      }
    }
    return resolutions;
  };


  // Ambil daftar resolusi dari manifest
  const getResolutions = async (url: string | string[] | URL | Request) => {
    const streamType = detectStreamType(url);
    const response = await fetch(url);
    const text = await response.text();

    if (streamType === 'dash') {
      const allResolutions = parseMpdManually(text);
      const videoResolutions = allResolutions.filter(res => res.type === "video");
      const audioResolutions = allResolutions.filter(res => res.type === "audio");

      return {
        video: videoResolutions,
        audio: audioResolutions,
      };
    } else if (streamType === 'hls') {
      const videoResolutions = parseM3u8Manually(text);
      return {
        video: videoResolutions,
        audio: [],
      };
    }
    return { video: [], audio: [] };
  };

  // Konfigurasi DRM
  const getDRMType = (licenseType: string, licenseKey: string) => {
    if (!licenseType || !licenseKey) return undefined;

    if (licenseType.toLowerCase() === "widevine" || licenseType === "com.widevine.alpha") {
      return {
        type: "widevine",
        licenseServer: licenseKey,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      };
    }

    if (licenseType.toLowerCase() === "clearkey") {
      const keyPairs = {};
      licenseKey.split(",").forEach((pair) => {
        const [kid, key] = pair.split(":").map((item) => item.trim());
        const base64Kid = hexToBase64(kid);
        const base64Key = hexToBase64(key);
        if (base64Kid && base64Key) {
          keyPairs[base64Kid] = base64Key;
        }
      });
      return {
        type: "clearkey",
        keys: keyPairs,
        headers: {},
      };
    }

    return undefined;
  };


  // Konversi HEX ke Base64
  const hexToBase64 = (hex: WithImplicitCoercion<string>) => {
    if (!/^[a-fA-F0-9]+$/.test(hex)) {
      //console.warn(`Invalid HEX input: ${hex}`);
      return null;
    }
    return Buffer.from(hex, "hex").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  useEffect(() => {
    const fetchResolutions = async () => {
      const { video, audio } = await getResolutions(channel.url);
      setVideoResolutions(video);
      setAudioResolutions(audio);

      if (video.length > 0) {
        const lowestResolution = video.reduce((prev, curr) =>
          curr.bandwidth < prev.bandwidth ? curr : prev
        );
        setSelectedResolution(lowestResolution.id);
      }
    };
    fetchResolutions();
  }, [channel.url]);


  const drmConfig = useMemo(() => {
    const streamType = detectStreamType(channel.url);
    if (streamType === 'dash') {
      const licenseType = "widevine";
      const licenseKey = "https://mrpw.ptmnc01.verspective.net/?deviceId=MDA5MmI1NjctOWMyMS0zNDYyLTk0NDAtODM5NGQ1ZjdlZWRi";
      return getDRMType(licenseType, licenseKey);
    }
    return undefined;
  }, [channel.url]);

  const getVideoSource = () => {
    const selectedVideo = videoResolutions.find((res) => res.id === selectedResolution);
    const selectedAudioTrack = audioResolutions.find((res) => res.id === selectedAudio);

    const uri = selectedVideo
      ? `${channel.url}?resolution=${selectedVideo.id}`
      : channel.url;

    return {
      uri,
      headers: {
        Referer: channel.headers?.Referer,
        "User-Agent": channel.headers?.["User-Agent"],
      },
      drm: drmConfig,
      audioTrack: selectedAudioTrack ? { id: selectedAudioTrack.id, language: "und" } : undefined,
    };
  };

  const handleResolutionChange = (resolutionId) => {
    if (resolutionId !== selectedResolution) {
      setSelectedResolution(resolutionId);
      reloadVideo();
    }
  }
  const handleAudioChange = (audioId) => {
    if (audioId !== selectedAudio) {
      setSelectedAudio(audioId);
    }
  }

  const handlePlayPause = () => {
    setIsPaused((prev) => !prev);
  };

  const onMuteToggle = () => {
    setIsMuted(prev => !prev);
    playerRef.current.setVolume(isMuted ? 1 : 0);
  };

  const updateCurrentTime = useCallback((data: { currentTime: React.SetStateAction<number>; }) => {
    setCurrentTime(data.currentTime);
  }, []);


  const onBuffer = (data: { isBuffering: boolean | ((prevState: boolean) => boolean); }) => {
    setIsBuffering(data.isBuffering);
  };

  const onError = (error: { error: { errorString: string; }; }) => {
    const errorMessage = error.error?.errorString || "Unknown error";
    console.error("Video Playback Error:", errorMessage);
    setErrorMessage(errorMessage);
    setIsLoading(false);
    setIsPaused(true);

    if (errorMessage.includes("DRM")) {
      Toast.show({
        type: "error",
        position: "top",
        text1: "DRM Error",
        text2: "DRM mungkin tidak cocok atau salah konfigurasi.",
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

  const onLoad = (data: { duration: number; }): void => {
    setIsLoading(true);
    setIsBuffering(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsBuffering(false);
      setErrorMessage(null);
    }, 500);

    setDuration(data.duration);
    setMetadata({
      duration: data.duration,
      tvgId: channel.tvg?.id || "Unknown",
      tvgLogo: channel.tvg?.logo || "No Logo",
    });
  };


  const reloadVideo = (): void => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsPaused(false);
    setReloadKey((prevKey) => prevKey + 1);
  }

  const onEnd = () => {
    setIsPaused(true);
    setIsOverlayVisible(false);
  };

  return (
    <View style={styles.container} onTouchStart={handleScreenTap}>

      <Video
        style={videoStyle}
        ref={playerRef}
        source={getVideoSource()}
        onBuffer={onBuffer}
        onError={onError}
        onLoad={onLoad}
        onEnd={onEnd}
        onProgress={updateCurrentTime}
        paused={isPaused}
        rate={rate}
        resizeMode="contain"
        controls={false}
      />
      {isControlsVisible && (
        <Animatable.View animation="fadeInUp" duration={500} style={styles.controlsWrapper}>
          <CustomControls
            isPlaying={!isPaused}
            onPlayPause={handlePlayPause}
            isMuted={isMuted}
            onMuteToggle={onMuteToggle}
            videoResolutions={videoResolutions}
            audioResolutions={audioResolutions}
            onResolutionSelect={handleResolutionChange}
            onAudioSelect={handleAudioChange}
            metadata={metadata}
            channel={channel}
          />
        </Animatable.View>
      )}
      {/* Loading Animation */}
      {isLoading && !errorMessage && (
        <View style={styles.loadingOverlay}>
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

      {/* Buffering Animation */}
      {isBuffering && !isLoading && !errorMessage && (
        <View style={styles.loadingOverlay}>
          <LottieView
            source={require("../../assets/animasi/buffering.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.loadingText}>Buffering...</Text>
        </View>
      )}

      {/* Error Message */}
      {errorMessage && (
        <View style={styles.errorOverlay}>
          <LottieView
            source={require("../../assets/animasi/buffering.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.errorText}>Error: {errorMessage}</Text>
          <TouchableOpacity onPress={reloadVideo} style={styles.reloadButton}>
            <Text style={styles.reloadButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>

  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.17)",
    zIndex: 10,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 15,
  },
  lottie: {
    width: 100,
    height: 100,
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 10,
  },
  controlsWrapper: {
    position: "absolute",
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
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
  reloadButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 10,
  },
  reloadButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  reloadButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  endContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
  },
  resolutionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  resolutionList: {
    position: "absolute",
    bottom: 60,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    padding: 10,
    borderRadius: 5,
  },
  resolutionText: {
    color: "#fff",
    fontSize: 14,
    padding: 5,
  },
  audioList: {
    position: "absolute",
    bottom: 60,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 10,
    borderRadius: 5,
  },
  audioText: {
    color: "#fff",
    fontSize: 14,
    padding: 5,
  },
});

export default VideoScreen;
