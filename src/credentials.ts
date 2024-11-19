export type BlueskyCredentials = {
    username?: string;
    appPassword?: string;
};

let credentials: BlueskyCredentials = {};

export function getCredentials() {
  return credentials;
}

export function setCredentials(newCredentials: BlueskyCredentials) {
  credentials = newCredentials;
}