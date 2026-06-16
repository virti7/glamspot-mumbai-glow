// Re-export from backend — keep this thin wrapper so existing
// imports like `../config.server` continue to work in src/.
export { getServerConfig } from "../../backend/lib/config.server";
