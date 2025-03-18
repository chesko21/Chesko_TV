import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { debounce } from "lodash";
import { View, Text, StyleSheet, Dimensions, Image, Button, TouchableOpacity, Modal } from "react-native";
import Video from "react-native-video";
import { useRoute } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import Toast from "react-native-toast-message";
import * as Animatable from "react-native-animatable";
import { Buffer, WithImplicitCoercion } from "buffer";
import { DOMParser } from 'xmldom';
import CustomControls from "./CustomControls";

Dimensions.get("window");

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

  // Perbarui currentProgram berdasarkan channelEpg
  useEffect(() => {
    if (channelEpg && channelEpg.programs) {
      const now = new Date();
      const current = channelEpg.programs.find(program => {
        const start = new Date(program.start);
        const end = new Date(program.stop);
        return now >= start && now <= end;
      });
      setCurrentProgram(current || null);
    }
  }, [channelEpg]);

  // Fungsi untuk memuat ulang video
  const reloadVideo = (): void => {

    setReloadKey((prevKey) => prevKey + 1);
    setIsLoading(true);
    setErrorMessage(null);
    setIsPaused(false);
  };

  const handleScreenTap = (): void => {

    setIsOverlayVisible(true);
    setIsControlsVisible(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      setIsOverlayVisible(false);
      setIsControlsVisible(false);
    }, 10000);
  };

  // Bersihkan timer saat komponen unmount
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
      console.warn(`Invalid HEX input: ${hex}`);
      return null;
    }
    return Buffer.from(hex, "hex").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  // Ambil resolusi saat URL berubah
  useEffect(() => {
    const fetchResolutions = async (): Promise<void> => {

      const { video, audio } = await getResolutions(channel.url);
      setVideoResolutions(video);
      setAudioResolutions(audio);

      // Pilih resolusi terendah secara default
      if (video.length > 0) {
        const lowestResolution = video.reduce((prev, curr) =>
          curr.bandwidth < prev.bandwidth ? curr : prev
        );
        setSelectedResolution(lowestResolution.id);
      }
    };
    fetchResolutions();
  }, [channel.url]);

  // Konfigurasi DRM berdasarkan jenis stream
  const drmConfig = useMemo(() => {
    const streamType = detectStreamType(channel.url);
    if (streamType === 'dash') {
      const licenseType = "widevine";
      const licenseKey = "https://mrpw.ptmnc01.verspective.net/?deviceId=MDA5MmI1NjctOWMyMS0zNDYyLTk0NDAtODM5NGQ1ZjdlZWRi"; // Hardcode license_key
      return getDRMType(licenseType, licenseKey);
    }
    return undefined;
  }, [channel.url]);

  // Sumber video berdasarkan resolusi yang dipilih
  const getVideoSource = () => {
    const selectedVideo = videoResolutions.find(res => res.id === selectedResolution);
    const selectedAudioTrack = audioResolutions.find(res => res.id === selectedAudio);

    if (selectedVideo) {
      return {
        uri: `${channel.url}?resolution=${selectedVideo.id}`,
        headers: {
          Referer: channel.headers?.Referer,
          "User-Agent": channel.headers?.["User-Agent"],
        },
        drm: drmConfig,
        audioTrack: selectedAudioTrack ? {
          id: selectedAudioTrack.id,
          language: "und",
        } : undefined,
      };
    }
    return {
      uri: channel.url,
      headers: {
        Referer: channel.headers?.Referer,
        "User-Agent": channel.headers?.["User-Agent"],
      },
      drm: drmConfig,
    };
  };

  const handlePlayPause = () => {
    setIsPaused((prev) => !prev);
  };


  // Handler untuk mute/unmute
  const onMuteToggle = () => {
    setIsMuted(prev => !prev);
    playerRef.current.setVolume(isMuted ? 1 : 0);
  };

  const updateCurrentTime = useCallback((data: { currentTime: React.SetStateAction<number>; }) => {
    setCurrentTime(data.currentTime);
  }, []);


  const onBuffer = (data) => {
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

  // Handler saat video berhasil dimuat
  const onLoad = (data: { duration: number; }): void => {

    setTimeout(() => {
      setIsLoading(false);
      setIsBuffering(false);
      setErrorMessage(null);
    }, 300);

    setDuration(data.duration);
    setMetadata({
      duration: data.duration,
      tvgId: channel.tvg?.id || "Unknown",
      tvgLogo: channel.tvg?.logo || "No Logo",
    });
  };

  // Handler saat video selesai diputar
  const onEnd = () => {
    setIsPaused(true);
    setIsOverlayVisible(false);
  };

  // Render metadata
  const renderMetadata = (): JSX.Element => {

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

  return (
    <View style={styles.container} onTouchStart={handleScreenTap}>
      {/* Animasi Loading */}
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

      {/* Animasi Buffering */}
      {isBuffering && !isLoading && !errorMessage && (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require("../../assets/animasi/buffering.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.loadingText}>Buffering...</Text>
        </View>
      )}

      {/* Animasi Error */}
      {errorMessage && (
        <View style={styles.errorContainer}>
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

      {/* Video Player */}
      <Video
        style={styles.video}
        ref={playerRef}
        source={getVideoSource()}
        style={styles.video}
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
      {/* Custom Controls */}
      {isControlsVisible && (
        <Animatable.View animation="fadeInUp" duration={500} style={styles.controlsWrapper}>
          <CustomControls
            isPlaying={!isPaused}
            onPlayPause={handlePlayPause}
            isMuted={isMuted}
            onMuteToggle={onMuteToggle}
            videoResolutions={videoResolutions}
            audioResolutions={audioResolutions}
            onResolutionSelect={setSelectedResolution}
            onAudioSelect={setSelectedAudio}
          />
        </Animatable.View>
      )}
      {/* Overlay for metadata and program info */}
      {isOverlayVisible && (
        <Animatable.View animation="fadeInDown" duration={500} style={styles.overlayContainer}>
          <View style={styles.metadataContainer}>
            {metadata.tvgLogo && <Image source={{ uri: metadata.tvgLogo }} style={styles.logoImage} />}
            <View style={styles.textContainer}>
              <Text style={styles.metadataText}>{channel.name}</Text>
              <Text style={styles.metadataText}>{metadata.tvgId}</Text>
            </View>
          </View>

        </Animatable.View>
      )}

      {/* Animasi Selesai (Opsional) */}
      {isPaused && currentTime >= duration && duration > 0 && (
        <View style={styles.endContainer}>
          <LottieView
            source={require("../../assets/animasi/loading.json")}
            autoPlay
            loop={false}
            style={styles.lottie}
          />
          <Text style={styles.endText}>Video Pause</Text>
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
   
  },
  controlsWrapper: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
   
  },
  metadataContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 2, 2, 0.07)",
    maxWidth: "30%",
    padding: 10,
    borderRadius: 20,
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
    padding: 10,
    borderRadius: 8,
    maxWidth: '40%',
    overflow: "hidden",
    color: "#fff",
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
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
