import axios from "axios";

interface Channel {
  name: string;
  url?: string;
  tvg?: {
    id: string | null;
    logo: string | null;
  };
  group?: {
    title: string | null;
  };
  headers: {
    Referer: string;
    "User-Agent": string;
  };
  urlLabel?: string;
}

export const fetchAndParsePlaylist = async (url: string) => {
  try {
    const response = await axios.get(url);
    const playlistText = response.data;
    const lines = playlistText.split("\n");
    
    const channels: Channel[] = [];
    let globalMetadata: Record<string, string> = {};
    let currentItem: Channel = {
      name: "",
      headers: { Referer: "", "User-Agent": "" },
    };
    let headers = {
      Referer: "",
      "User-Agent": "",
    };

    lines.forEach((line) => {
      line = line.trim();

      if (line.startsWith("#EXTM3U")) {
        const refreshMatch = line.match(/refresh="([^"]+)"/);
        if (refreshMatch) {
          globalMetadata["refresh"] = refreshMatch[1];
        }
      } else if (line.startsWith("#EXTINF:")) {
        currentItem = { name: "", headers: { Referer: "", "User-Agent": "" } };

        const nameMatch = line.match(/,([^,]+)$/);
        currentItem.name = nameMatch ? nameMatch[1].trim() : "Unknown Channel";

        const matchTvgId = line.match(/tvg-id="([^"]+)"/);
        const matchTvgLogo = line.match(/tvg-logo="([^"]+)"/);
        const matchGroupTitle = line.match(/group-title="([^"]+)"/);

        currentItem.tvg = {
          id: matchTvgId ? matchTvgId[1] : null,
          logo: matchTvgLogo ? matchTvgLogo[1] : null,
        };

        currentItem.group = {
          title: matchGroupTitle ? matchGroupTitle[1] : null,
        };
      } else if (line.startsWith("#EXTVLCOPT:http-referrer=")) {
        headers.Referer = line.substring(line.indexOf("=") + 1).trim();
      } else if (line.startsWith("#EXTVLCOPT:http-user-agent=")) {
        headers["User-Agent"] = line.substring(line.indexOf("=") + 1).trim();
      } else if (line.startsWith("http") || line.startsWith("https")) {
        currentItem.url = line.trim();

        if (currentItem.url && currentItem.name) {
          channels.push({
            ...currentItem,
            headers: { ...headers },
          });
        }

        currentItem = { name: "", headers: { Referer: "", "User-Agent": "" } };
        headers = { Referer: "", "User-Agent": "" };
      }
    });

    return { metadata: globalMetadata, items: channels };
  } catch (error: any) {
    console.error('Error fetching or parsing the playlist:', error.message);
    throw new Error('Error fetching or parsing the playlist: ' + error.message);
  }
};

export default fetchAndParsePlaylist;