import { IntegrationDefinition } from "@crowbartools/firebot-custom-scripts-types";
import { BlueskyEvent, BlueskyIntegrationSettings } from "./types";
import { EventSource } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-manager";

export const BLUESKY_INTEGRATION_ID = "ebiggz:bluesky";

export const BLUESKY_INTEGRATION_DEFINITION: IntegrationDefinition<BlueskyIntegrationSettings> =
  {
    id: BLUESKY_INTEGRATION_ID,
    name: "Bluesky",
    description:
      "Enables posting to Bluesky and adds events for follows, likes, replies, and reposts.",
    linkType: "none",
    configurable: true,
    connectionToggle: false,
    settingCategories: {
      account: {
        title: "Account",
        settings: {
          username: {
            type: "string",
            default: "",
            title: "Username",
            description:
              "Your Bluesky account @ handle, e.g. example.bsky.social",
            validation: {
              required: true,
            },
          },
          appPassword: {
            type: "password",
            default: "",
            title: "App Password",
            description:
              "Generate an app password for Firebot in Bluesky [here](https://bsky.app/settings/app-passwords) (Settings > Privacy and Security > App Passwords)",
            tip: "Please do not use your main password",
            validation: {
              required: true,
            },
          },
        },
      },
    },
  };

export const BLUESKY_EVENT_SOURCE: EventSource = {
  id: BLUESKY_INTEGRATION_ID,
  name: "Bluesky",
  events: [
    {
      id: BlueskyEvent.Follow,
      name: "Follow",
      description: "When someone follows you on Bluesky",
    },
    {
      id: BlueskyEvent.Like,
      name: "Like",
      description: "When someone likes one of your posts on Bluesky",
    },
    {
      id: BlueskyEvent.Reply,
      name: "Reply",
      description: "When someone replies to one of your posts on Bluesky",
    },
    {
      id: BlueskyEvent.Repost,
      name: "Repost",
      description: "When someone reposts one of your posts on Bluesky",
    },
    {
      id: BlueskyEvent.Quote,
      name: "Quote",
      description: "When someone quotes one of your posts on Bluesky",
    },
    {
      id: BlueskyEvent.Mention,
      name: "Mention",
      description: "When someone mentions you on Bluesky",
    },
  ],
};
