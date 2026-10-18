import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HomeLaunchRedirect from "@/components/HomeLaunchRedirect";

function Destination() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="destination">{pathname + search + hash}</output>;
}

describe("legacy phone launch paths", () => {
  it.each(["/index", "/index.html"])("redirects %s without losing referral or view", (path) => {
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(
      <MemoryRouter initialEntries={[`${path}?ref=abc123#seal`]}>
        <Routes>
          <Route path={path} element={<HomeLaunchRedirect />} />
          <Route path="/" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    ));
    expect(container.textContent).toBe("/?ref=abc123#seal");
    act(() => root.unmount());
  });
});