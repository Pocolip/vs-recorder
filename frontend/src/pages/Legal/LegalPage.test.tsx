import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import LegalPage from "./LegalPage";
import { AppWrapper } from "../../components/common/PageMeta";
import Markdown from "../../components/common/Markdown";
import { blocks } from "../../utils/markdown";

function renderPage(document: "terms" | "privacy") {
  render(
    <AppWrapper>
      <MemoryRouter>
        <LegalPage document={document} />
      </MemoryRouter>
    </AppWrapper>,
  );
}

describe("Markdown", () => {
  it("splits headings, paragraphs and lists, joining wrapped lines", () => {
    expect(blocks("# Title\n\nOne\ntwo\n\n- a\n- b\n  continued\n## Next")).toEqual([
      { kind: "heading", level: 1, text: "Title" },
      { kind: "paragraph", text: "One two" },
      { kind: "list", items: ["a", "b continued"] },
      { kind: "heading", level: 2, text: "Next" },
    ]);
  });

  it("renders bold, italic and links, keeping site links in the app", () => {
    render(
      <MemoryRouter>
        <Markdown source="**Bold** and _italic_, see [About](/about) or [GitHub](https://github.com) or [x](javascript:alert(1))." />
      </MemoryRouter>,
    );
    expect(screen.getByText("Bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByRole("link", { name: "About" }).getAttribute("href")).toBe("/about");
    const external = screen.getByRole("link", { name: "GitHub" });
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.queryByRole("link", { name: "x" })).toBeNull();
  });

  it("leaves underscores inside words alone", () => {
    render(<Markdown source="snake_case_name stays" />);
    expect(screen.getByText("snake_case_name stays")).toBeTruthy();
  });
});

describe("LegalPage", () => {
  it("shows the Terms of Service", () => {
    renderPage("terms");
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Features can change" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe("/privacy");
  });

  it("shows the Privacy Policy, including the training promise", () => {
    renderPage("privacy");
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeTruthy();
    const training = screen.getByRole("heading", { name: "Your data is not used to train the engine" });
    expect(within(training.parentElement!).getByText(/strictly opt-in/)).toBeTruthy();
  });
});
