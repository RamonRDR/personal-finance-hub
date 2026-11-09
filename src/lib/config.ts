import { z } from "zod";
const schema = z.object({
  APP_TIME_ZONE: z.string().default("America/Sao_Paulo"),
  GOOGLE_INTEGRATION_ENABLED: z.enum(["true", "false"]).default("false"),
});
export function readConfig(environment: Record<string, string | undefined> = process.env) {
  return schema.parse(environment);
}
