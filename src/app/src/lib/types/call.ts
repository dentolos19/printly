export enum CallType {
  Audio = 0,
  Video = 1,
}

export enum CallStatus {
  Ringing = 0,
  Ongoing = 1,
  Completed = 2,
  Missed = 3,
  Declined = 4,
  Failed = 5,
}

export interface CallParticipant {
  id: string;
  name: string;
  didAnswer: boolean;
  joinedAt: string | null;
  leftAt: string | null;
}

export interface CallLog {
  id: string;
  conversationId: string;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  liveKitRoomName: string;
  initiator: CallParticipant;
  participants: CallParticipant[];
}

export interface IncomingCallData {
  callId: string;
  conversationId: string;
  initiatorId: string;
  initiatorName: string;
  callType: CallType;
  roomName: string;
  status: CallStatus;
}

export interface CallTokenResponse {
  token: string;
  roomName: string;
  wsUrl: string;
}
