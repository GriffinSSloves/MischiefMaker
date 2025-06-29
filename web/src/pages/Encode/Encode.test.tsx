import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Encode from './Encode';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Encode', () => {
  it('renders without crashing', () => {
    renderWithRouter(<Encode />);
  });

  it('displays the main heading', () => {
    renderWithRouter(<Encode />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('contains the encode form or interface elements', () => {
    renderWithRouter(<Encode />);
    // This test will need to be updated when the actual encode interface is implemented
    expect(screen.getByText(/encode/i)).toBeInTheDocument();
  });
});
