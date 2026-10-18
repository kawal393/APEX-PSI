import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HomeLaunchRedirect from "@/components/HomeLaunchRedirect";

function Destination() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="destination">{pathname + search + hash}</output>;
}

describe("legacy phone launch paths", () => {
  it.each(["/index", "/index.html"])("redirects %s without losing referral or view", (path) => {
    render(
      <MemoryRouter initialEntries={[`${path}?ref=abc123#seal`]}>
        <Routes>
          <Route path={path} element={<HomeLaunchRedirect />} />
          <Route path="/" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("destination").textContent).toBe("/?ref=abc123#seal");
  });
});