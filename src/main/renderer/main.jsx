import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import "./styles/variables.css";
import "./styles/theme.css";
import "./styles/theme-berry-champagne.css";

const savedConfig = window.localStorage.getItem("beyou-config");

if (savedConfig) {
  try {
    const config = JSON.parse(savedConfig);
    document.body.classList.toggle("theme-dark", config.tema === "dark");
  } catch {
    window.localStorage.removeItem("beyou-config");
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
