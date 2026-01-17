import { clearLiveStatusOnBlueskyEffectType } from "./clear-live-status-on-bluesky";
import { deletePostOnBlueskyEffectType } from "./delete-post-on-bluesky";
import { likePostOnBlueskyEffectType } from "./like-post-on-bluesky";
import { postToBlueskyEffectType } from "./post-to-bluesky";
import { setLiveStatusOnBlueskyEffectType } from "./set-live-status-on-bluesky";

export const blueskyEffectTypes = [
  clearLiveStatusOnBlueskyEffectType,
  deletePostOnBlueskyEffectType,
  likePostOnBlueskyEffectType,
  postToBlueskyEffectType,
  setLiveStatusOnBlueskyEffectType,
];
