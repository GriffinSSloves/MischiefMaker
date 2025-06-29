import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Decode from './Decode';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Decode', () => {
  it('renders without crashing', () => {
    renderWithRouter(<Decode />);
  });

  it('displays the main heading', () => {
    renderWithRouter(<Decode />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('contains the decode form or interface elements', () => {
    renderWithRouter(<Decode />);
    // This test will need to be updated when the actual decode interface is implemented
    expect(screen.getByText(/decode/i)).toBeInTheDocument();
  });
});
