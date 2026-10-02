import { describe, expect, it } from "vitest";
import { restoreDeleted } from "./restore";
import { buildSampleData } from "./sample-data";

describe("restoreDeleted", () => {
  it("puts a deleted story back in place and re-links its questions", () => {
    const before = buildSampleData(new Date("2026-01-01"));
    const story = before.stories.find((s) => before.questions.some((q) => q.storyIds.includes(s.id)))!;
    // Same shape as the store's deleteStory.
    const deleted = {
      ...before,
      stories: before.stories.filter((s) => s.id !== story.id),
      questions: before.questions.map((q) => ({ ...q, storyIds: q.storyIds.filter((x) => x !== story.id) })),
    };
    const restored = restoreDeleted(before, deleted);
    expect(restored.stories).toEqual(before.stories);
    expect(restored.questions.map((q) => [...q.storyIds].sort())).toEqual(before.questions.map((q) => [...q.storyIds].sort()));
  });

  it("keeps edits made after the delete", () => {
    const before = buildSampleData(new Date("2026-01-01"));
    const [gone, edited] = before.questions;
    const current = { ...before, questions: before.questions.filter((q) => q.id !== gone.id).map((q) => (q.id === edited.id ? { ...q, notes: "new" } : q)) };
    const restored = restoreDeleted(before, current);
    expect(restored.questions[0].id).toBe(gone.id);
    expect(restored.questions.find((q) => q.id === edited.id)?.notes).toBe("new");
  });
});
