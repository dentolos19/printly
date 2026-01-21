import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function useSupportHub(accessToken?: string) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setIsConnected(false);
      setConnection(null);
      return;
    }

    // Create new SignalR connection
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/support`, {
        accessTokenFactory: () => accessToken,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 10s, 30s, then 30s
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = newConnection;

    // Connection event handlers
    newConnection.onreconnecting((error) => {
      console.log("[SupportHub] Reconnecting...", error);
      setIsConnected(false);
    });

    newConnection.onreconnected((connectionId) => {
      console.log("[SupportHub] Reconnected:", connectionId);
      setIsConnected(true);
      setError(null);
    });

    newConnection.onclose((error) => {
      console.log("[SupportHub] Connection closed", error);
      setIsConnected(false);
      if (error) {
        setError(error.message);
      }
    });

    // Start the connection
    newConnection
      .start()
      .then(() => {
        console.log("[SupportHub] Connected successfully");
        setIsConnected(true);
        setConnection(newConnection);
        setError(null);
      })
      .catch((err) => {
        console.error("[SupportHub] Connection failed:", err);
        setError(err.message || "Failed to connect");
        setIsConnected(false);
      });

    // Cleanup on unmount
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [accessToken]);

  return { connection, isConnected, error };
}
