import axios from "axios";

interface LicenseData {
  license_type?: string;
  license_key?: string;
}

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
  license?: LicenseData;
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
    let licenseData: { license_type?: string; license_key?: string } = {};
    let headers = {
      Referer: "",
      "User-Agent": "",
    };

    const licenseTypeRegex = /^#KODIPROP:inputstream\.adaptive\.license_type=(.+)$/;
    const licenseKeyRegex = /^#KODIPROP:inputstream\.adaptive\.license_key=(.+)$/;

    lines.forEach((line) => {
      line = line.trim();

      if (line.startsWith("#EXTM3U")) {
        const refreshMatch = line.match(/refresh="([^"]+)"/);
        if (refreshMatch) {
          globalMetadata["refresh"] = refreshMatch[1];
        }
      } else if (line.startsWith("#EXTINF:")) {
        // Reset untuk setiap channel baru
        currentItem = { name: "", headers: { Referer: "", "User-Agent": "" } };
        licenseData = {};

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
      } else if (line.startsWith("#KODIPROP")) {
        const typeMatch = line.match(licenseTypeRegex);
        if (typeMatch) {
          licenseData.license_type = typeMatch[1].trim();
         // console.log("Parsed license type:", licenseData.license_type);
        }

        const keyMatch = line.match(licenseKeyRegex);
        if (keyMatch) {
          licenseData.license_key = keyMatch[1].trim();
         // console.log("Parsed license key:", licenseData.license_key);
        }

        if (licenseData.license_type && licenseData.license_key) {
          currentItem.license = { ...licenseData };
         // console.log("Assigned license to currentItem:", currentItem.license);
        }
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