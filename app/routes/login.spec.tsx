import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import Login from "./login";

vi.mock("~/utils/auth.client", () => ({
  authClient: {
    signIn: {
      email: vi.fn(() => Promise.resolve()),
    },
  },
}));

vi.mock("react-router", () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useRouteError: vi.fn(),
  Link: ({ to, children, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("./+types/login", () => ({
  LoaderArgs: {},
}));

function createRouter(initialUrl = "/login") {
  return createMemoryRouter(
    [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/md",
        element: React.createElement("div", null, "Editor"),
      },
    ],
    { initialEntries: [initialUrl] }
  );
}

describe("Login", () => {
  it("renders email and password inputs", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows link to signup page", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });

  it("calls signIn.email on submit", async () => {
    const user = userEvent.setup();
    const { authClient } = await import("~/utils/auth.client");

    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));

    await user.type(screen.getByPlaceholderText(/email/i), "test@example.com");
    await user.type(screen.getByPlaceholderText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith(
        { email: "test@example.com", password: "password123" },
        expect.any(Object)
      );
    });
  });
});