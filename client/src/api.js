// When served from the same server, use relative URL (no domain needed)
// Falls back to localhost for local development
const API = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? ""
  : "http://localhost:8000";

export default API;
