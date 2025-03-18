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
}) => {
  const [showControls, setShowControls] = useState(false);
  const [showResolutions, setShowResolutions] = useState(false);
  const [showAudioTracks, setShowAudioTracks] = useState(false);
  const [focusedButton, setFocusedButton] = useState("playPause");
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const timeoutRef = useRef(null);

  const showControlsOnInteraction = () => {
    setShowControls(true); 
    clearTimeout(timeoutRef.current); 
    
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 10000);
  };

  useTVEventHandler((evt) => {
    if (
      evt.eventType === "select" ||
      evt.eventType === "right" || 
      evt.eventType === "left" ||
      evt.eventType === "focus" || 
      evt.eventType === "onTouch"   
    ) {
      showControlsOnInteraction();
    }

    if (showControls) {
      switch (evt.eventType) {
        case "right":
          if (focusedButton === "playPause") setFocusedButton("mute");
          else if (focusedButton === "mute") setFocusedButton("settings");
          else if (focusedButton === "settings") setFocusedButton("audio");
          break;

        case "left":
          if (focusedButton === "audio") setFocusedButton("settings");
          else if (focusedButton === "settings") setFocusedButton("mute");
          else if (focusedButton === "mute") setFocusedButton("playPause");
          break;

        case "select":
          if (focusedButton === "playPause") onPlayPause();
          if (focusedButton === "mute") onMuteToggle();
          if (focusedButton === "settings") {
            setShowResolutions((prev) => !prev);
          }
          if (focusedButton === "audio") {
            setShowAudioTracks((prev) => !prev);
          }
          break;

        default:
          break;
      }
    }
  });

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleResolutionSelect = (id) => {
    setSelectedResolution(id);
    onResolutionSelect(id);
    setShowResolutions(false);
  };

  const handleAudioSelect = (id) => {
    setSelectedAudio(id);
    onAudioSelect(id);
    setShowAudioTracks(false); 
  };

  return (
    <TouchableWithoutFeedback onPress={showControlsOnInteraction}>
      <View style={{ flex: 1 }}>
        {showControls && (
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
              onPress={() => setShowResolutions((prev) => !prev)}
              onFocus={() => setFocusedButton("settings")}
              style={[
                styles.controlButton,
                focusedButton === "settings" && styles.focusedButton,
              ]}
            >
              <Icon name="settings" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAudioTracks((prev) => !prev)}
              onFocus={() => setFocusedButton("audio")}
              style={[
                styles.controlButton,
                focusedButton === "audio" && styles.focusedButton,
              ]}
            >
              <Icon name="audiotrack" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        <Modal transparent visible={showResolutions} onRequestClose={() => setShowResolutions(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pilih Resolusi Video</Text>
              <ScrollView>
                {videoResolutions.length > 0 ? (
                  videoResolutions.map((res) => (
                    <TouchableOpacity
                      key={res.id}
                      onPress={() => handleResolutionSelect(res.id)}
                      style={[
                        styles.resolutionItem,
                        selectedResolution === res.id && styles.selectedItem,
                      ]}
                    >
                      <Text style={styles.resolutionText}>{`${res.width}x${res.height}`}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.resolutionText}>Tidak ada resolusi tersedia</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal transparent visible={showAudioTracks} onRequestClose={() => setShowAudioTracks(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pilih Kualitas Audio</Text>
              <ScrollView>
                {audioResolutions.length > 0 ? (
                  audioResolutions.map((audio) => (
                    <TouchableOpacity
                      key={audio.id}
                      onPress={() => handleAudioSelect(audio.id)}
                      style={[
                        styles.audioItem,
                        selectedAudio === audio.id && styles.selectedItem,
                      ]}
                    >
                      <Text style={styles.audioText}>{`${audio.audioSamplingRate / 1000} kHz`}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.audioText}>Tidak ada audio tersedia</Text>
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
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    width: "50%",
    alignSelf: "center",
    position: 'absolute',
    bottom: 5,
  },
  controlButton: {
    padding: 5,
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
    shadowColor: "#000", 
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, 
  },

  modalContent: {
    backgroundColor: "#1c1c1c", 
    borderRadius: 10,
    padding: 10, 
    width: "40%",
    maxHeight: "60%",
  },
  resolutionItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  audioItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  selectedItem: {
    backgroundColor: "#1EB1FC",
  },
  resolutionText: {
    fontSize: 15, 
    color: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  audioText: {
    fontSize: 15, 
    color: "#fff", 
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


});

export default CustomControls;
