/**
 * Runtime configuration for the frontend.
 *
 * IMPORTANT: Before deploying, set API_BASE to your deployed backend URL,
 * e.g. "https://staff-allocation-backend.onrender.com/api".
 * For local testing against a backend running on your machine, the
 * default below (http://localhost:4000/api) works out of the box.
 */
window.APP_CONFIG = {
  API_BASE: (window.localStorage.getItem('sa_api_base_override')) || 'https://staff-allocation-backend.onrender.com/api',
};
