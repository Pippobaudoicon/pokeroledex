// This recovery runs as one local user. It does not authenticate with Auth0.
export const API_BASE_URL = "/api";

export const localAuth = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    sub: "local-user",
    name: "Local Trainer",
    nickname: "Local Trainer",
  },
};
