import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { blueskyIntegration } from "../bluesky-integration";
import { logger } from "../logger";

export const clearLiveStatusOnBlueskyEffectType: Firebot.EffectType<
  Record<string, never>
> = {
  definition: {
    id: "ebiggz:clear-live-status-on-bluesky",
    name: "Clear Live Status On Bluesky",
    description: "Clear your live status on Bluesky (beta)",
    icon: "fad fa-signal-slash",
    categories: ["integrations"],
  },
  optionsTemplate: `
      <eos-container>
        <p class="muted">
          This will clear any active live status on your Bluesky account.
        </p>
      </eos-container>
    `,
  optionsController: () => {},
  optionsValidator: () => {
    return [];
  },
  onTriggerEvent: async () => {
    try {
      const success = await blueskyIntegration?.clearLiveStatus();

      return {
        success: success ?? false,
      };
    } catch (error) {
      logger.error("Error clearing live status on Bluesky", error);
      return {
        success: false,
      };
    }
  },
};
