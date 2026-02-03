import * as console from "#src/shared/v8-max-console.ts";

const MAX_ITEMS = 1000;
const DEFAULT_MAX_DEPTH = 2;

type BrowserCategory =
  | "audio_effects"
  | "clips"
  | "current_project"
  | "drums"
  | "instruments"
  | "midi_effects"
  | "packs"
  | "plugins"
  | "samples"
  | "sounds"
  | "user_library";

interface ReadBrowserArgs {
  category?: BrowserCategory;
  path?: string;
  search?: string;
  maxDepth?: number;
}

interface BrowserItemInfo {
  name: string;
  uri: string;
  isFolder: boolean;
  isLoadable: boolean;
  children?: BrowserItemInfo[];
}

interface ReadBrowserResult {
  category: string;
  items: BrowserItemInfo[];
  limitReached: boolean;
}

/**
 * List items from Ableton browser
 * @param args - The parameters
 * @param args.category - Browser category (defaults to user_library)
 * @param args.path - Path within category (e.g., 'Drums/Acoustic')
 * @param args.search - Case-insensitive name filter
 * @param args.maxDepth - Max recursion depth (default 2, 0=no recursion)
 * @returns Browser category and item list
 */
export function readBrowser({
  category = "user_library",
  path,
  search,
  maxDepth = DEFAULT_MAX_DEPTH,
}: ReadBrowserArgs = {}): ReadBrowserResult {
  const browser = LiveAPI.from("live_set browser");

  if (!browser.exists()) {
    throw new Error("Browser not available in this Live version");
  }

  // Get the root category item
  const rootItem = browser.getProperty(category) as BrowserItem | null;

  if (!rootItem) {
    throw new Error(`Browser category "${category}" not found`);
  }

  // Navigate to specified path if provided
  let currentItem = rootItem;
  if (path) {
    const pathParts = path.split("/").filter((p) => p.length > 0);
    for (const part of pathParts) {
      const found = findChildByName(currentItem, part);
      if (!found) {
        throw new Error(`Path not found: ${path} (stopped at "${part}")`);
      }
      currentItem = found;
    }
  }

  const items: BrowserItemInfo[] = [];
  const limitReached = { value: false };
  const searchLower = search ? search.toLowerCase() : null;

  // Recursively collect items
  collectItems(currentItem, items, limitReached, searchLower, maxDepth, 0);

  if (limitReached.value) {
    console.warn(
      `Stopped scanning browser at ${MAX_ITEMS} items. Use search or path to narrow results.`,
    );
  }

  return {
    category: `${category}${path ? `/${path}` : ""}`,
    items,
    limitReached: limitReached.value,
  };
}

/**
 * Find a child item by name (case-insensitive)
 * @param parent - Parent browser item
 * @param name - Child name to find
 * @returns Found child or null
 */
function findChildByName(
  parent: BrowserItem,
  name: string,
): BrowserItem | null {
  const nameLower = name.toLowerCase();
  const iterator = parent.iter_children();
  let child = iterator.next();

  while (child) {
    if (child.name.toLowerCase() === nameLower) {
      return child;
    }
    child = iterator.next();
  }

  return null;
}

/**
 * Recursively collect browser items
 * @param item - Current browser item
 * @param results - Array to append results to
 * @param limitReached - Mutable flag object
 * @param limitReached.value - Whether limit was reached
 * @param searchLower - Lowercase search filter or null
 * @param maxDepth - Maximum recursion depth
 * @param currentDepth - Current recursion depth
 */
function collectItems(
  item: BrowserItem,
  results: BrowserItemInfo[],
  limitReached: { value: boolean },
  searchLower: string | null,
  maxDepth: number,
  currentDepth: number,
): void {
  if (limitReached.value) {
    return;
  }

  const iterator = item.iter_children();
  let child = iterator.next();

  while (child) {
    if (results.length >= MAX_ITEMS) {
      limitReached.value = true;
      return;
    }

    const matchesSearch =
      !searchLower || child.name.toLowerCase().includes(searchLower);

    if (matchesSearch) {
      const itemInfo: BrowserItemInfo = {
        name: child.name,
        uri: child.uri,
        isFolder: child.is_folder,
        isLoadable: child.is_loadable,
      };

      // Recursively collect children if we haven't reached max depth
      if (child.is_folder && currentDepth < maxDepth) {
        const childItems: BrowserItemInfo[] = [];
        collectItems(
          child,
          childItems,
          limitReached,
          searchLower,
          maxDepth,
          currentDepth + 1,
        );
        if (childItems.length > 0) {
          itemInfo.children = childItems;
        }
      }

      results.push(itemInfo);
    } else if (child.is_folder && currentDepth < maxDepth) {
      // Even if folder doesn't match, check its children
      collectItems(
        child,
        results,
        limitReached,
        searchLower,
        maxDepth,
        currentDepth + 1,
      );
    }

    child = iterator.next();
  }
}
