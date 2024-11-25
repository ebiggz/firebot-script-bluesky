import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { logger } from "../logger";
import { blueskyIntegration } from "../bluesky-integration";
import { Effects } from "@crowbartools/firebot-custom-scripts-types/types/effects";

type PostToBlueskyData = {
  text: string;
  threadgate?: "everyone" | "following" | "nobody";
  embedType?: "none" | "link" | "image";
  linkUrl?: string;
  imageUrls?: string[];
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
    <eos-container header="Interaction settings" pad-top="true">
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
  `,
  optionsController: ($scope) => {
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
  },
  optionsValidator: (effect) => {
    if (!effect.text?.length) {
      return ["Please enter some text to post!"];
    }
    return [];
  },
  onTriggerEvent: async ({ effect }) => {
    const [valid, reason] = validateEffect(effect);
    if (!valid) {
      logger.debug(`Unable to run Post To Bluesky effect: ${reason}`, effect);
      return {
        success: false,
      };
    }

    try {
      const threadgate = effect.threadgate ?? "everyone";

      const createdPost = await blueskyIntegration?.bot?.post(
        {
          text: effect.text,
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
        },
        {
          resolveFacets: true,
          splitLongPost: true,
        }
      );

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

function validateEffect(
  data: PostToBlueskyData
): [success: boolean, errorMessage?: string] {
  if (!data.text?.length) {
    return [false, "No text provided"];
  }

  return [true];
}
