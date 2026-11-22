import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles.css';
import { AppProvider } from './lib/appState';
import { SquirrelProvider } from './hardware/SquirrelProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AppProvider><SquirrelProvider><App /></SquirrelProvider></AppProvider></BrowserRouter></React.StrictMode>,
);
