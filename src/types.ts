import { Profile } from "@skyware/bot";

export type BlueskyIntegrationSettings = {
  account: {
    username: string;
    appPassword: string;
    service: string;
  };
  options?: {
    automaticallySyncLiveStatusWhenStreaming?: boolean;
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

type ObjectOmit<T, K extends keyof any> = Omit<T, K>;

/***
 * Some lexicon types
 */
export declare namespace At {
  /** CID string */
  type CID = string;
  /** DID of a user */
  type DID = `did:${string}`;
  /** User handle */
  type Handle = string;
  /** URI string */
  type Uri = string;
  /** Object containing a CID string */
  interface CIDLink {
    $link: CID;
  }
  /** Object containing a base64-encoded bytes */
  interface Bytes {
    $bytes: string;
  }
  /** Blob interface */
  interface Blob<T extends string = string> {
    $type: "blob";
    mimeType: T;
    ref: {
      $link: string;
    };
    size: number;
  }

  /** External embed in a status record */
  interface StatusRecordEmbedExternal {
    $type: "app.bsky.embed.external#external";
    description: string;
    thumb?: Blob;
    title: string;
    uri: string;
  }

  /** Embed object within a status record */
  interface StatusRecordEmbed {
    $type: "app.bsky.embed.external";
    external: StatusRecordEmbedExternal;
  }

  /** The raw status record */
  interface StatusRecord {
    $type: "app.bsky.actor.status";
    createdAt: string;
    durationMinutes?: number;
    embed?: StatusRecordEmbed;
    status: string;
  }

  /** External view in a status embed */
  interface StatusEmbedExternalView {
    uri: string;
    title: string;
    description: string;
    thumb?: string;
  }

  /** View embed object for a status */
  interface StatusEmbedView {
    $type: "app.bsky.embed.external#view";
    external: StatusEmbedExternalView;
  }

  /** Profile status object */
  interface ProfileStatus {
    uri: Uri;
    cid: CID;
    record: StatusRecord;
    status: string;
    embed?: StatusEmbedView;
    expiresAt?: string;
    isActive: boolean;
    isDisabled: boolean;
  }

  interface ProfileWithStatus extends Profile {
    status?: ProfileStatus;
  }
}

/** Handles type branding in objects */
export declare namespace Brand {
  /** Symbol used to brand objects, this does not actually exist in runtime */
  const Type: unique symbol;
  /** Get the intended `$type` field */
  type GetType<
    T extends {
      [Type]?: string;
    },
  > = NonNullable<T[typeof Type]>;
  /** Creates a union of objects where it's discriminated by `$type` field. */
  type Union<
    T extends {
      [Type]?: string;
    },
  > = T extends any
    ? T & {
        $type: GetType<T>;
      }
    : never;
  /** Omits the type branding from object */
  type Omit<
    T extends {
      [Type]?: string;
    },
  > = ObjectOmit<T, typeof Type>;
}

export namespace AppBskyRichtextFacet {
  /** Annotation of a sub-string within rich text. */
  export interface Main {
    [Brand.Type]?: "app.bsky.richtext.facet";
    features: Brand.Union<Link | Mention | Tag>[];
    index: ByteSlice;
  }
  /** Specifies the sub-string range a facet feature applies to. Start index is inclusive, end index is exclusive. Indices are zero-indexed, counting bytes of the UTF-8 encoded text. NOTE: some languages, like Javascript, use UTF-16 or Unicode codepoints for string slice indexing; in these languages, convert to byte arrays before working with facets. */
  interface ByteSlice {
    [Brand.Type]?: "app.bsky.richtext.facet#byteSlice";
    /** Minimum: 0 */
    byteEnd: number;
    /** Minimum: 0 */
    byteStart: number;
  }
  /** Facet feature for a URL. The text URL may have been simplified or truncated, but the facet reference should be a complete URL. */
  interface Link {
    [Brand.Type]?: "app.bsky.richtext.facet#link";
    uri: string;
  }
  /** Facet feature for mention of another account. The text is usually a handle, including a '@' prefix, but the facet reference is a DID. */
  interface Mention {
    [Brand.Type]?: "app.bsky.richtext.facet#mention";
    did: At.DID;
  }
  /** Facet feature for a hashtag. The text usually includes a '#' prefix, but the facet reference should not (except in the case of 'double hash tags'). */
  interface Tag {
    [Brand.Type]?: "app.bsky.richtext.facet#tag";
    /**
     * Maximum string length: 640 \
     * Maximum grapheme length: 64
     */
    tag: string;
  }
}
