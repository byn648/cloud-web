export type AuthTokenResponse = {
  accessToken: string;
  accessExpiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
};

export type AuthLoginRequest = {
  username: string;
  password: string;
};

export type AuthLoginResponse = {
  userId: number;
  username: string;
  nickName: string;
  uuid: string;
  roles: string[];
  token: AuthTokenResponse;
};
