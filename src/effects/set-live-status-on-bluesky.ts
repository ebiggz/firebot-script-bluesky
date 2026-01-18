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
          placeholder-text="240"
          menu-position="under"
        />
        <p class="muted" style="margin-top: 5px;">
          Your live status will be automatically cleared after this time.
        </p>
      </eos-container>

      <eos-container>
        <div class="effect-info alert alert-warning">
            Please note that Bluesky has a limitation of <b>4 hours</b> (240 minutes) for live status duration.
            <br /><br />
            If your duration value exceeds this, it will be capped at <b>4 hours</b>.
        </div>
    </eos-container>
    `,
    optionsController: ($scope) => {
      if ($scope.effect.durationMinutes == null) {
        $scope.effect.durationMinutes = 240; // Default to 4 hours
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
        const duration = effect.durationMinutes ?? 240;

        const durationNumber = Number(duration);

        const success = await blueskyIntegration?.setLiveStatus(durationNumber);

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
