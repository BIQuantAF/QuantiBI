import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

console.log('🚀 index.js: Application starting...');
console.log('🚀 index.js: About to render App component');
console.log('🔥🔥🔥 THIS IS A TEST - IF YOU SEE THIS, THE SERVER IS WORKING 🔥🔥🔥');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('🚀 index.js: App component rendered');

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
