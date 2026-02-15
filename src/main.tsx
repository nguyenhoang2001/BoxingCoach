import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('Starting React app...');

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('Root element found, mounting React...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('React mounted successfully');
} else {
  console.error('Root element not found!');
}