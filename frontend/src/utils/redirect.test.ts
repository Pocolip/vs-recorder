import { describe, expect, it } from "vitest";
import { redirectQuery, redirectTarget } from "./redirect";

describe("redirectTarget", () => {
  it("returns a path on this site", () => {
    expect(redirectTarget("?redirect=/invites/abc123")).toBe("/invites/abc123");
    expect(redirectTarget("?redirect=%2Finvites%2Fabc")).toBe("/invites/abc");
  });

  it("goes home for anything that could leave the site, or nothing", () => {
    for (const search of ["", "?redirect=", "?redirect=https://evil.example", "?redirect=//evil.example", "?redirect=/\\evil.example", "?redirect=javascript:alert(1)"]) {
      expect(redirectTarget(search)).toBe("/");
    }
  });
});

describe("redirectQuery", () => {
  it("carries a redirect to the other auth page, and nothing for home", () => {
    expect(redirectQuery("?redirect=/invites/abc")).toBe("?redirect=%2Finvites%2Fabc");
    expect(redirectQuery("?redirect=https://evil.example")).toBe("");
  });
});
