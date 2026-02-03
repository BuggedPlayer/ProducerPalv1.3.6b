import * as console from "#src/shared/v8-max-console.ts";

interface LoadItemArgs {
  uri: string;
  trackId?: string;
  position?: "before" | "after" | "replace";
}

interface LoadItemResult {
  loaded: boolean;
  uri: string;
  trackId?: string;
  message: string;
}

/**
 * Load browser item into Live set
 * @param args - The parameters
 * @param args.uri - Browser item URI from ppal-read-browser
 * @param args.trackId - Track ID to load into (uses selected track if omitted)
 * @param args.position - Where to load device (before/after selected, or replace)
 * @returns Load result
 */
export function loadItem({
  uri,
  trackId,
  position,
}: LoadItemArgs): LoadItemResult {
  const browser = LiveAPI.from("live_set browser");

  if (!browser.exists()) {
    throw new Error("Browser not available in this Live version");
  }

  // Find the browser item by URI
  const item = findItemByUri(browser, uri);

  if (!item) {
    throw new Error(`Browser item not found: ${uri}`);
  }

  if (!item.is_loadable) {
    throw new Error(`Item is not loadable: ${item.name}`);
  }

  // Determine target track
  const view = LiveAPI.from("live_set view");
  let targetTrackId = trackId;

  if (!targetTrackId) {
    targetTrackId = view.getProperty("selected_track") as string;
  }

  const track = LiveAPI.from(targetTrackId);

  if (!track.exists()) {
    throw new Error(`Track not found: ${targetTrackId}`);
  }

  // Handle position parameter for devices
  if (position && item.is_device) {
    const selectedDevice = track.getProperty("view.selected_device") as
      | string
      | null;

    if (selectedDevice) {
      const selectedDeviceApi = LiveAPI.from(selectedDevice);
      const deviceIndex = selectedDeviceApi.deviceIndex;

      if (deviceIndex != null) {
        if (position === "replace") {
          // Delete the selected device first
          selectedDeviceApi.call("canonical_parent.delete_device", deviceIndex);
        } else if (position === "before") {
          // Load will insert at the position
          console.warn(
            "before/after positioning not directly supported; item will be appended to device chain",
          );
        }
      }
    }
  }

  // Load the item
  browser.call("load_item", item);

  return {
    loaded: true,
    uri,
    trackId: targetTrackId,
    message: `Loaded ${item.name}`,
  };
}

/**
 * Find a browser item by URI (recursive search)
 * @param browser - Browser API instance
 * @param uri - URI to find
 * @returns Found item or null
 */
function findItemByUri(browser: LiveAPI, uri: string): BrowserItem | null {
  // Search in all main categories
  const categories = [
    "audio_effects",
    "clips",
    "current_project",
    "drums",
    "instruments",
    "midi_effects",
    "packs",
    "plugins",
    "samples",
    "sounds",
    "user_library",
  ];

  for (const category of categories) {
    const rootItem = browser.getProperty(category) as BrowserItem | null;
    if (rootItem) {
      const found = searchItemByUri(rootItem, uri);
      if (found) {
        return found;
      }
    }
  }

  // Also search legacy_libraries and user_folders
  const legacyLibs = browser.getProperty("legacy_libraries") as
    | BrowserItem[]
    | null;
  if (legacyLibs) {
    for (const lib of legacyLibs) {
      const found = searchItemByUri(lib, uri);
      if (found) {
        return found;
      }
    }
  }

  const userFolders = browser.getProperty("user_folders") as
    | BrowserItem[]
    | null;
  if (userFolders) {
    for (const folder of userFolders) {
      const found = searchItemByUri(folder, uri);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Recursively search for item by URI
 * @param item - Current browser item
 * @param uri - URI to find
 * @returns Found item or null
 */
function searchItemByUri(item: BrowserItem, uri: string): BrowserItem | null {
  if (item.uri === uri) {
    return item;
  }

  if (item.is_folder) {
    const iterator = item.iter_children();
    let child = iterator.next();

    while (child) {
      const found = searchItemByUri(child, uri);
      if (found) {
        return found;
      }
      child = iterator.next();
    }
  }

  return null;
}
