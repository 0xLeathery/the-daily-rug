import { describe, expect, test } from "vitest";
import { STORAGE_KEY, DISCLAIMER_TEXT } from "@/components/public/DisclaimerModal";

describe("DisclaimerModal component", () => {
  test("STORAGE_KEY is tdr_disclaimer_accepted", () => {
    expect(STORAGE_KEY).toBe("tdr_disclaimer_accepted");
  });

  test("DISCLAIMER_TEXT contains 'satirical Web3 parody' and 'does not constitute financial advice'", () => {
    expect(DISCLAIMER_TEXT).toContain("satirical Web3 parody");
    expect(DISCLAIMER_TEXT).toContain("does not constitute financial advice");
  });

  test("DISCLAIMER_TEXT contains 'AI-generated gossip'", () => {
    expect(DISCLAIMER_TEXT).toContain("AI-generated gossip");
  });
});
