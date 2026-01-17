import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { blueskyIntegration } from "../bluesky-integration";
import { logger } from "../logger";

type SetLiveStatusOnBlueskyData = {
  durationMinutes: number;
};

export const setLiveStatusOnBlueskyEffectType: Firebot.EffectType<SetLiveStatusOnBlueskyData> =
  {
    definition: {
      id: "ebiggz:set-live-status-on-bluesky",
      name: "Set Live Status On Bluesky",
      description: "Set your live status on Bluesky (beta)",
      icon: "fad fa-signal-stream",
      categories: ["integrations"],
    },
    optionsTemplate: `
      <eos-container header="Duration (minutes)">
        <firebot-input
          model="effect.durationMinutes"
          input-type="number"
          placeholder-text="180"
          menu-position="under"
        />
        <p class="muted" style="margin-top: 5px;">
          Your live status will be automatically cleared after this time.
        </p>
      </eos-container>
    `,
    optionsController: ($scope) => {
      if ($scope.effect.durationMinutes == null) {
        $scope.effect.durationMinutes = 180; // Default to 3 hours
      }
    },
    optionsValidator: (effect) => {
      const errors: string[] = [];
      if (effect.durationMinutes == null || effect.durationMinutes <= 0) {
        errors.push("Duration must be a positive number");
      }
      return errors;
    },
    onTriggerEvent: async ({ effect }) => {
      try {
        const duration = effect.durationMinutes ?? 180;
        const success = await blueskyIntegration?.setLiveStatus(duration);

        return {
          success: success ?? false,
        };
      } catch (error) {
        logger.error("Error setting live status on Bluesky", error);
        return {
          success: false,
        };
      }
    },
  };
