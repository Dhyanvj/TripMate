import { createRoot } from "react-dom/client";
import App from "./App";
import "./fixed-index.css";
import "./lib/debug";

console.log('%cTripMate: Starting app...', 'color:blue; font-size:14px');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('%cTripMate: Root element found, creating React app...', 'color:green; font-size:14px');
  try {
    createRoot(rootElement).render(<App />);
    console.log('%cTripMate: React app rendered successfully', 'color:green; font-size:14px');
  } catch (error) {
    console.error('Error rendering React app:', error);
  }
}

// Register Service Worker for PWA (after app loads)
setTimeout(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('%cTripMate PWA: Service Worker registered successfully', 'color:green; font-size:14px');
      })
      .catch((error) => {
        console.log('TripMate PWA: Service Worker registration failed:', error);
      });
  }
}, 1000);
