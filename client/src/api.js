// Same domain — use relative URL so no CORS issues ever
const API = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? ""
  : "http://localhost:8000";

export default API;
