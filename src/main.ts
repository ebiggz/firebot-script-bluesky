import {
  Firebot,
  Integration,
} from "@crowbartools/firebot-custom-scripts-types";
import {
  ReplaceVariableFactory,
  VariableConfig,
} from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-factory";
import { ReplaceVariableManager } from "@crowbartools/firebot-custom-scripts-types/types/modules/replace-variable-manager";
import {
  blueskyIntegration,
  initBlueskyIntegration,
} from "./bluesky-integration";
import {
  BLUESKY_EVENT_SOURCE,
  BLUESKY_INTEGRATION_DEFINITION,
  BLUESKY_INTEGRATION_ID,
} from "./constants";
import { blueskyEffectTypes } from "./effects";
import { initLogger } from "./logger";
import { BlueskyEvent, BlueskyIntegrationSettings } from "./types";
import { streamChecker } from "./stream-checker";

const script: Firebot.CustomScript = {
  getScriptManifest: () => {
    return {
      name: "Bluesky",
      description:
        "Enables posting to Bluesky and adds events for follows, likes, replies, and reposts.\n\nOnce installed, head to the Integrations tab in Firebot settings to configure your Bluesky account.",
      author: "ebiggz",
      version: "2.4.1",
      firebotVersion: "5",
      startupOnly: true,
    };
  },
  getDefaultParameters: () => {
    return {};
  },
  run: (runRequest) => {
    initLogger(runRequest.modules.logger);
    streamChecker.init(runRequest.modules.twitchApi);

    runRequest.modules.eventManager.registerEventSource(BLUESKY_EVENT_SOURCE);

    registerBlueskyVariables(
      runRequest.modules.replaceVariableFactory,
      runRequest.modules.replaceVariableManager,
    );

    const integration: Integration<BlueskyIntegrationSettings> = {
      definition: BLUESKY_INTEGRATION_DEFINITION,
      integration: initBlueskyIntegration(
        runRequest.modules.eventManager,
        runRequest.firebot.accounts.streamer,
      ),
    };

    runRequest.modules.integrationManager.registerIntegration(integration);

    for (const effectType of blueskyEffectTypes) {
      runRequest.modules.effectManager.registerEffect(effectType as any);
    }
  },
  stop: () => {
    try {
      streamChecker.removeAllListeners();
      if (blueskyIntegration?.isAutomaticallySyncingLiveStatus) {
        blueskyIntegration?.clearLiveStatus();
      }
    } catch (error) {
      // Ignore
    }
  },
};

function registerBlueskyVariables(
  replaceVariableFactory: ReplaceVariableFactory,
  replaceVariableManager: ReplaceVariableManager,
) {
  const blueskyVariables = [
    ...buildBlueskyProfileVariables(
      "blueskyUser",
      [BlueskyEvent.Follow, BlueskyEvent.Like, BlueskyEvent.Repost],
      replaceVariableFactory,
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
      replaceVariableFactory,
    ),
    ...buildBlueskyPostVariables(
      "blueskyParentPost",
      [BlueskyEvent.Reply],
      replaceVariableFactory,
    ),
    ...buildBlueskyPostVariables(
      "blueskyQuotedPost",
      [BlueskyEvent.Quote],
      replaceVariableFactory,
    ),
  ];

  for (const variable of blueskyVariables) {
    replaceVariableManager.registerReplaceVariable(variable);
  }
}

function buildBlueskyProfileVariables(
  prefix: string,
  events: BlueskyEvent[],
  replaceVariableFactory: ReplaceVariableFactory,
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
      buildBlueskyVariable(`${prefix}${property}`, description, events),
    ),
  );
}

function buildBlueskyPostVariables(
  prefix: string,
  events: BlueskyEvent[],
  replaceVariableFactory: ReplaceVariableFactory,
) {
  const postProperties: [property: string, description: string][] = [
    ["Text", "The post's text"],
    ["AtUri", "The post's atproto URI"],
  ];
  return [
    ...postProperties.map(([property, description]) =>
      replaceVariableFactory.createEventDataVariable(
        buildBlueskyVariable(`${prefix}${property}`, description, events),
      ),
    ),
    ...buildBlueskyProfileVariables(
      `${prefix}Author`,
      events,
      replaceVariableFactory,
    ),
  ];
}

function buildBlueskyVariable(
  eventProperty: string,
  description: string,
  events: BlueskyEvent[],
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
