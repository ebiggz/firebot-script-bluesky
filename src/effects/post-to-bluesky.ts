import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { logger } from "../logger";
import { blueskyIntegration } from "../bluesky-integration";
import { Effects } from "@crowbartools/firebot-custom-scripts-types/types/effects";
import { Facet, Post, PostPayload, PostReference } from "@skyware/bot";

type PostToBlueskyData = {
  text: string;
  threadgate?: "everyone" | "following" | "nobody";
  embedType?: "none" | "link" | "image";
  linkUrl?: string;
  imageUrls?: string[];
  sendAsReply?: boolean;
  useCustomReplyToPostUri?: boolean;
  replyToPostUri?: string;
};

export const postToBlueskyEffectType: Effects.EffectType<
  PostToBlueskyData,
  unknown,
  { postAtUri: string }
> = {
  definition: {
    id: "ebiggz:post-to-bluesky",
    name: "Post To Bluesky",
    description: "Send a post to Bluesky",
    icon: "fad fa-at",
    categories: ["integrations"],
    outputs: [
      {
        label: "Post AT URI",
        description: "The atproto URI of the created post",
        defaultName: "postAtUri",
      },
    ],
  },
  optionsTemplate: `
    <eos-container header="Text">
      <firebot-input
          model="effect.text"
          use-text-area="true"
          placeholder-text="Enter text"
          rows="4"
          cols="40"
       />
    </eos-container>
    <eos-container header="Embed" pad-top="true">
      <div class="form-group">
          <firebot-radio-cards
              options="embedOptions"
              ng-model="effect.embedType"
              id="embedType"
              name="embedType"
              grid-columns="3"
          ></firebot-radio-cards>
      </div>
      <div ng-if="effect.embedType === 'link'">
        <firebot-input
            input-title="URL"
            model="effect.linkUrl"
            placeholder-text="Enter URL (e.g. your stream link)"
            menu-position="under"
        />
      </div>
      <div ng-if="effect.embedType === 'image'">
        <editable-list settings="imageUrlSettings" model="effect.imageUrls" />
      </div>
    </eos-container>
    <eos-container header="Interaction Settings" pad-top="true">
      <div class="form-group">
          <label for="allowRepliesFrom" class="control-label">Allow replies from:</label>
          <firebot-radio-cards
              options="replyOptions"
              ng-model="effect.threadgate"
              id="allowRepliesFrom"
              name="allowRepliesFrom"
              grid-columns="1"
          ></firebot-radio-cards>
      </div>
    </eos-container>
    <eos-container header="Reply Settings" pad-top="true">
      <firebot-checkbox
          label="Send as reply"
          model="effect.sendAsReply"
          style="margin: 10px 15px 0px 0px"
      />
      <div class="form-group" ng-show="effect.sendAsReply && canInferReplyPostUri">
          <label for="replyToOption" class="control-label">Reply to:</label>
          <firebot-radio-cards
              options="replyToOptions"
              ng-model="effect.useCustomReplyToPostUri"
              id="replyToOption"
              name="replyToOption"
              grid-columns="2"
          ></firebot-radio-cards>
      </div>
      <firebot-input
          ng-show="effect.sendAsReply && effect.useCustomReplyToPostUri"
          input-title="Reply-to Post URI"
          model="effect.replyToPostUri"
          placeholder-text="Enter Post AT URI"
      />
    </eos-container>
  `,
  optionsController: ($scope) => {
    console.log("bluesky effect", $scope);
    $scope.replyOptions = [
      {
        value: "everyone",
        label: "Everyone",
        description: "Allow replies from everyone",
      },
      {
        value: "following",
        label: "Following",
        description: "Allow replies from users you follow",
      },
      {
        value: "nobody",
        label: "Nobody",
        description: "Disable replies completely",
      },
    ];

    if (!$scope.effect.threadgate) {
      $scope.effect.threadgate = "everyone";
    }

    $scope.embedOptions = [
      {
        value: "none",
        label: "Nothing",
        iconClass: "fa-ban",
      },
      {
        value: "link",
        label: "Link",
        iconClass: "fa-external-link",
      },
      {
        value: "image",
        label: "Image(s)",
        iconClass: "fa-images",
      },
    ];

    if (!$scope.effect.embedType) {
      $scope.effect.embedType = "none";
    }

    if ($scope.effect.imageUrls == null) {
      $scope.effect.imageUrls = [];
    }

    $scope.imageUrlSettings = {
      sortable: true,
      showIndex: true,
      maxItems: 4,
      addLabel: "Add Image URL",
      editLabel: "Edit Image URL",
      inputPlaceholder: "Enter image URL",
      noneAddedText: "No image URLs added",
      trigger: $scope.trigger,
      triggerMeta: $scope.triggerMeta,
    };

    $scope.replyToOptions = [
      {
        value: false,
        label: "Infer",
        description: "Infer the post to reply to from the event",
      },
      {
        value: true,
        label: "Custom",
        description: "Enter a custom post AT URI to reply to",
      },
    ];

    $scope.showUseCustomReplyPostUriToggle = false;

    $scope.canInferReplyPostUri =
      $scope.trigger == "event" &&
      [
        "ebiggz:bluesky:like",
        "ebiggz:bluesky:reply",
        "ebiggz:bluesky:quote",
        "ebiggz:bluesky:mention",
      ].includes(($scope.triggerMeta as any)?.triggerId);

    if (!$scope.canInferReplyPostUri) {
      $scope.effect.useCustomReplyToPostUri = true;
    }
  },
  optionsValidator: (effect) => {
    if (!effect.text?.length) {
      return ["Please enter some text to post!"];
    }
    if (effect.embedType === "link" && !effect.linkUrl?.length) {
      return ["Please enter an embed link URL"];
    }
    if (effect.embedType === "image" && !effect.imageUrls?.length) {
      return ["Please enter at least one image URL"];
    }
    if (
      effect.sendAsReply &&
      effect.useCustomReplyToPostUri &&
      !effect.replyToPostUri?.length
    ) {
      return ["Please enter a reply-to post URI"];
    }
    return [];
  },
  onTriggerEvent: async ({ effect, trigger }) => {
    const [valid, reason] = validateEffect(effect);
    if (!valid) {
      logger.debug(`Unable to run Post To Bluesky effect: ${reason}`, effect);
      return {
        success: false,
      };
    }

    try {
      const threadgate = effect.threadgate ?? "everyone";

      const [text, facets] = formatTextAndGetFacets(effect.text);

      const postPayload: PostPayload = {
        text,
        facets,
        external: effect.embedType === "link" ? effect.linkUrl : undefined,
        images:
          effect.embedType === "image"
            ? (effect.imageUrls
                ?.map((url) => ({ data: url }))
                .slice(0, 4) as any)
            : undefined,
        threadgate:
          threadgate !== "everyone"
            ? { allowFollowing: threadgate === "following" }
            : undefined,
      };

      let createdPost: PostReference | undefined;
      if (effect.sendAsReply) {
        const replyToPostAtUri = effect.useCustomReplyToPostUri
          ? effect.replyToPostUri
          : (trigger?.metadata?.eventData?.blueskyPostAtUri as string);

        if (!replyToPostAtUri?.length) {
          logger.error("No post AT URI to reply to");
          return {
            success: false,
          };
        }

        const replyToPost = await blueskyIntegration?.bot
          ?.getPost(replyToPostAtUri)
          .catch(() => {
            return null as Post;
          });

        if (!replyToPost) {
          logger.error(
            "Unable to fetch post to reply to with AT URI",
            replyToPostAtUri
          );
          return {
            success: false,
          };
        }

        createdPost = await replyToPost.reply(postPayload, {
          resolveFacets: true,
          splitLongPost: true,
        });
      } else {
        createdPost = await blueskyIntegration?.bot?.post(postPayload, {
          resolveFacets: true,
          splitLongPost: true,
        });
      }

      return {
        success: true,
        outputs: {
          postAtUri: createdPost?.uri,
        },
      };
    } catch (error) {
      logger.error("Error posting to Bluesky", error);
      return {
        success: false,
      };
    }
  },
};

function formatTextAndGetFacets(text: string): [string, Array<unknown>] {
  const linkRegex = /\[([\w\s\d]+)\]\((https?:\/\/[\w\d.\/?=#]+)\)/;
  let facets: Array<unknown> = [];
  let output: string = text;

  // Get Markdown links
  let match: RegExpExecArray | null = null;
  while ((match = linkRegex.exec(output))) {
    const [full, label, url] = match;
    const { index } = match;

    output = `${output.slice(0, index)}${label}${output.slice(
      index + full.length
    )}`;

    const facet = {
      index: {
        byteStart: index,
        byteEnd: index + label.length,
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: url,
        },
      ],
    };

    // should check if there are existing facets that need their positions adjusted if more replacements are added
    facets.push(facet);
  }

  return [output, facets];
}

function validateEffect(
  data: PostToBlueskyData
): [success: boolean, errorMessage?: string] {
  if (!data.text?.length) {
    return [false, "No text provided"];
  }

  return [true];
}
