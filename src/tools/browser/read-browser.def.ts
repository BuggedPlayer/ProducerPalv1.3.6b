import { z } from "zod";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

export const toolDefReadBrowser = defineTool("ppal-read-browser", {
  title: "Read Browser",
  description: "List items from Ableton browser (library, presets, samples)",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    category: z
      .enum([
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
      ])
      .optional()
      .describe("browser category (defaults to user_library)"),
    path: z
      .string()
      .optional()
      .describe("path within category (e.g., 'Drums/Acoustic')"),
    search: z
      .string()
      .optional()
      .describe("case-insensitive name filter"),
    maxDepth: z.coerce
      .number()
      .min(0)
      .max(10)
      .optional()
      .describe("max recursion depth (default 2, 0=no recursion)"),
  },
});
