// Vercel deployment - use relative URL (same domain, no CORS)
const API = window.location.hostname === "localhost" ? "http://localhost:8000" : "";
export default API;
