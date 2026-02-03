import { beforeEach, describe, expect, it } from "vitest";
import { setupMockLiveAPI } from "#src/test/mocks/mock-live-api.ts";
import { loadItem } from "./load-item.ts";

describe("loadItem", () => {
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
      } as typeof LiveAPI;

      expect(() => loadItem({ uri: "browser://test" })).toThrow(
        "Browser not available",
      );
    });

    it("should throw error when item is not loadable", () => {
      const mockItem = {
        name: "Folder",
        uri: "browser://drums",
        is_folder: true,
        is_loadable: false,
        iter_children: () => ({ next: () => null }),
      };

      const mockBrowser = {
        exists: () => true,
        getProperty: (prop: string) => {
          if (prop === "drums") {
            return mockItem;
          }
          return null;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        call: (_method: string, _item: unknown) => {},
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
          if (path === "live_set view") {
            return {
              getProperty: () => "id 1",
            } as unknown as LiveAPI;
          }
          if (path === "id 1") {
            return {
              exists: () => true,
              getProperty: () => null,
            } as unknown as LiveAPI;
          }
          return new this(path);
        }
        getProperty() {
          return null;
        }
      } as typeof LiveAPI;

      expect(() => loadItem({ uri: "browser://drums" })).toThrow(
        "Item is not loadable",
      );
    });

    it("should throw error when track is not found", () => {
      const mockItem = {
        name: "Preset",
        uri: "browser://preset",
        is_folder: false,
        is_loadable: true,
        is_device: true,
        iter_children: () => ({ next: () => null }),
      };

      const mockBrowser = {
        exists: () => true,
        getProperty: (prop: string) => {
          if (prop === "instruments") {
            return mockItem;
          }
          return null;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        call: (_method: string, _item: unknown) => {},
      };

      globalThis.LiveAPI = class {
        constructor(public path: string) {}
        exists() {
          if (this.path === "id 999") {
            return false;
          }
          return true;
        }
        static from(path: string) {
          if (path === "live_set browser") {
            return mockBrowser as unknown as LiveAPI;
          }
          return new this(path);
        }
        getProperty() {
          return null;
        }
      } as typeof LiveAPI;

      expect(() =>
        loadItem({ uri: "browser://preset", trackId: "id 999" }),
      ).toThrow("Track not found");
    });
  });

  describe("basic functionality", () => {
    it("should load item successfully", () => {
      const mockItem = {
        name: "My Preset",
        uri: "browser://instruments/my_preset",
        is_folder: false,
        is_loadable: true,
        is_device: true,
        iter_children: () => ({ next: () => null }),
      };

      let loadedItem: unknown = null;

      const mockBrowser = {
        exists: () => true,
        getProperty: (prop: string) => {
          if (prop === "instruments") {
            return mockItem;
          }
          return null;
        },
        call: (method: string, item: unknown) => {
          if (method === "load_item") {
            loadedItem = item;
          }
        },
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
          if (path === "live_set view") {
            return {
              getProperty: () => "id 1",
            } as unknown as LiveAPI;
          }
          if (path === "id 1") {
            return {
              exists: () => true,
              getProperty: () => null,
            } as unknown as LiveAPI;
          }
          return new this(path);
        }
        getProperty() {
          return null;
        }
      } as typeof LiveAPI;

      const result = loadItem({ uri: "browser://instruments/my_preset" });

      expect(result.loaded).toBe(true);
      expect(result.uri).toBe("browser://instruments/my_preset");
      expect(result.message).toBe("Loaded My Preset");
      expect(loadedItem).toBe(mockItem);
    });

    it("should use selected track when trackId is not provided", () => {
      const mockItem = {
        name: "My Preset",
        uri: "browser://instruments/my_preset",
        is_folder: false,
        is_loadable: true,
        is_device: true,
        iter_children: () => ({ next: () => null }),
      };

      const mockBrowser = {
        exists: () => true,
        getProperty: (prop: string) => {
          if (prop === "instruments") {
            return mockItem;
          }
          return null;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        call: (_method: string, _item: unknown) => {},
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
          if (path === "live_set view") {
            return {
              getProperty: () => "id 2",
            } as unknown as LiveAPI;
          }
          if (path === "id 2") {
            return {
              exists: () => true,
              getProperty: () => null,
            } as unknown as LiveAPI;
          }
          return new this(path);
        }
        getProperty() {
          return null;
        }
      } as typeof LiveAPI;

      const result = loadItem({ uri: "browser://instruments/my_preset" });

      expect(result.trackId).toBe("id 2");
    });
  });
});
