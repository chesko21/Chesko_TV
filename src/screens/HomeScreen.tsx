import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  ImageBackground,
  BackHandler,
  Pressable,
  DeviceEventEmitter,
  Dimensions,
} from "react-native";
import { fetchAndParsePlaylist } from "../utils/ParsePlaylist";
import { useNavigation } from "@react-navigation/native";
import defaultLogo from "../../assets/images/tv_banner.png";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Menu from "../components/Menu";
import LottieView from "lottie-react-native";

const LAST_WATCHED_KEY = "lastWatched";
const PLAYLIST_KEY = "playlist";
const PLAYLIST_URLS_KEY = "playlistUrls";
const DEFAULT_PLAYLIST_URL = "https://pastebin.com/raw/JyCSD9r1";

const HomeScreen = () => {
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [lastWatched, setLastWatched] = useState([]);
  const [lastSelectedChannel, setLastSelectedChannel] = useState(null);
  const [focusedChannel, setFocusedChannel] = useState(null);
  const [focusedGroup, setFocusedGroup] = useState(null);
  const [numColumns, setNumColumns] = useState(6);
  const [itemSize, setItemSize] = useState(100);
  const navigation = useNavigation();
  const isMounted = useRef(true);
  const channelRefs = useRef({});

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const activeUrlListener = DeviceEventEmitter.addListener("ActiveURLChanged", (newUrl) => {
     // console.log("Active URL changed:", newUrl);
      fetchPlaylist(newUrl);
    });

    return () => {
      activeUrlListener.remove();
    };
  }, []);

  const fetchPlaylist = async (playlistUrl) => {
    if (!playlistUrl) {
      setError("Cannot load an empty URL.");
      return;
    }
    try {
      setIsLoading(true);
      const data = await fetchAndParsePlaylist(playlistUrl);
      await AsyncStorage.setItem(PLAYLIST_KEY, JSON.stringify(data.items));
      if (isMounted.current) {
        setChannels(Array.isArray(data.items) ? data.items : []);
      }
    } catch (err) {
      console.error("Error fetching playlist:", err);
      if (isMounted.current) {
        setError(`Failed to load playlist: ${err.message}`);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const loadActivePlaylistUrl = async () => {
    try {
      const savedUrlsString = await AsyncStorage.getItem(PLAYLIST_URLS_KEY);
      if (savedUrlsString) {
        const savedUrls = JSON.parse(savedUrlsString);
        //console.log("Loaded URLs:", savedUrls);
        const activeUrlObj = savedUrls.find((item) => item.isActive);
        if (activeUrlObj && activeUrlObj.url) {
          fetchPlaylist(activeUrlObj.url);
        } else {
          fetchPlaylist(DEFAULT_PLAYLIST_URL);
        }
      } else {
        fetchPlaylist(DEFAULT_PLAYLIST_URL);
      }
    } catch (error) {
      setError("Failed to retrieve active playlist URL.");
      console.error("Error loading URLs:", error);
    }
  };

  useEffect(() => {
    loadActivePlaylistUrl();
  }, []);

  useEffect(() => {
    const loadLastWatched = async () => {
      try {
        const storedLastWatched = await AsyncStorage.getItem(LAST_WATCHED_KEY);
        if (storedLastWatched) {
          setLastWatched(JSON.parse(storedLastWatched));
        }
      } catch (e) {
        console.log("Error loading last watched channels:", e);
      }
    };
    loadLastWatched();
  }, []);

  const handleReload = async () => {
    setIsReloading(true);
    await loadActivePlaylistUrl();
    setIsReloading(false);
  };

  const handleRecentWatchPress = () => {
    setSelectedGroup("Recents Watch");
  };

  const handleGroupSelect = (groupTitle) => {
    setSelectedGroup(groupTitle);
  };

  const handleExit = () => {
    BackHandler.exitApp();
  };

  const handleSettings = () => {
    navigation.navigate("Settings");
  };

  const handleChannelPress = (channel) => {
    setLastSelectedChannel(channel.url);
    navigation.navigate("VideoScreen", { channel });
    setLastWatched((prev) => {
      const updatedLastWatched = [channel, ...prev.filter((ch) => ch.url !== channel.url)];
      AsyncStorage.setItem(LAST_WATCHED_KEY, JSON.stringify(updatedLastWatched));
      return updatedLastWatched;
    });
  };

  const groupChannelsByGroupTitle = (channelsArr) => {
    if (!Array.isArray(channelsArr)) return {};
    const grouped = channelsArr.reduce((acc, channel) => {
      const groupName = channel.group?.title || "No Group";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(channel);
      return acc;
    }, {});
    const recentGroup = Array.isArray(lastWatched) ? lastWatched.slice(0, 20) : [];
    if (recentGroup.length > 0) {
      grouped["Recents Watch"] = recentGroup;
    }
    return grouped;
  };

  const groupedChannels = useMemo(() => groupChannelsByGroupTitle(channels), [channels, lastWatched]);

  const groupTitles = Object.keys(groupedChannels).filter((title) => title !== "Recents Watch");

  useEffect(() => {
    const updateLayout = () => {
      const { width } = Dimensions.get("window");
      const columns = Math.min(Math.floor(width / 100), 6);
      setNumColumns(columns);
      setItemSize(width / columns - 16);
    };

    updateLayout();

    const subscription = Dimensions.addEventListener("change", updateLayout);
    return () => subscription?.remove();
  }, []);

  const renderChannel = ({ item, index }) => {
    const isFocused = focusedChannel === item?.url;
    const logoUri = item?.tvg?.logo && /^(http|https):\/\//.test(item.tvg.logo) ? { uri: item.tvg.logo } : defaultLogo;

    const truncatedName = item?.name?.length > 12 ? `${item.name.slice(0, 12)}...` : item?.name;

    return (
      <Pressable
        ref={(ref) => (channelRefs.current[item.url] = ref)} // Store ref
        focusable={true}
        onFocus={() => {
          setFocusedChannel(item?.url);
          channelRefs.current[item.url]?.setNativeProps({ style: { borderColor: "#ffaa00" } }); // Update border color
        }}
        onBlur={() => {
          setFocusedChannel(null);
          channelRefs.current[item.url]?.setNativeProps({ style: { borderColor: "#24538e" } }); // Revert border color
        }}
        onPress={() => handleChannelPress(item)}
        style={[
          styles.channelContainer,
          isFocused && styles.focusedChannel,
          { width: itemSize, height: itemSize },
        ]}
      >
        <Image source={logoUri} style={styles.channelLogo} />
        <Text style={styles.channelName}>{truncatedName}</Text>
      </Pressable>
    );
  };

  const renderGroupItem = ({ item }) => {
    const isFocused = focusedGroup === item;
    return (
      <Pressable
        focusable={true}
        onFocus={() => setFocusedGroup(item)}
        onPress={() => handleGroupSelect(item)}
        style={[
          styles.groupItem,
          item === selectedGroup && { backgroundColor: "rgba(243, 239, 3, 0.55)" },
          isFocused && styles.focusedGroup,
        ]}
      >
        <Text style={styles.groupText}>{item}</Text>
      </Pressable>
    );
  };

  const getItemLayout = (data, index) => {
    return {
      length: itemSize + 16, // itemSize + margins
      offset: (itemSize + 16) * index,
      index,
    };
  };

  return (
    <View style={styles.container}>
      <Menu
        onReloadPress={handleReload}
        onExitPress={handleExit}
        onSettingsPress={handleSettings}
        onRecentWatchPress={handleRecentWatchPress}
        isReloading={isReloading}
      />
      {isLoading ? (
        <LottieView source={require("../../assets/animasi/loading.json")} autoPlay loop style={styles.loadingIndicator} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.content}>
          <View style={styles.sidebar}>
            <FlatList
              data={groupTitles}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item}
              getItemLayout={(data, index) => ({
                length: 60,
                offset: 60 * index,
                index,
              })}
            />
          </View>
          <View style={styles.mainContent}>
            <ImageBackground source={require("../../assets/images/foreground.png")} style={styles.backgroundImage}>
              {selectedGroup ? (
                <FlatList
                  data={groupedChannels[selectedGroup] || []}
                  renderItem={renderChannel}
                  keyExtractor={(item) => (item.id ? item.id.toString() : `${item.url}-${item.name}`)}
                  numColumns={numColumns}
                  getItemLayout={getItemLayout} // Add this for performance
                />
              ) : (
                <Text style={styles.noGroupText}>Select a Group to see Channels</Text>
              )}
            </ImageBackground>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020f1f",
  },
  content: {
    flexDirection: "row",
    flex: 1,
  },
  sidebar: {
    width: "20%",
    padding: 10,
    backgroundColor: "#020f1f",
    borderRightWidth: 1,
    borderRightColor: "#eea509",
  },
  mainContent: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
    padding: 2,
  },
  channelContainer: {
    width: "80%",
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
    backgroundColor: "#24538e",
    borderRadius: 8,
    padding: 5,
  },
  channelLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "contain",
    borderColor: "#bbe53e",
    borderWidth: 2,
  },
  channelName: {
    color: "#fff",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },
  noGroupText: {
    textAlign: "center",
    fontSize: 18,
    color: "#ccc",
  },
  groupItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: "#24538e",
  },
  groupText: {
    color: "#fff",
    fontSize: 14,
    justifyContent: "center",
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    resizeMode: "cover",
    maxHeight: 100,
  },
  errorText: {
    color: "#EC1818",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  focusedChannel: {
    borderWidth: 2,
    borderColor: "#ffaa00",
    backgroundColor: "#1c3c",
  },
  focusedGroup: {
    borderWidth: 2,
    borderColor: "#ffaa00",
    backgroundColor: "#1c3c",
  },
});

export default HomeScreen;