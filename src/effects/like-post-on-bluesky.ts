import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { BLUESKY_INTEGRATION_ID } from "../constants";
import { BlueskyEvent } from "../types";
import { logger } from "../logger";
import { blueskyIntegration } from "../bluesky-integration";
import { Post } from "@skyware/bot";

export const likePostOnBlueskyEffectType: Firebot.EffectType<{}> = {
  definition: {
    id: "ebiggz:like-post-on-bluesky",
    name: "Like Post On Bluesky",
    description: "Like a post on Bluesky",
    icon: "fad fa-heart",
    categories: ["integrations"],
    triggers: {
      event: [
        `${BLUESKY_INTEGRATION_ID}:${BlueskyEvent.Reply}`,
        `${BLUESKY_INTEGRATION_ID}:${BlueskyEvent.Quote}`,
        `${BLUESKY_INTEGRATION_ID}:${BlueskyEvent.Mention}`,
      ],
    },
  },
  optionsTemplate: `
    <eos-container>
      <p>This effect will "like" the Bluesky post associated to the current event.</p>
    </eos-container>
  `,
  optionsController: ($scope) => {},
  optionsValidator: (effect) => {
    return [];
  },
  onTriggerEvent: async ({ effect, trigger }) => {
    try {
      const postAtUri = trigger?.metadata?.eventData
        ?.blueskyPostAtUri as string;

      if (!postAtUri?.length) {
        logger.error("No post AT URI to like");
        return {
          success: false,
        };
      }

      const postToLike = await blueskyIntegration?.bot
        ?.getPost(postAtUri)
        .catch(() => {
          return null as Post;
        });

      if (!postToLike) {
        logger.error("Unable to fetch post to like with AT URI", postAtUri);
        return {
          success: false,
        };
      }
      await postToLike.like();

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error liking post on Bluesky", error);
      return {
        success: false,
      };
    }
  },
};
