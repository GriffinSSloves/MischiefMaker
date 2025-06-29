import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Home from './Home';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home', () => {
  it('renders without crashing', () => {
    renderWithRouter(<Home />);
  });

  it('displays the main heading', () => {
    renderWithRouter(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('contains welcome message', () => {
    renderWithRouter(<Home />);
    expect(screen.getByText('Hide secret messages in pictures to send to your friends.')).toBeInTheDocument();
  });
});
