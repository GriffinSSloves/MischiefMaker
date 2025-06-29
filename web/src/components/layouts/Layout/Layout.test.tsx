import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Layout from './Layout';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Layout', () => {
  it('renders without crashing', () => {
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
  });

  it('renders children content', () => {
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('contains header, main, and footer elements', () => {
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    // Check for structural elements
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    expect(screen.getByText('MischiefMaker - Hide secret messages in images')).toBeInTheDocument();
  });
});
