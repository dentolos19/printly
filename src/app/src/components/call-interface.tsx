"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CallType } from "@/lib/types/call";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  GridLayout,
  ParticipantTile,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useState } from "react";

interface CallInterfaceProps {
  token: string;
  serverUrl: string;
  callType: CallType;
  onLeave: () => void;
  participantName: string;
}

function AudioCallLayout() {
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: false });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <Phone className="text-primary mx-auto h-24 w-24 animate-pulse" />
        <h2 className="mt-4 text-2xl font-semibold">Voice Call</h2>
        <p className="text-muted-foreground mt-2">
          {tracks.length} participant{tracks.length !== 1 ? "s" : ""} in call
        </p>
      </div>
      <RoomAudioRenderer />
      <ControlBar variation="minimal" controls={{ camera: false, screenShare: false }} />
    </div>
  );
}

function VideoCallLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black">
      <div className="flex-1 overflow-hidden">
        <GridLayout
          tracks={tracks}
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <ParticipantTile />
        </GridLayout>
      </div>
      <RoomAudioRenderer />
      <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <ControlBar variation="minimal" />
      </div>
    </div>
  );
}

export function CallInterface({ token, serverUrl, callType, onLeave, participantName }: CallInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col">
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        onConnected={() => setIsConnected(true)}
        onDisconnected={() => {
          setIsConnected(false);
          onLeave();
        }}
        audio={true}
        video={callType === CallType.Video}
        data-lk-theme="default"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div className="bg-card flex flex-shrink-0 items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">{callType === CallType.Audio ? "Voice Call" : "Video Call"}</h2>
            <p className="text-muted-foreground text-sm">{isConnected ? "Connected" : "Connecting..."}</p>
          </div>
          <Button variant="destructive" onClick={onLeave} className="gap-2">
            <PhoneOff className="h-4 w-4" />
            End Call
          </Button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          {callType === CallType.Video ? <VideoCallLayout /> : <AudioCallLayout />}
        </div>
      </LiveKitRoom>
    </div>
  );
}

interface IncomingCallNotificationProps {
  callerName: string;
  callType: CallType;
  onAnswer: () => void;
  onDecline: () => void;
}

export function IncomingCallNotification({ callerName, callType, onAnswer, onDecline }: IncomingCallNotificationProps) {
  return (
    <Card className="animate-in slide-in-from-top-5 fixed top-20 right-4 z-50 w-96 p-6 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
          {callType === CallType.Video ? (
            <Video className="text-primary h-8 w-8" />
          ) : (
            <Phone className="text-primary h-8 w-8 animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{callerName}</h3>
          <p className="text-muted-foreground text-sm">
            Incoming {callType === CallType.Audio ? "voice" : "video"} call...
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="destructive" onClick={onDecline} className="flex-1 gap-2">
          <PhoneOff className="h-4 w-4" />
          Decline
        </Button>
        <Button onClick={onAnswer} className="flex-1 gap-2">
          {callType === CallType.Video ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          Answer
        </Button>
      </div>
    </Card>
  );
}
