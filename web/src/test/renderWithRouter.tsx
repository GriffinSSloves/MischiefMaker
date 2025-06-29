import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

/**
 * Renders a component with React Router context for testing
 * @param component - The React component to render
 * @param options - Configuration options for the router
 * @returns RTL render result
 */
export const renderWithRouter = (
  component: React.ReactElement,
  options: {
    /** The route path to test (e.g., '/', '/encode', '/decode') */
    route?: string;
    /** Initial URL entries for the router */
    initialEntries?: string[];
  } = {}
): RenderResult => {
  const { route = '/', initialEntries = [route] } = options;

  const router = createMemoryRouter(
    [
      {
        path: route,
        element: component,
      },
    ],
    {
      initialEntries,
    }
  );

  return render(<RouterProvider router={router} />);
};

/**
 * Common render helpers for specific routes
 */
export const renderWithRouterHelpers = {
  /** Render component at home route (/) */
  home: (component: React.ReactElement) => renderWithRouter(component, { route: '/' }),

  /** Render component at encode route (/encode) */
  encode: (component: React.ReactElement) => renderWithRouter(component, { route: '/encode' }),

  /** Render component at decode route (/decode) */
  decode: (component: React.ReactElement) => renderWithRouter(component, { route: '/decode' }),
};
