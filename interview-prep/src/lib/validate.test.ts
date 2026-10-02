import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "./sample-data";
import type { AppData } from "./types";
import { buildExport, parseImportText } from "./validate";

const emptyData: AppData = { schemaVersion: SCHEMA_VERSION, questions: [], stories: [], attempts: [], sessions: [], jobPreps: [], settings: DEFAULT_SETTINGS };

describe("parseImportText", () => {
  it("round-trips an export", () => {
    const result = parseImportText(JSON.stringify(buildExport(emptyData)));
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON, foreign files and malformed sections", () => {
    expect(parseImportText("{nope").ok).toBe(false);
    expect(parseImportText(JSON.stringify({ app: "other" })).ok).toBe(false);
    expect(parseImportText(JSON.stringify({ app: "interview-prep-studio", questions: {} })).ok).toBe(false);
  });
});
