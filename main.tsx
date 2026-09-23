import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { JixErrorBoundary } from './JixErrorBoundary.tsx';
import { JixI18nProvider } from './JixLanguage.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <JixErrorBoundary>
      {/* الترجمة تلف التطبيق كله عشان أي شاشة تقدر تستخدمها */}
      <JixI18nProvider>
        <App />
      </JixI18nProvider>
    </JixErrorBoundary>
  </React.StrictMode>
);
