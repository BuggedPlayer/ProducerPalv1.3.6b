import { z } from "zod";
import { defineTool } from "#src/tools/shared/tool-framework/define-tool.ts";

export const toolDefLoadItem = defineTool("ppal-load-item", {
  title: "Load Item",
  description: "Load browser item (preset, sample, device) into Live set",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  inputSchema: {
    uri: z.string().describe("browser item URI from ppal-read-browser"),
    trackId: z.coerce
      .string()
      .optional()
      .describe("track ID to load into (uses selected track if omitted)"),
    position: z
      .enum(["before", "after", "replace"])
      .optional()
      .describe("where to load device (before/after selected, or replace it)"),
  },
});
