import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import Home from "./home";

vi.mock("react-router", () => ({
  Link: ({ to, children, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
  useLoaderData: vi.fn().mockReturnValue({ user: null }),
  useTheme: vi.fn().mockReturnValue({ theme: "light", toggle: vi.fn() }),
}));

vi.mock("./+types/home", () => ({
  LoaderArgs: {},
}));

function createRouter(initialUrl = "/") {
  return createMemoryRouter(
    [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/md",
        element: React.createElement("div", null, "Editor"),
      },
      {
        path: "/login",
        element: React.createElement("div", null, "Login"),
      },
      {
        path: "/signup",
        element: React.createElement("div", null, "Signup"),
      },
    ],
    { initialEntries: [initialUrl] }
  );
}

describe("Home", () => {
  it("renders page title", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByText(/khld/)).toBeInTheDocument();
  });

  it("renders open editor link", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByRole("link", { name: /open editor/i })).toBeInTheDocument();
  });

  it("renders login link", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
  });

  it("renders signup link", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });
});