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

export type BlueSkyRichTextFacet = {
  index: {
    byteStart: number;
    byteEnd: number;
  };
  features: Array<BlueSkyFacetLinkFeature>;
};

type BlueSkyFacetLinkFeature = {
  $type: "app.bsky.richtext.facet#link";
  uri: string;
};
