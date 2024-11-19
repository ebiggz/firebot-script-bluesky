import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { logger } from "../logger";
import { Bot as ATProtoBot } from "@skyware/bot";
import { BlueskyCredentials, getCredentials } from "../credentials";

type PostToBlueskyData = {
  text: string;
};

export const postToBlueskyEffectType: Firebot.EffectType<PostToBlueskyData> = {
  definition: {
    id: "ebiggz:post-to-bluesky",
    name: "Post To Bluesky",
    description: "Send a post to Bluesky",
    icon: "fad fa-at",
    categories: ["integrations"],
  },
  optionsTemplate: `
    <eos-container header="Text">
      <firebot-input
          model="effect.text"
          use-text-area="true"
          placeholder-text="Enter text"
          rows="4"
          cols="40"
       />
    </eos-container>
  `,
  optionsController: ($scope) => {},
  optionsValidator: (effect) => {
    if (!effect.text?.length) {
      return ["Please enter some text to post!"];
    }
    return [];
  },
  onTriggerEvent: async ({ effect }) => {
    const credentials = getCredentials();

    const [valid, reason] = validateEffect(effect, credentials);
    if (!valid) {
      logger.debug(`Unable to run Post To Bluesky effect: ${reason}`, effect);
      return {
        success: false,
      };
    }

    try {
      const bot = new ATProtoBot();

      await bot.login({
        identifier: credentials.username!,
        password: credentials.appPassword!,
      });

      await bot.post({
        text: effect.text
      }, {
        resolveFacets: true,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error posting to Bluesky", error);
      return {
        success: false,
      };
    }
  },
};

function validateEffect(
  data: PostToBlueskyData,
  credentials: BlueskyCredentials
): [success: boolean, errorMessage?: string] {
  if (!data.text?.length) {
    return [false, "No text provided"];
  }

  if (!credentials.username?.length || !credentials.appPassword?.length) {
    return [false, "Username and app password are required"];
  }

  return [true];
}
