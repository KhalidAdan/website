import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import Signup from "./signup";

vi.mock("~/utils/auth.client", () => ({
  authClient: {
    signUp: {
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

vi.mock("./+types/signup", () => ({
  LoaderArgs: {},
}));

function createRouter(initialUrl = "/signup") {
  return createMemoryRouter(
    [
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/md",
        element: React.createElement("div", null, "Editor"),
      },
    ],
    { initialEntries: [initialUrl] }
  );
}

describe("Signup", () => {
  it("renders name, email and password inputs", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("shows link to login page", () => {
    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
  });

  it("calls signUp.email on submit", async () => {
    const user = userEvent.setup();
    const { authClient } = await import("~/utils/auth.client");

    const router = createRouter();
    render(React.createElement(RouterProvider, { router }));

    await user.type(screen.getByPlaceholderText(/name/i), "Test User");
    await user.type(screen.getByPlaceholderText(/email/i), "test@example.com");
    await user.type(screen.getByPlaceholderText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith(
        { name: "Test User", email: "test@example.com", password: "password123" },
        expect.any(Object)
      );
    });
  });
});