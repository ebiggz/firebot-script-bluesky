import {
  Firebot,
  Integration,
} from "@crowbartools/firebot-custom-scripts-types";
import { postToBlueskyEffectType } from "./effects/post-to-bluesky";
import { initLogger } from "./logger";
import {
  BLUESKY_EVENT_SOURCE,
  BLUESKY_INTEGRATION_DEFINITION,
  BLUESKY_INTEGRATION_ID,
} from "./constants";
import { initBlueskyIntegration } from "./bluesky-integration";
import { BlueskyEvent, BlueskyIntegrationSettings } from "./types";
import {
  ReplaceVariableFactory,
  VariableConfig,
} from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-factory";
import { ReplaceVariableManager } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import { likePostOnBlueskyEffectType } from "./effects/like-post-on-bluesky";

const script: Firebot.CustomScript = {
  getScriptManifest: () => {
    return {
      name: "Bluesky",
      description:
        "Enables posting to Bluesky and adds events for follows, likes, replies, and reposts.\n\nOnce installed, head to the Integrations tab in Firebot settings to configure your Bluesky account.",
      author: "ebiggz",
      version: "2.1",
      firebotVersion: "5",
    };
  },
  getDefaultParameters: () => {
    return {};
  },
  run: (runRequest) => {
    initLogger(runRequest.modules.logger);

    runRequest.modules.eventManager.registerEventSource(BLUESKY_EVENT_SOURCE);

    registerBlueskyVariables(
      runRequest.modules.replaceVariableFactory,
      runRequest.modules.replaceVariableManager
    );

    const integration: Integration<BlueskyIntegrationSettings> = {
      definition: BLUESKY_INTEGRATION_DEFINITION,
      integration: initBlueskyIntegration(runRequest.modules.eventManager),
    };

    runRequest.modules.integrationManager.registerIntegration(integration);

    runRequest.modules.effectManager.registerEffect(
      postToBlueskyEffectType as any
    );

    runRequest.modules.effectManager.registerEffect(
      likePostOnBlueskyEffectType as any
    );
  },
};

function registerBlueskyVariables(
  replaceVariableFactory: ReplaceVariableFactory,
  replaceVariableManager: ReplaceVariableManager
) {
  const blueskyVariables = [
    ...buildBlueskyProfileVariables(
      "blueskyUser",
      [BlueskyEvent.Follow, BlueskyEvent.Like, BlueskyEvent.Repost],
      replaceVariableFactory
    ),
    ...buildBlueskyPostVariables(
      "blueskyPost",
      [
        BlueskyEvent.Like,
        BlueskyEvent.Reply,
        BlueskyEvent.Repost,
        BlueskyEvent.Mention,
        BlueskyEvent.Quote,
      ],
      replaceVariableFactory
    ),
    ...buildBlueskyPostVariables(
      "blueskyParentPost",
      [BlueskyEvent.Reply],
      replaceVariableFactory
    ),
    ...buildBlueskyPostVariables(
      "blueskyQuotedPost",
      [BlueskyEvent.Quote],
      replaceVariableFactory
    ),
  ];

  for (const variable of blueskyVariables) {
    replaceVariableManager.registerReplaceVariable(variable);
  }
}

function buildBlueskyProfileVariables(
  prefix: string,
  events: BlueskyEvent[],
  replaceVariableFactory: ReplaceVariableFactory
) {
  const profileProperties: [property: string, description: string][] = [
    ["Handle", "The user's handle"],
    ["DisplayName", "The user's display name"],
    ["AvatarUrl", "The user's avatar URL"],
    ["Bio", "The user's bio"],
    ["BannerUrl", "The user's banner URL"],
    ["Id", "The user's atproto DID"],
  ];
  return profileProperties.map(([property, description]) =>
    replaceVariableFactory.createEventDataVariable(
      buildBlueskyVariable(`${prefix}${property}`, description, events)
    )
  );
}

function buildBlueskyPostVariables(
  prefix: string,
  events: BlueskyEvent[],
  replaceVariableFactory: ReplaceVariableFactory
) {
  const postProperties: [property: string, description: string][] = [
    ["Text", "The post's text"],
    ["AtUri", "The post's atproto URI"],
  ];
  return [
    ...postProperties.map(([property, description]) =>
      replaceVariableFactory.createEventDataVariable(
        buildBlueskyVariable(`${prefix}${property}`, description, events)
      )
    ),
    ...buildBlueskyProfileVariables(
      `${prefix}Author`,
      events,
      replaceVariableFactory
    ),
  ];
}

function buildBlueskyVariable(
  eventProperty: string,
  description: string,
  events: BlueskyEvent[]
): VariableConfig {
  return {
    handle: eventProperty,
    description: description,
    events: events.map((event) => `${BLUESKY_INTEGRATION_ID}:${event}`),
    eventMetaKey: eventProperty,
    type: "text",
  };
}

export default script;
