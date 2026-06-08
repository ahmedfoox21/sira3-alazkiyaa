/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameMode {
  Trivia = "trivia",
  Emoji = "emoji"
}

export enum RoomStatus {
  Waiting = "waiting",
  Active = "active",
  Finished = "finished"
}

export interface Player {
  id: string;
  username: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  guildId: string | null;
  guildName: string | null;
  coins: number;
  gems: number;
  title: string | null;
  nameColor: string | null;
  borderId: string | null;
  createdAt: string;
  role?: string;
  passwordHash?: string;
  isBanned?: boolean;
  isMuted?: boolean;
  winStreak?: number;
  maxWinStreak?: number;
  matchHistory?: { id: string; opponent: string; result: "win" | "loss"; date: string }[];
  missionsProgress?: Record<string, number>;
  missionsClaimed?: string[];
  bgId?: string | null;
  effectId?: string | null;
  entranceId?: string | null;
  ownedItems?: string[];
  lastMissionsResetTime?: number;
  friends?: string[];
  friendRequests?: string[];
}

export interface Question {
  id: string;
  category: string;
  mode: GameMode;
  questionText: string;
  options?: string[]; // for Trivia
  correctAnswer: string; // indices 0-3 for trivia, or emoji/word string for emoji guess
  hint?: string;
}

export interface Room {
  id: string;
  name: string;
  type: "1v1" | "2v2";
  mode: GameMode;
  status: RoomStatus;
  players: string[]; // Player IDs
  maxPlayers: number;
  creatorId: string;
  createdAt: string;
  currentMatchId?: string;
}

export interface MatchState {
  matchId: string;
  roomId: string;
  questions: Question[];
  currentQuestionIndex: number;
  scores: Record<string, number>; // playerId: score
  answersSubmitted: Record<string, { answer: string; isCorrect: boolean; timeTaken: number }>;
  timer: number;
  status: "playing" | "round_ended" | "match_ended";
  winnerId?: string;
  reason?: string;
}

export interface Guild {
  id: string;
  name: string;
  avatar: string;
  badge: string;
  description: string;
  creatorId: string;
  membersCount: number;
  totalPoints: number;
  createdAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: "avatar" | "border" | "name_color" | "title" | "emoji_pack" | "background" | "effect" | "guild_badge" | "entrance_effect";
  rarity: "common" | "rare" | "epic" | "legendary";
  priceType: "coins" | "gems";
  priceValue: number;
  assetValue: string; // e.g. color hex, image url, class name
}

export interface FriendRelation {
  id: string;
  userOneId: string;
  userTwoId: string;
  status: "pending_one_to_two" | "pending_two_to_one" | "friends";
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderTitle: string | null;
  senderColor: string | null;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  guildId?: string | null;
  roomId?: string | null;
  roomStatus?: string | null;
  roomType?: string | null;
  roomMode?: string | null;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface Notification {
  id: string;
  playerId: string;
  type: "friend_request" | "mention" | "private_message" | "room_invite" | "admin_announcement";
  title: string;
  content: string;
  isRead: boolean;
  timestamp: string;
  referenceId?: string | null;
  extraData?: string | null;
}

export interface Tournament {
  id: string;
  title: string;
  endDate: string;
  participantsCount: number;
  prizes: {
    first: string;
    second: string;
    third: string;
  };
}

export interface GameReport {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  description: string;
  screenshot?: string;
  timestamp: string;
  status: "pending" | "resolved";
}
