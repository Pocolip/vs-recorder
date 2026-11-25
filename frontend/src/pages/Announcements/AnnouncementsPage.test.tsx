import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import AnnouncementsPage from "./AnnouncementsPage";
import { AppWrapper } from "../../components/common/PageMeta";

describe("AnnouncementsPage", () => {
  it("renders links in announcements", () => {
    render(
      <AppWrapper>
        <MemoryRouter>
          <AnnouncementsPage />
        </MemoryRouter>
      </AppWrapper>,
    );
    expect(screen.getByRole("link", { name: "Terms of Service" }).getAttribute("href")).toBe("/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/privacy");
    expect(screen.queryByText(/\]\(/)).toBeNull();
  });
});
