"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CallType } from "@/lib/types/call";
import { API_URL } from "@/environment";
import { cn } from "@/lib/utils";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { RoomEvent, Track } from "livekit-client";
import { MessageSquare, Phone, PhoneOff, Send, Video, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CallInterfaceProps {
  token: string;
  serverUrl: string;
  callType: CallType;
  onLeave: () => void;
  participantName: string;
  callId: string;
  accessToken: string;
}

interface AudioCallLayoutProps {
  isChatOpen: boolean;
  onChatToggle: () => void;
  unreadCount: number;
}

function AudioCallLayout({ isChatOpen, onChatToggle, unreadCount }: AudioCallLayoutProps) {
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
      <div className="flex gap-2">
        <ControlBar variation="minimal" controls={{ camera: false, screenShare: false }} />
        <Button
          variant="secondary"
          size="icon"
          className="relative"
          onClick={onChatToggle}
          title={isChatOpen ? "Close chat" : "Open chat"}
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

function VideoCallLayout({ isChatOpen, onChatToggle, unreadCount }: { isChatOpen: boolean; onChatToggle: () => void; unreadCount: number }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
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
      <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-center gap-2">
          <ControlBar variation="minimal" />
          <Button
            variant="secondary"
            size="icon"
            className="relative"
            onClick={onChatToggle}
            title={isChatOpen ? "Close chat" : "Open chat"}
          >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface CallChatProps {
  participantName: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

function CallChat({ participantName, isOpen, onOpen, onClose, onUnreadChange }: CallChatProps) {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const encoder = useRef(new TextEncoder());
  const decoder = useRef(new TextDecoder());
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      onUnreadChange?.(0);
    }
  }, [isOpen, onUnreadChange]);

  // Listen for incoming data messages
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant: any, kind: any, topic: string | undefined) => {
      if (topic !== "chat") return;

      try {
        const data = JSON.parse(decoder.current.decode(payload));
        const msg: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          sender: data.sender || participant?.name || "Unknown",
          text: data.text,
          timestamp: data.timestamp || Date.now(),
        };
        // Defer state updates to avoid setState-during-render error
        setTimeout(() => {
          setMessages((prev) => [...prev, msg]);

          if (!isOpenRef.current) {
            setUnreadCount((prev) => {
              const newCount = prev + 1;
              // Defer parent callback to separate microtask to avoid parent update during child render
              setTimeout(() => {
                onUnreadChange?.(newCount);
              }, 0);
              return newCount;
            });
          }
        }, 0);
      } catch (e) {
        console.error("[CallChat] Failed to parse message:", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !room) return;

    const data = {
      sender: participantName,
      text: input.trim(),
      timestamp: Date.now(),
    };

    try {
      const encoded = encoder.current.encode(JSON.stringify(data));
      await room.localParticipant.publishData(encoded, {
        reliable: true,
        topic: "chat",
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-local`,
          sender: "You",
          text: input.trim(),
          timestamp: Date.now(),
        },
      ]);
      setInput("");
    } catch (e) {
      console.error("[CallChat] Failed to send message:", e);
    }
  }, [input, room, participantName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="bg-card text-card-foreground border-border fixed top-0 right-0 bottom-0 z-[60] flex w-80 flex-col overflow-hidden border-l shadow-xl">
          {/* Header */}
          <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">In-Call Chat</h3>
            <Button variant="ghost" size="icon" className="hover:bg-muted h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages - Scrollable */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-3">
              {messages.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-center">
                  <p className="text-sm">Send a message while on the call</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        msg.sender === "You"
                          ? "bg-primary text-primary-foreground ml-8"
                          : "bg-muted text-foreground mr-8",
                      )}
                    >
                      {msg.sender !== "You" && (
                        <p className="text-muted-foreground mb-0.5 text-[10px] font-semibold">{msg.sender}</p>
                      )}
                      <p className="break-words">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-border shrink-0 border-t p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="text-sm"
              />
              <Button size="icon" onClick={sendMessage} disabled={!input.trim()} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Records audio from LiveKit's own mic track (no separate getUserMedia needed).
// Waits for the local mic track to be published, then records it directly.
function CallAudioRecorder({ callId, accessToken }: { callId: string; accessToken: string }) {
  const room = useRoomContext();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isUploadingRef = useRef(false);
  const hasStartedRef = useRef(false);

  const uploadRecording = useCallback(
    async (blob: Blob) => {
      if (isUploadingRef.current || blob.size < 5000) {
        console.log("[CallRecorder] Skipping upload, blob size:", blob.size);
        return;
      }
      isUploadingRef.current = true;

      try {
        const formData = new FormData();
        const ext = blob.type.includes("ogg") ? "ogg" : "webm";
        formData.append("audioFile", blob, `call-recording.${ext}`);

        const response = await fetch(`${API_URL}/conversation/call/${callId}/upload-recording`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        if (response.ok) {
          console.log("[CallRecorder] Recording uploaded successfully");
        } else {
          console.error("[CallRecorder] Upload failed:", await response.text());
        }
      } catch (e) {
        console.error("[CallRecorder] Upload error:", e);
      } finally {
        isUploadingRef.current = false;
      }
    },
    [callId, accessToken],
  );

  // Function to start recording from a given MediaStreamTrack
  const startRecording = useCallback(
    (track: MediaStreamTrack) => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      try {
        const stream = new MediaStream([track]);

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        console.log(
          "[CallRecorder] Starting with track:",
          track.label,
          "enabled:",
          track.enabled,
          "readyState:",
          track.readyState,
          "mimeType:",
          mimeType,
        );

        const recorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 64000,
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          console.log(
            "[CallRecorder] Stopped, size:",
            (blob.size / 1024).toFixed(1),
            "KB, chunks:",
            chunksRef.current.length,
          );
          uploadRecording(blob);
        };

        recorderRef.current = recorder;
        recorder.start(3000);
        console.log("[CallRecorder] Recording started from LiveKit mic track");
      } catch (e) {
        console.error("[CallRecorder] Failed to start:", e);
        hasStartedRef.current = false;
      }
    },
    [uploadRecording],
  );

  useEffect(() => {
    if (!room) return;

    // Check if the mic track is already published
    const existingPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (existingPub?.track?.mediaStreamTrack) {
      console.log("[CallRecorder] Mic track already available");
      startRecording(existingPub.track.mediaStreamTrack);
    }

    // Also listen for when the track gets published (covers the case where it's not ready yet)
    const handleLocalTrackPublished = (publication: any) => {
      if (publication.source === Track.Source.Microphone && publication.track?.mediaStreamTrack) {
        console.log("[CallRecorder] Mic track just published");
        startRecording(publication.track.mediaStreamTrack);
      }
    };

    room.localParticipant.on("localTrackPublished", handleLocalTrackPublished);

    return () => {
      room.localParticipant.off("localTrackPublished", handleLocalTrackPublished);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      chunksRef.current = [];
    };
  }, [room, startRecording]);

  return null;
}

export function CallInterface({
  token,
  serverUrl,
  callType,
  onLeave,
  participantName,
  callId,
  accessToken,
}: CallInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
        <div className="bg-card flex shrink-0 items-center justify-between border-b p-4">
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
          {callType === CallType.Video ? (
            <VideoCallLayout
              isChatOpen={isChatOpen}
              onChatToggle={() => setIsChatOpen(!isChatOpen)}
              unreadCount={unreadCount}
            />
          ) : (
            <AudioCallLayout
              isChatOpen={isChatOpen}
              onChatToggle={() => setIsChatOpen(!isChatOpen)}
              unreadCount={unreadCount}
            />
          )}
        </div>

        <CallChat
          participantName={participantName}
          isOpen={isChatOpen}
          onOpen={() => setIsChatOpen(true)}
          onClose={() => setIsChatOpen(false)}
          onUnreadChange={setUnreadCount}
        />
        <CallAudioRecorder callId={callId} accessToken={accessToken} />
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
