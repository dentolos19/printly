import { describe, expect, it } from "bun:test";

import initCommunityController, { type UserSearchResponse, updateFollowState } from "../src/lib/server/community";

const user: UserSearchResponse = {
  id: "user-1",
  userName: "Example",
  followerCount: 2,
  isFollowedByMe: false,
  isPrivate: false,
  hasPendingRequest: false,
};

describe("community follows", () => {
  it("marks public follows as following and private follows as pending", () => {
    expect(updateFollowState(user, false, false)).toMatchObject({
      isFollowedByMe: true,
      hasPendingRequest: false,
    });
    expect(updateFollowState({ ...user, isPrivate: true }, false, false)).toMatchObject({
      isFollowedByMe: false,
      hasPendingRequest: true,
    });
  });

  it("clears followed and pending states when unfollowing or cancelling", () => {
    expect(updateFollowState({ ...user, isFollowedByMe: true }, true, false)).toMatchObject({
      isFollowedByMe: false,
      hasPendingRequest: false,
    });
    expect(updateFollowState({ ...user, isPrivate: true, hasPendingRequest: true }, false, true)).toMatchObject({
      isFollowedByMe: false,
      hasPendingRequest: false,
    });
  });

  it("sends the suggested-user limit expected by the API", async () => {
    const api = initCommunityController(async (endpoint) => {
      expect(endpoint).toBe("/community/users/suggested?limit=3");
      return Response.json([user]);
    });

    expect(await api.getSuggestedUsers(3)).toEqual([user]);
  });
});
