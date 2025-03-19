import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Text,
  ScrollView,
  useTVEventHandler,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";


const CustomControls = ({
  isPlaying,
  onPlayPause,
  isMuted,
  onMuteToggle,
  videoResolutions,
  audioResolutions,
  onResolutionSelect,
  onAudioSelect,
  metadata,
  channel,
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showResolutions, setShowResolutions] = useState(false);
  const [showAudioTracks, setShowAudioTracks] = useState(false);
  const [focusedButton, setFocusedButton] = useState("playPause");
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);

  const timeoutRef = useRef(null);
  const formatResolution = (_width: any, height: number) => {
    if (height <= 144) return '144p';
    if (height <= 240) return '240p';
    if (height <= 360) return '360p';
    if (height <= 480) return '480p';
    if (height <= 720) return '720p';
    if (height <= 1080) return '1080p';
    return `${height}p`; 
  };


  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const showControlsOnInteraction = () => {
    setShowControls(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  const hideControls = () => {
    setShowControls(false);
    clearTimeout(timeoutRef.current);
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
    if (!showControls) {
      showControlsOnInteraction();
    }
  };

  useTVEventHandler((evt) => {
    showControlsOnInteraction();
    if (showControls) {
      switch (evt.eventType) {
        case "right":
          changeFocus("right");
          break;
        case "left":
          changeFocus("left");
          break;
        case "select":
          executeAction();
          break;
        case "up":
          if (!showResolutions && !showAudioTracks) {
            setFocusedButton("resolutions");
          }
          break;
        case "down":
          if (!showResolutions && !showAudioTracks) {
            resetFocus();
          }
          break;
        case "focus":
          if (showResolutions) {
            setFocusedItem(null);
          }
          break;
        default:
          break;
      }
    }
  });

  const changeFocus = (direction: string) => {
    const buttons = ["playPause", "mute", "settings", "audio"];
    const currentIndex = buttons.indexOf(focusedButton);

    if (direction === "right" && currentIndex < buttons.length - 1) {
      setFocusedButton(buttons[currentIndex + 1]);
    } else if (direction === "left" && currentIndex > 0) {
      setFocusedButton(buttons[currentIndex - 1]);
    }
  };

  const executeAction = () => {
    switch (focusedButton) {
      case "playPause":
        onPlayPause();
        break;
      case "mute":
        onMuteToggle();
        break;
      case "settings":
        setShowResolutions(true);
        break;
      case "audio":
        setShowAudioTracks(true);
        break;
      default:
        break;
    }
  };

  const resetFocus = () => {
    setFocusedButton("playPause");
  };

  const handleResolutionSelect = (id) => {
    setSelectedResolution(id);
    onResolutionSelect(id);
    hideControls();
    setShowResolutions(false);
  };

  const handleAudioSelect = (id) => {
    setSelectedAudio(id);
    onAudioSelect(id);
    hideControls();
    setShowAudioTracks(false);
  };

  const renderMetadata = () => {
    if (!metadata) return null;

    return (
      <View style={styles.metadataContainer}>
        {metadata.tvgLogo && <Image source={{ uri: metadata.tvgLogo }} style={styles.logoImage} />}
        <View style={styles.textContainer}>
          <Text style={styles.metadataText}>{channel.name}</Text>
          <Text style={styles.metadataText}>{metadata.tvgId || "No ID"}</Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={toggleControls}>
      <View style={styles.container}>
        {showControls && (
          <>
            <View style={styles.metadataWrapper}>
              {renderMetadata()}
            </View>
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                onPress={onPlayPause}
                onFocus={() => setFocusedButton("playPause")}
                style={[
                  styles.controlButton,
                  focusedButton === "playPause" && styles.focusedButton,
                ]}
              >
                <Icon name={isPlaying ? "pause" : "play-arrow"} size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onMuteToggle}
                onFocus={() => setFocusedButton("mute")}
                style={[
                  styles.controlButton,
                  focusedButton === "mute" && styles.focusedButton,
                ]}
              >
                <Icon name={isMuted ? "volume-off" : "volume-up"} size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowResolutions(true)}
                onFocus={() => setFocusedButton("settings")}
                style={[
                  styles.controlButton,
                  focusedButton === "settings" && styles.focusedButton,
                ]}
              >
                <Icon name="settings" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAudioTracks(true)}
                onFocus={() => setFocusedButton("audio")}
                style={[
                  styles.controlButton,
                  focusedButton === "audio" && styles.focusedButton,
                ]}
              >
                <Icon name="audiotrack" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Modal untuk Resolusi Video */}
        <Modal
          transparent
          visible={showResolutions}
          animationType="slide"
          onRequestClose={() => setShowResolutions(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pilih Resolusi Video</Text>
              <ScrollView>
                {videoResolutions.length > 0 ? (
                  videoResolutions.map((res) => (
                    <TouchableOpacity
                      key={res.id}
                      onPress={() => handleResolutionSelect(res.id)}
                      onFocus={() => setFocusedItem(res.id)}
                      style={[
                        styles.resolutionItem,
                        selectedResolution === res.id && styles.selectedItem,
                        focusedItem === res.id && { backgroundColor: "#1EB1FC" },
                      ]}
                    >
                      <Text style={[
                        styles.resolutionText,
                        selectedResolution === res.id ? { color: '#000' } : { color: '#fff' },
                      ]}>
                        {formatResolution(res.width, res.height)}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    <Text style={styles.resolutionText}>Tidak ada resolusi tersedia</Text>
                    <TouchableOpacity
                      onPress={() => setShowResolutions(false)}
                      onFocus={() => setFocusedItem("backResolution")}
                      style={[
                        styles.backButton,
                        focusedItem === "backResolution" && { backgroundColor: "#1EB1FC" },
                      ]}
                    >
                      <Text style={styles.backText}>Kembali</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
        
        {/* Modal untuk Audio Tracks */}
        <Modal
          transparent
          visible={showAudioTracks}
          animationType="slide"
          onRequestClose={() => setShowAudioTracks(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pilih Kualitas Audio</Text>
              <ScrollView>
                {audioResolutions.length > 0 ? (
                  audioResolutions.map((audio) => (
                    <TouchableOpacity
                      key={audio.id}
                      onPress={() => handleAudioSelect(audio.id)}
                      onFocus={() => setFocusedItem(audio.id)}
                      style={[
                        styles.audioItem,
                        selectedAudio === audio.id && styles.selectedItem,
                        focusedItem === audio.id && { backgroundColor: "#1EB1FC" },
                      ]}
                    >
                      <Text style={[
                        styles.audioText,
                        selectedAudio === audio.id ? { color: '#000' } : { color: '#fff' },
                      ]}>
                        {`${audio.audioSamplingRate / 1000} kHz`}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    <Text style={styles.audioText}>Tidak ada audio tersedia</Text>
                    <TouchableOpacity
                      onPress={() => setShowAudioTracks(false)}
                      onFocus={() => setFocusedItem("backAudio")}
                      style={[
                        styles.backButton,
                        focusedItem === "backAudio" && { backgroundColor: "#1EB1FC" },
                      ]}
                    >
                      <Text style={styles.backText}>Kembali</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  metadataWrapper: {
    marginBottom: 10,
    left: 10,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 10,
    width: "30%",
    position: 'relative',
    bottom: 10,
    
  },
  controlButton: {
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  focusedButton: {
    borderColor: "#1EB1FC",
    borderWidth: 2,
    borderRadius: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 10,
  },
  modalContent: {
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    padding: 2,
    width: "25%",
    maxHeight: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  resolutionItem: {
    padding: 10,
    marginBottom: 5,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  audioItem: {
    padding: 10,
    marginBottom: 5,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  selectedItem: {
    backgroundColor:  "rgba(43, 11, 185, 0.8)",
  },
  resolutionText: {
    fontSize: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  audioText: {
    fontSize: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: "#fff",
    marginBottom: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  metadataContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
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
  backButton: {
    marginTop: 15,
    padding: 5,
    backgroundColor: "#333",
    alignItems: "center",
    borderRadius: 5,
    marginBottom: 10,
  },
  backText: {
    color: "#fff",
    fontSize: 12,
  },
});

export default CustomControls;