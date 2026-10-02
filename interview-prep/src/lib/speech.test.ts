import { describe, expect, it } from "vitest";
import { joinText, micErrorCode, readResults, recognitionErrorCode } from "./speech";

const result = (transcript: string, isFinal: boolean) => ({ isFinal, 0: { transcript } });

describe("speech helpers", () => {
  it("splits final and interim results and normalises spacing", () => {
    const r = readResults([result("Last year I worked", true), result(" on a group", true), result(" assignment wh", false)]);
    expect(r).toEqual({ final: "Last year I worked on a group", interim: "assignment wh" });
    expect(joinText("", "  a ", "b  ")).toBe("a b");
  });

  it("treats pauses as benign and maps real failures", () => {
    expect(recognitionErrorCode("no-speech")).toBeNull();
    expect(recognitionErrorCode("aborted")).toBeNull();
    expect(recognitionErrorCode("not-allowed")).toBe("denied");
    expect(recognitionErrorCode("network")).toBe("network");
    expect(micErrorCode(new DOMException("x", "NotAllowedError"))).toBe("denied");
    expect(micErrorCode(new DOMException("x", "NotFoundError"))).toBe("no-mic");
  });
});
