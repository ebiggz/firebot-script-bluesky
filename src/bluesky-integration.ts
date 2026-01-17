import {
  IntegrationController,
  IntegrationData,
  IntegrationEvents,
  UserAccount,
} from "@crowbartools/firebot-custom-scripts-types";
import { EventManager } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-manager";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  Bot as BlueskyBot,
  FeedGenerator,
  Labeler,
  Post,
  Profile,
} from "@skyware/bot";
import { logger } from "./logger";
import { BLUESKY_INTEGRATION_ID } from "./constants";
import { BlueskyEvent, BlueskyIntegrationSettings } from "./types";

class IntegrationEventEmitter extends TypedEmitter<IntegrationEvents> {}

class BlueskyIntegration
  extends IntegrationEventEmitter
  implements IntegrationController<BlueskyIntegrationSettings>
{
  connected = false;

  public bot: BlueskyBot | undefined;

  constructor(
    private eventManager: EventManager,
    private streamerAccount: UserAccount,
  ) {
    super();
  }

  init(
    linked: boolean,
    integrationData: IntegrationData<BlueskyIntegrationSettings>,
  ): void | PromiseLike<void> {
    logger.info(
      "Bluesky Integration Initialized",
      integrationData.userSettings?.account?.username,
    );

    this.initBlueskyBot(integrationData.userSettings);
  }

  onUserSettingsUpdate?(
    integrationData: IntegrationData<BlueskyIntegrationSettings>,
  ): void | PromiseLike<void> {
    logger.info(
      "Bluesky Integration settings updated",
      integrationData.userSettings?.account?.username,
    );

    this.initBlueskyBot(integrationData.userSettings);
  }

  private async initBlueskyBot(settings?: BlueskyIntegrationSettings) {
    if (this.bot) {
      try {
        this.bot.removeAllListeners();
      } catch (error) {
        logger.error("Error removing Bluesky bot listeners", error);
      }
    }

    logger.info("initBlueskyBot");

    const username = settings?.account?.username;
    const appPassword = settings?.account?.appPassword;
    const service = settings?.account?.service ?? "https://bsky.social";

    if (!username || !appPassword || !service) {
      logger.warn("Bluesky Integration account login is missing");
      return;
    }

    try {
      this.bot = new BlueskyBot({ service: service });

      await this.bot.login({ identifier: username, password: appPassword });
    } catch (error) {
      if (this.connected) {
        this.connected = false;
        // this.emit("disconnected", BLUESKY_INTEGRATION_ID);
      }
      logger.error("Error logging into Bluesky", error);
      return;
    }

    if (!this.connected) {
      this.connected = true;
      logger.info("Bluesky Integration connected");
      //   this.emit("connected", BLUESKY_INTEGRATION_ID);
    }

    this.bot.on("follow", (event) => {
      logger.info("Bluesky follow event", event.user.handle);

      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Follow,
        {
          ...this.getUserProfileMetadata(event.user, "blueskyUser"),
        },
      );
    });

    this.bot.on("like", (event) => {
      logger.info("Bluesky like event", event.user.handle, event.subject.uri);

      if (!this.isPost(event.subject)) {
        return;
      }

      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Like,
        {
          ...this.getUserProfileMetadata(event.user, "blueskyUser"),
          ...this.getPostMetadata(event.subject, "blueskyPost"),
        },
      );
    });

    this.bot.on("reply", async (event) => {
      logger.info("Bluesky reply event", event.author.handle, event.text);

      const parent = await event.fetchParent();
      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Reply,
        {
          ...this.getPostMetadata(event, "blueskyPost"),
          ...(parent ? this.getPostMetadata(parent, "blueskyParentPost") : {}),
        },
      );
    });

    this.bot.on("repost", (event) => {
      logger.info("Bluesky repost event", event.user.handle);

      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Repost,
        {
          ...this.getUserProfileMetadata(event.user, "blueskyUser"),
          ...this.getPostMetadata(event.post, "blueskyPost"),
        },
      );
    });

    this.bot.on("mention", (event) => {
      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Mention,
        {
          ...this.getPostMetadata(event, "blueskyPost"),
        },
      );
    });

    this.bot.on("quote", async (event) => {
      logger.info("Bluesky quote event", event.author.handle, event.text);

      if (!event.embed?.isRecord()) {
        return;
      }

      const quotedPost = await this.bot.getPost(event.embed.record.uri);

      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Quote,
        {
          ...this.getPostMetadata(event, "blueskyPost"),
          ...(quotedPost
            ? this.getPostMetadata(quotedPost, "blueskyQuotedPost")
            : {}),
        },
      );
    });
  }

  private isPost(subject?: Post | FeedGenerator | Labeler): subject is Post {
    return subject != null && subject instanceof Post;
  }

  private getUserProfileMetadata(profile: Profile, prefix: string) {
    return {
      [`${prefix}Handle`]: profile.handle,
      [`${prefix}DisplayName`]: profile.displayName,
      [`${prefix}AvatarUrl`]: profile.avatar,
      [`${prefix}Bio`]: profile.description,
      [`${prefix}BannerUrl`]: profile.banner,
      [`${prefix}Id`]: profile.did,
    };
  }

  private getPostMetadata(post: Post, prefix: string) {
    return {
      [`${prefix}Text`]: post.text,
      [`${prefix}AtUri`]: post.uri,
      ...(post.author
        ? this.getUserProfileMetadata(post.author, `${prefix}Author`)
        : {}),
    };
  }

  async setLiveStatus(durationMinutes: number): Promise<boolean> {
    if (!this.bot || !this.connected) {
      logger.error("Cannot set live status: not connected to Bluesky");
      return false;
    }

    if (!this.streamerAccount?.loggedIn) {
      logger.error("Cannot set live status: streamer account not logged in");
      return false;
    }

    try {
      let thumbBlob:
        | { ref: { $link: string }; mimeType: string; size: number }
        | undefined;

      // Upload the avatar as thumbnail if available
      const avatarUrl = this.streamerAccount?.avatar;
      if (avatarUrl) {
        try {
          const avatarResponse = await fetch(avatarUrl);
          if (avatarResponse.ok) {
            const avatarArrayBuffer = await avatarResponse.arrayBuffer();
            const contentType =
              avatarResponse.headers.get("content-type") ?? "image/jpeg";
            // Use type assertion since the call method is inherited but not properly typed
            const uploadResponse = await (this.bot.agent as any).call(
              "com.atproto.repo.uploadBlob",
              {
                data: new Uint8Array(avatarArrayBuffer),
                headers: { "content-type": contentType },
              },
            );
            if (uploadResponse?.data?.blob) {
              thumbBlob = uploadResponse.data.blob;
            }
          }
        } catch (uploadError) {
          logger.warn(
            "Failed to upload avatar for live status thumbnail",
            uploadError,
          );
        }
      }

      // Build the embed if we have a thumbnail
      const embed = thumbBlob
        ? {
            $type: "app.bsky.embed.external",
            external: {
              $type: "app.bsky.embed.external#external",
              title: "Twitch",
              description: `${this.streamerAccount?.displayName ?? this.streamerAccount?.username ?? "Streamer"} is live on Twitch!`,
              uri: `https://www.twitch.tv/${this.streamerAccount?.username ?? ""}`,
              thumb: {
                $type: "blob",
                ref: thumbBlob.ref,
                mimeType: thumbBlob.mimeType,
                size: thumbBlob.size,
              },
            },
          }
        : undefined;

      await this.bot.putRecord(
        "app.bsky.actor.status",
        {
          status: "app.bsky.actor.status#live",
          durationMinutes: durationMinutes,
          ...(embed ? { embed } : {}),
        },
        "self",
      );

      logger.info(`Set live status on Bluesky for ${durationMinutes} minutes`);
      return true;
    } catch (error) {
      logger.error("Error setting live status on Bluesky", error);
      return false;
    }
  }

  async clearLiveStatus(): Promise<boolean> {
    if (!this.bot || !this.connected) {
      logger.error("Cannot clear live status: not connected to Bluesky");
      return false;
    }

    try {
      const did = this.bot.profile.did;
      const statusUri = `at://${did}/app.bsky.actor.status/self`;

      await this.bot.deleteRecord(statusUri);

      logger.info("Cleared live status on Bluesky");
      return true;
    } catch (error) {
      logger.error("Error clearing live status on Bluesky", error);
      return false;
    }
  }
}

export let blueskyIntegration: BlueskyIntegration | undefined;

export function initBlueskyIntegration(
  eventManager: EventManager,
  streamerAccount: UserAccount,
) {
  blueskyIntegration = new BlueskyIntegration(eventManager, streamerAccount);

  return blueskyIntegration;
}
