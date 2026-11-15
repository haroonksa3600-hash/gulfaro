/**
 * Gulfaro Runtime Backend Configuration
 *
 * Frontend hosted on Hostinger (https://www.gulfaro.net / https://gulfaro.net).
 * Backend hosted on Render (https://gulfaro.onrender.com).
 */
window.GULFARO_API_BASE_URL =
  window.GULFARO_API_BASE_URL ||
  window.__GULFARO_API_BASE_URL__ ||
  "https://gulfaro.onrender.com";

window.__GULFARO_API_BASE_URL__ =
  window.__GULFARO_API_BASE_URL__ || window.GULFARO_API_BASE_URL;
