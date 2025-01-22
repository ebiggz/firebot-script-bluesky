import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { Post } from "@skyware/bot";
import { blueskyIntegration } from "../bluesky-integration";
import { logger } from "../logger";

type DeletePostOnBlueskyData = {
  uri: string;
};

export const deletePostOnBlueskyEffectType: Firebot.EffectType<DeletePostOnBlueskyData> =
  {
    definition: {
      id: "ebiggz:delete-post-on-bluesky",
      name: "Delete Post On Bluesky",
      description: "Delete a post on Bluesky",
      icon: "fad fa-trash",
      categories: ["integrations"],
    },
    optionsTemplate: `
      <eos-container header="URI">
        <firebot-input
          model="effect.uri"
          placeholder-text="URI of post to delete (must be from your account)"
        />
      </eos-container>
    `,
    optionsController: ($scope) => {},
    optionsValidator: (effect) => {
      return [];
    },
    onTriggerEvent: async ({ effect, trigger }) => {
      try {
        const postToDelete = await blueskyIntegration?.bot
          ?.getPost(effect.uri)
          .catch(() => {
            return null as Post;
          });

        if (!postToDelete) {
          logger.error("Unable to fetch post to delete with URI", effect.uri);
          return {
            success: false,
          };
        }

        if (postToDelete.author?.did !== blueskyIntegration?.bot?.profile.did) {
          logger.error("Post to delete is not from your account", effect.uri);
          return {
            success: false,
          };
        }

        await postToDelete.delete();

        return {
          success: true,
        };
      } catch (error) {
        logger.error("Error deleting post on Bluesky", error);
        return {
          success: false,
        };
      }
    },
  };
