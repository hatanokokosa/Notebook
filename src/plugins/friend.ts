import type { FriendLink } from "../data/friends";

export function getVisibleFriends(friends: FriendLink[], showInactive = false) {
  return showInactive ? friends : friends.filter((friend) => !friend.inactive);
}

export function getFriendDisplayUrl(link: string) {
  return link.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getFriendDescriptionLines(desc: string) {
  return desc.split("\n");
}
