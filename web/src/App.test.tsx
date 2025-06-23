import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders Vite + React heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /vite \+ react/i })).toBeInTheDocument();
  });

  it('starts with count of 0', () => {
    render(<App />);
    expect(screen.getByRole('button')).toHaveTextContent('test count is 0');
  });

  it('increments count when button is clicked', () => {
    render(<App />);
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(button).toHaveTextContent('test count is 1');

    fireEvent.click(button);
    expect(button).toHaveTextContent('test count is 2');
  });

  it('renders Vite and React logos', () => {
    render(<App />);
    expect(screen.getByAltText('Vite logo')).toBeInTheDocument();
    expect(screen.getByAltText('React logo')).toBeInTheDocument();
  });
});
