import process from "node:process";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  port: parseInt(optionalEnv("PORT", "3001"), 10),
  frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:3000"),
  get supabase() {
    return {
      url: requireEnv("SUPABASE_URL"),
      anonKey: requireEnv("SUPABASE_ANON_KEY"),
      serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    };
  },
  get anthropic() {
    return {
      apiKey: requireEnv("ANTHROPIC_API_KEY"),
    };
  },
} as const;
