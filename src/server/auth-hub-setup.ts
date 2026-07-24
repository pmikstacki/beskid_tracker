import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  getAuthHubSetupStatus,
  submitAuthHubSetup,
} from "#/server/auth-hub-setup.server";

const setupInputSchema = z.object({
  authHubPublicUrl: z.string().url().optional(),
  pairingCode: z.string().min(4),
  trackerPublicUrl: z.string().url(),
  approverLogin: z.string().min(1),
  setupToken: z.string().min(1).optional(),
});

export const getAuthHubSetupStatusFn = createServerFn({ method: "GET" }).handler(
  async () => getAuthHubSetupStatus(),
);

export const submitAuthHubSetupFn = createServerFn({ method: "POST" })
  .inputValidator(setupInputSchema)
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const result = await submitAuthHubSetup(getRequest(), data);
    if (!('ok' in result && result.ok)) {
      const msg = 'error' in result ? result.error : 'unknown';
      throw new Error(msg);
    }
    return { ok: true as const };
  });
