import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MonitorWindow } from './components/MonitorWindow';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MonitorWindow />
    </ErrorBoundary>
  </React.StrictMode>,
);
