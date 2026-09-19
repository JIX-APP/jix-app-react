import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { JixErrorBoundary } from './JixErrorBoundary.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <JixErrorBoundary>
      <App />
    </JixErrorBoundary>
  </React.StrictMode>
);

