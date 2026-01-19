import { TwitchApi } from "@crowbartools/firebot-custom-scripts-types/types/modules/twitch-api";
import { TypedEmitter } from "tiny-typed-emitter";

class StreamChecker extends TypedEmitter<{
  liveStatusChanged: (isLive: boolean) => void;
}> {
  private checkInterval: NodeJS.Timeout | null = null;

  private twitchApi: TwitchApi | null = null;

  public isLive: boolean = false;

  constructor() {
    super();
  }

  init(api: TwitchApi) {
    this.twitchApi = api;

    this.startChecking();
  }

  private async checkIfStreamerIsLive(): Promise<boolean> {
    if (!this.twitchApi) {
      return false;
    }

    try {
      this.twitchApi.streams;
      const stream = await this.twitchApi.streams.getStreamersCurrentStream();

      return !!stream;
    } catch (error) {
      return false;
    }
  }

  private startChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const currentlyLive = await this.checkIfStreamerIsLive();
      if (currentlyLive !== this.isLive) {
        this.isLive = currentlyLive;
        this.emit("liveStatusChanged", this.isLive);
      }
    }, 30000); // Check every 30 seconds
  }
}

export const streamChecker = new StreamChecker();
