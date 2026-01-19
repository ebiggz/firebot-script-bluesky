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
import { At, BlueskyEvent, BlueskyIntegrationSettings } from "./types";
import { streamChecker } from "./stream-checker";
import { asIdentifier } from "@skyware/bot/dist/util/lexicon";

/**
 * Event handler types for BlueskyBot events.
 * These match the listener signatures from BlueskyBot.on() overloads.
 */
type FollowEventHandler = (event: { user: Profile; uri: string }) => void;
type LikeEventHandler = (event: {
  subject: Post | FeedGenerator | Labeler;
  user: Profile;
  uri: string;
}) => void;
type ReplyEventHandler = (post: Post) => void;
type RepostEventHandler = (event: {
  post: Post;
  user: Profile;
  uri: string;
}) => void;
type MentionEventHandler = (post: Post) => void;
type QuoteEventHandler = (post: Post) => void;

const FOUR_HOURS_IN_MINUTES = 4 * 60;

class IntegrationEventEmitter extends TypedEmitter<IntegrationEvents> {}

class BlueskyIntegration
  extends IntegrationEventEmitter
  implements IntegrationController<BlueskyIntegrationSettings>
{
  connected = false;

  isAutomaticallySyncingLiveStatus = false;

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
  ) {
    logger.info(
      "Bluesky Integration settings updated",
      integrationData.userSettings?.account?.username,
    );

    this.initBlueskyBot(integrationData.userSettings);
  }

  private async initBlueskyBot(settings?: BlueskyIntegrationSettings) {
    if (this.bot) {
      try {
        streamChecker.removeAllListeners();
      } catch (error) {
        logger.warn("Error removing stream checker listeners", error);
      }
    }

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

    const followListener: FollowEventHandler = (event) => {
      logger.info("Bluesky follow event", event.user.handle);

      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Follow,
        {
          ...this.getUserProfileMetadata(event.user, "blueskyUser"),
        },
      );
    };

    this.bot.removeListener("follow", followListener);
    this.bot.on("follow", followListener);

    const likeListener: LikeEventHandler = (event) => {
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
    };

    this.bot.removeListener("like", likeListener);
    this.bot.on("like", likeListener);

    const replyListener: ReplyEventHandler = async (post) => {
      logger.info("Bluesky reply event", post.author.handle, post.text);

      const parent = await post.fetchParent();
      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Reply,
        {
          ...this.getPostMetadata(post, "blueskyPost"),
          ...(parent ? this.getPostMetadata(parent, "blueskyParentPost") : {}),
        },
      );
    };

    this.bot.removeListener("reply", replyListener);
    this.bot.on("reply", replyListener);

    const repostListener: RepostEventHandler = (event) => {
      logger.info("Bluesky repost event", event.user.handle);

      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Repost,
        {
          ...this.getUserProfileMetadata(event.user, "blueskyUser"),
          ...this.getPostMetadata(event.post, "blueskyPost"),
        },
      );
    };

    this.bot.removeListener("repost", repostListener);
    this.bot.on("repost", repostListener);

    const mentionListener: MentionEventHandler = (post) => {
      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Mention,
        {
          ...this.getPostMetadata(post, "blueskyPost"),
        },
      );
    };

    this.bot.removeListener("mention", mentionListener);
    this.bot.on("mention", mentionListener);

    const quoteListener: QuoteEventHandler = async (post) => {
      logger.info("Bluesky quote event", post.author.handle, post.text);

      if (!post.embed?.isRecord()) {
        return;
      }

      const quotedPost = await this.bot.getPost(post.embed.record.uri);

      this.eventManager.triggerEvent(
        BLUESKY_INTEGRATION_ID,
        BlueskyEvent.Quote,
        {
          ...this.getPostMetadata(post, "blueskyPost"),
          ...(quotedPost
            ? this.getPostMetadata(quotedPost, "blueskyQuotedPost")
            : {}),
        },
      );
    };

    this.bot.removeListener("quote", quoteListener);
    this.bot.on("quote", quoteListener);

    this.isAutomaticallySyncingLiveStatus =
      settings?.options?.automaticallySyncLiveStatusWhenStreaming ?? false;

    if (this.isAutomaticallySyncingLiveStatus) {
      const isLiveOnTwitch = streamChecker.isLive;
      await this.handleTwitchLiveStatus(isLiveOnTwitch);

      streamChecker.on("liveStatusUpdate", async (isLiveOnTwitch) => {
        await this.handleTwitchLiveStatus(isLiveOnTwitch);
      });
    }
  }

  private async handleTwitchLiveStatus(isLiveOnTwitch: boolean) {
    const isLiveOnBluesky = await this.isLiveStatusActive();

    if (isLiveOnTwitch && !isLiveOnBluesky) {
      await this.setLiveStatus(FOUR_HOURS_IN_MINUTES);
    } else if (!isLiveOnTwitch && isLiveOnBluesky) {
      await this.clearLiveStatus();
    }
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

            const uploadResponse = await this.bot.agent
              .post("com.atproto.repo.uploadBlob", {
                input: new Uint8Array(avatarArrayBuffer),
                headers: { "content-type": contentType },
              })
              .catch(() => null as any);

            if (uploadResponse?.blob?.size) {
              thumbBlob = uploadResponse.blob;
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

  async getLiveStatus(): Promise<At.ProfileStatus | null> {
    if (!this.bot || !this.connected) {
      logger.error("Cannot get live status: not connected to Bluesky");
      return null;
    }

    const profileView: At.ProfileWithStatus = await this.bot.agent.get(
      "app.bsky.actor.getProfile",
      {
        params: { actor: asIdentifier(this.bot.profile.did) },
      },
    );

    return profileView?.status ?? null;
  }

  async isLiveStatusActive(): Promise<boolean> {
    const liveStatus = await this.getLiveStatus();
    if (!liveStatus) {
      return false;
    }

    let hasExpired = true;
    if (liveStatus.expiresAt) {
      const expiresAt = new Date(liveStatus.expiresAt).getTime();
      const now = Date.now();
      hasExpired = now >= expiresAt;
    }

    return liveStatus.isActive && !liveStatus.isDisabled && !hasExpired;
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
