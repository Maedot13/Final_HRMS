import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import App from '../App';

test('renders login page', () => {
  render(<App />);
  // adjust to actual text in your app (e.g., "Login")
  expect(screen.getByPlaceholderText(/UNI-000123/i)).toBeDefined();
});
