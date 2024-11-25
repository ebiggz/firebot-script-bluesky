export type BlueskyIntegrationSettings = {
  account: {
    username: string;
    appPassword: string;
  };
};

export enum BlueskyEvent {
  Follow = "follow",
  Like = "like",
  Reply = "reply",
  Repost = "repost",
  Quote = "quote",
  Mention = "mention",
}
