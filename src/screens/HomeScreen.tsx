
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
  DeviceEventEmitter
} from "react-native";
import { fetchAndParsePlaylist } from "../utils/ParsePlaylist";
import { useNavigation } from "@react-navigation/native";
import defaultLogo from "../../assets/images/tv_banner.png";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import Menu from "../components/Menu";
import LottieView from "lottie-react-native";

const FAVORITE_CHANNELS_KEY = "favoriteChannels";
const LAST_WATCHED_KEY = "lastWatched";
const PLAYLIST_KEY = "playlist";
const PLAYLIST_URLS_KEY = "playlistUrls";
const DEFAULT_PLAYLIST_URL = "https://pastebin.com/raw/JyCSD9r1";

const HomeScreen = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [favoriteChannels, setFavoriteChannels] = useState<Set<string>>(new Set());
  const [lastWatched, setLastWatched] = useState<any[]>([]);
  const [focusedChannel, setFocusedChannel] = useState<string | null>(null);
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null);
  const [focusedFavorite, setFocusedFavorite] = useState<string | null>(null);
  
  const navigation = useNavigation();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const activeUrlListener = DeviceEventEmitter.addListener("ActiveURLChanged", (newUrl) => {
      console.log("Active URL changed:", newUrl); 
      fetchPlaylist(newUrl);
    });
    
  
    return () => {
      activeUrlListener.remove();
    };
  }, []);
  
  const fetchPlaylist = async (playlistUrl: string) => {
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
    } catch (err: any) {
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
        console.log("Loaded URLs:", savedUrls); 
        const activeUrlObj = savedUrls.find((item: any) => item.isActive);
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
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem(FAVORITE_CHANNELS_KEY);
        if (storedFavorites) {
          setFavoriteChannels(new Set(JSON.parse(storedFavorites)));
        }
      } catch (e) {
        console.log("Error loading favorite channels:", e);
      }
    };
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
    loadFavorites();
    loadLastWatched();
  }, []);

  const handleReload = async () => {
    setIsReloading(true);
    await loadActivePlaylistUrl();
    setIsReloading(false);
  };

  const handleFavoritesPress = () => {
    setSelectedGroup("Favorit");
  };

  const handleRecentWatchPress = () => {
    setSelectedGroup("Recents Watch");
  };

  const handleGroupSelect = (groupTitle: string) => {
    setSelectedGroup(groupTitle);
  };

  const handleExit = () => {
    BackHandler.exitApp();
  };

  const handleSettings = () => {
    navigation.navigate("Settings");
  };

  const handleChannelPress = (channel: any) => {
    if (!channel.license || !channel.license.license_key) {
    }
  
    navigation.navigate("VideoScreen", { channel });

    setLastWatched((prev: any[]) => {
      const updatedLastWatched = [
        channel,
        ...prev.filter((ch) => ch.url !== channel.url),
      ];
      AsyncStorage.setItem(LAST_WATCHED_KEY, JSON.stringify(updatedLastWatched));
      return updatedLastWatched;
    });
  };
  
  

  const handleFavoriteToggle = useCallback((channel: any) => {
    setFavoriteChannels((prev) => {
      const updatedFavorites = new Set(prev);
      if (updatedFavorites.has(channel.url)) {
        updatedFavorites.delete(channel.url);
      } else {
        updatedFavorites.add(channel.url);
      }
      AsyncStorage.setItem(FAVORITE_CHANNELS_KEY, JSON.stringify([...updatedFavorites]));
      return updatedFavorites;
    });
  }, []);

  const groupChannelsByGroupTitle = (channelsArr: any[]) => {
    if (!Array.isArray(channelsArr)) return {};
    const grouped: { [key: string]: any[] } = channelsArr.reduce((acc, channel) => {
      const groupName = channel.group?.title || "No Group";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(channel);
      return acc;
    }, {} as { [key: string]: any[] });
    const favoriteGroup = channelsArr.filter((channel) => favoriteChannels.has(channel.url));
    if (favoriteGroup.length > 0) {
      grouped["Favorit"] = favoriteGroup;
    }
    const recentGroup = Array.isArray(lastWatched) ? lastWatched.slice(0, 20) : [];
    if (recentGroup.length > 0) {
      grouped["Recents Watch"] = recentGroup;
    }
    return grouped;
  };

  const groupedChannels = useMemo(
    () => groupChannelsByGroupTitle(channels),
    [channels, favoriteChannels, lastWatched]
  );

  const groupTitles = Object.keys(groupedChannels).filter(
    (title) => title !== "Favorit" && title !== "Recents Watch"
  );

  const renderChannel = ({ item }: { item: any }) => {
    const isFocused = focusedChannel === item?.url;
    const isFavoriteFocused = focusedFavorite === item?.url;
    const isFavorite = favoriteChannels.has(item?.url);
    const logoUri =
      item?.tvg?.logo && /^(http|https):\/\//.test(item.tvg.logo)
        ? { uri: item.tvg.logo }
        : defaultLogo;
  
    const truncatedName = item?.name?.length > 12 ? `${item.name.slice(0, 12)}...` : item?.name;
  
    return (
      <Pressable
        focusable={true}
        onFocus={() => setFocusedChannel(item?.url)}
        onPress={() => handleChannelPress(item)}
        style={[
          styles.channelContainer,
          isFocused && styles.focusedChannel,
        ]}
      >
        <Image source={logoUri} style={styles.channelLogo} />
        <Text style={styles.channelName}>{truncatedName}</Text>
  
        {/* Tombol Favorite */}
        <Pressable
          focusable={true}
          onFocus={() => setFocusedFavorite(item?.url)}
          onBlur={() => setFocusedFavorite(null)}
          onPress={() => handleFavoriteToggle(item)}
          style={[
            styles.favoriteButton,
            isFavoriteFocused && styles.focusedFavoriteButton,
          ]}
        >
          <Icon
            name={isFavorite ? "favorite" : "favorite-border"}
            size={24}
            color={isFavorite ? "#ff4081" : "#0A0B00"}
          />
        </Pressable>
      </Pressable>
    );
  };
  
  const renderGroupItem = ({ item }: { item: string }) => {
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

  return (
    <View style={styles.container}>
      <Menu
        onReloadPress={handleReload}
        onExitPress={handleExit}
        onSettingsPress={handleSettings}
        onFavoritesPress={handleFavoritesPress}
        onRecentWatchPress={handleRecentWatchPress}
        isReloading={isReloading}
      />
      {isLoading ? (
        <LottieView
          source={require("../../assets/animasi/loading.json")}
          autoPlay
          loop
          style={styles.loadingIndicator}
        />
        
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.content}>
          {/* Sidebar: Group List */}
          <View style={styles.sidebar}>
            <FlatList
              data={groupTitles}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item}
            />
          </View>
          {/* Main Area: Channel List */}
          <View style={styles.mainContent}>
            <ImageBackground
              source={require("../../assets/images/foreground.png")}
              style={styles.backgroundImage}
            >
              {selectedGroup ? (
                <FlatList
                  data={groupedChannels[selectedGroup] || []}
                  renderItem={renderChannel}
                  keyExtractor={(item) => item.id ? item.id.toString() : `${item.url}-${item.name}`}

                  numColumns={5}
                />
              ) : (
                <Text style={styles.noGroupText}>
                  Select a Group to see Channels
                </Text>
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
    width: 200,
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
    backgroundColor: "#24538e",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    height: 120,
    maxWidth: 120,
    aspectRatio: 1,
  },
  channelLogo: {
    width: 60,
    height: 60,
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
  favoriteButton: {
    position: "absolute",
    top: -2,
    right: -2,
    padding: 2,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  focusedFavoriteButton: {
    backgroundColor: "#D2F201",
    borderRadius: 50,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
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
