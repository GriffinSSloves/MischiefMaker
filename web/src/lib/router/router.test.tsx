import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AppRouter } from './router';

// Mock the page components since they'll be lazy loaded
vi.mock('@/pages/Home/Home', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('@/pages/Encode/Encode', () => ({
  default: () => <div data-testid="encode-page">Encode Page</div>,
}));

vi.mock('@/pages/Decode/Decode', () => ({
  default: () => <div data-testid="decode-page">Decode Page</div>,
}));

// Mock the Layout component
vi.mock('@/components/layouts/Layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">
      <header data-testid="header">Header</header>
      <main data-testid="main">{children}</main>
      <footer data-testid="footer">Footer</footer>
    </div>
  ),
}));

describe('AppRouter', () => {
  it('should render the router configuration', () => {
    expect(AppRouter).toBeDefined();
    expect(Array.isArray(AppRouter.routes)).toBe(true);
  });

  it('should render Home page at root path', async () => {
    const router = createMemoryRouter(AppRouter.routes, {
      initialEntries: ['/'],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  it('should render Encode page at /encode path', async () => {
    const router = createMemoryRouter(AppRouter.routes, {
      initialEntries: ['/encode'],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('encode-page')).toBeInTheDocument();
    });
  });

  it('should render Decode page at /decode path', async () => {
    const router = createMemoryRouter(AppRouter.routes, {
      initialEntries: ['/decode'],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('decode-page')).toBeInTheDocument();
    });
  });

  it('should have proper route structure', () => {
    const routes = AppRouter.routes;
    expect(routes).toHaveLength(1);

    const rootRoute = routes[0];
    expect(rootRoute.path).toBe('/');
    expect(rootRoute.children).toHaveLength(4);

    const [homeRoute, encodeRoute, decodeRoute] = rootRoute.children!;

    // Check home route (index route)
    expect(homeRoute.index).toBe(true);

    // Check encode route
    expect(encodeRoute.path).toBe('encode');

    // Check decode route
    expect(decodeRoute.path).toBe('decode');
  });

  it.skip('should show loading state while lazy components load', async () => {
    const router = createMemoryRouter(AppRouter.routes, {
      initialEntries: ['/'],
    });

    render(<RouterProvider router={router} />);

    // The loading state should appear briefly
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Then the actual page should load
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  it('should wrap all routes with Layout component', async () => {
    const router = createMemoryRouter(AppRouter.routes, {
      initialEntries: ['/encode'],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('encode-page')).toBeInTheDocument();
    });
  });
});
