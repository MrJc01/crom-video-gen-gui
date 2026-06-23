import '@testing-library/jest-dom';

// Mock ResizeObserver for jsdom test environment
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

