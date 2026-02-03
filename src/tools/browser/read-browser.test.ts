import { beforeEach, describe, expect, it } from "vitest";
import { setupMockLiveAPI } from "#src/test/mocks/mock-live-api.ts";
import { readBrowser } from "./read-browser.ts";

describe("readBrowser", () => {
  beforeEach(() => {
    setupMockLiveAPI();
  });

  describe("error handling", () => {
    it("should throw error when browser is not available", () => {
      globalThis.LiveAPI = class {
        constructor(public path: string) {}
        exists() {
          return false;
        }
        static from(path: string) {
          return new this(path);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getProperty(_: string) {
          return null;
        }
      } as typeof LiveAPI;

      expect(() => readBrowser()).toThrow("Browser not available");
    });

    it("should throw error for invalid category", () => {
      const mockBrowser = {
        exists: () => true,
        getProperty: () => null,
      };

      globalThis.LiveAPI = class {
        constructor(public path: string) {}
        exists() {
          return true;
        }
        static from(path: string) {
          if (path === "live_set browser") {
            return mockBrowser as unknown as LiveAPI;
          }
          return new this(path);
        }
        getProperty(prop: string) {
          if (prop === "user_library") {
            return null;
          }
          return undefined;
        }
      } as typeof LiveAPI;

      expect(() => readBrowser({ category: "user_library" })).toThrow(
        'Browser category "user_library" not found',
      );
    });
  });

  describe("basic functionality", () => {
    it("should return empty items for empty category", () => {
      const mockIterator = {
        next: () => null,
      };

      const mockRootItem = {
        name: "User Library",
        uri: "browser://user_library",
        is_folder: true,
        is_loadable: false,
        iter_children: () => mockIterator,
      };

      const mockBrowser = {
        exists: () => true,
        getProperty: (prop: string) => {
          if (prop === "user_library") {
            return mockRootItem;
          }
          return null;
        },
      };

      globalThis.LiveAPI = class {
        constructor(public path: string) {}
        static from(path: string) {
          if (path === "live_set browser") {
            return mockBrowser as unknown as LiveAPI;
          }
          return new this(path);
        }
      } as typeof LiveAPI;

      const result = readBrowser({ category: "user_library" });

      expect(result.category).toBe("user_library");
      expect(result.items).toStrictEqual([]);
      expect(result.limitReached).toBe(false);
    });

    it("should return items with correct structure", () => {
      const childItem = {
        name: "My Preset",
        uri: "browser://user_library/my_preset",
        is_folder: false,
        is_loadable: true,
        iter_children: () => ({ next: () => null }),
      };

      const mockIterator = {
        _items: [childItem],
        _index: 0,
        next() {
          if (this._index < this._items.length) {
            return this._items[this._index++];
          }
          return null;
        },
      };

      const mockRootItem = {
        name: "User Library",
        uri: "browser://user_library",
        is_folder: true,
        is_loadable: false,
        iter_children: () => mockIterator,
      };

      const mockBrowser = {
        exists: () => true,
        getProperty: (prop: string) => {
          if (prop === "user_library") {
            return mockRootItem;
          }
          return null;
        },
      };

      globalThis.LiveAPI = class {
        constructor(public path: string) {}
        static from(path: string) {
          if (path === "live_set browser") {
            return mockBrowser as unknown as LiveAPI;
          }
          return new this(path);
        }
      } as typeof LiveAPI;

      const result = readBrowser({ category: "user_library", maxDepth: 0 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        name: "My Preset",
        uri: "browser://user_library/my_preset",
        isFolder: false,
        isLoadable: true,
      });
    });

    it("should use default category when none specified", () => {
      const mockIterator = {
        next: () => null,
      };

      const mockRootItem = {
        name: "User Library",
        uri: "browser://user_library",
        is_folder: true,
        is_loadable: false,
        iter_children: () => mockIterator,
      };

      const mockBrowser = {
        exists: () => true,
        getProperty: (prop: string) => {
          if (prop === "user_library") {
            return mockRootItem;
          }
          return null;
        },
      };

      globalThis.LiveAPI = class {
        constructor(public path: string) {}
        static from(path: string) {
          if (path === "live_set browser") {
            return mockBrowser as unknown as LiveAPI;
          }
          return new this(path);
        }
      } as typeof LiveAPI;

      const result = readBrowser();

      expect(result.category).toBe("user_library");
    });
  });
});
