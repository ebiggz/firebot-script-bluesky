import { Firebot } from "@crowbartools/firebot-custom-scripts-types";
import { setCredentials } from "./credentials";
import { postToBlueskyEffectType } from "./effects/post-to-bluesky";
import { initLogger } from "./logger";

interface Params {
  username: string;
  appPassword: string;
}

const script: Firebot.CustomScript<Params> = {
  getScriptManifest: () => {
    return {
      name: "Bluesky",
      description: "Adds a 'Post To Bluesky' Effect",
      author: "ebiggz",
      version: "1.0",
      firebotVersion: "5",
    };
  },
  getDefaultParameters: () => {
    return {
      username: {
        type: "string",
        default: "",
        title: "Username",
        description: "Your Bluesky account @ handle, e.g. example.bsky.social",
        validation: {
          required: true,
        }
      },
      appPassword: {
        type: "password",
        default: "",
        title: "App Password",
        description: "Generate an app password for Firebot in Bluesky [here](https://bsky.app/settings/app-passwords) (Settings > Advanced > App Passwords)",
        tip: "Please do not use your main password",
        validation: {
          required: true,
        }
      }
    };
  },
  run: (runRequest) => {
    initLogger(runRequest.modules.logger);

    setCredentials({
      username: runRequest.parameters.username?.replace(/@/g, ""),
      appPassword: runRequest.parameters.appPassword,
    });

    runRequest.modules.effectManager.registerEffect(postToBlueskyEffectType);
  },
  parametersUpdated: (parameters) => {
    setCredentials({
      username: parameters.username?.replace(/@/g, ""),
      appPassword: parameters.appPassword,
    });
  }
};

export default script;
