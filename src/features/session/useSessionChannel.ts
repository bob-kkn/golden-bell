import { useEffect, useRef, useState } from "react";
import type { SessionState } from "../../types/quiz";
import type { SessionSnapshot } from "./sessionReducer";
import { loadStoredSession, saveSession, SESSION_STORAGE_KEY } from "../storage/quizStorage";

export interface PendingSessionSnapshot {
  quizSet: SessionSnapshot["quizSet"] | null;
  state: SessionState;
}

type SessionChannelMessage =
  | { type: "request_snapshot"; sessionId: string }
  | { type: "session_snapshot"; snapshot: PendingSessionSnapshot };

function createChannel(sessionId: string): BroadcastChannel | null {
  if (typeof BroadcastChannel !== "function") {
    return null;
  }

  try {
    return new BroadcastChannel(`golden-bell:${sessionId}`);
  } catch {
    return null;
  }
}

function postMessageSafely(channel: BroadcastChannel, message: SessionChannelMessage): void {
  try {
    channel.postMessage(message);
  } catch {
    // Ignore closed-channel errors and rely on localStorage fallback.
  }
}

export function useHostSessionChannel(sessionId: string, snapshot: SessionSnapshot): void {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const channel = createChannel(sessionId);

    if (!channel) {
      return;
    }

    channelRef.current = channel;

    const handleMessage = (event: MessageEvent<SessionChannelMessage>) => {
      if (event.data.type !== "request_snapshot" || event.data.sessionId !== sessionId) {
        return;
      }

      postMessageSafely(channel, {
        type: "session_snapshot",
        snapshot: snapshotRef.current,
      });
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);

      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      channel.close();
    };
  }, [sessionId]);

  useEffect(() => {
    saveSession(snapshot.state);

    if (channelRef.current) {
      postMessageSafely(channelRef.current, {
        type: "session_snapshot",
        snapshot,
      });
    }
  }, [snapshot]);
}

export function useScreenSessionChannel(sessionId: string): PendingSessionSnapshot | null {
  const [snapshot, setSnapshot] = useState<PendingSessionSnapshot | null>(() => {
    const stored = loadStoredSession(sessionId);

    if (!stored) {
      return null;
    }

    return {
      quizSet: null,
      state: stored,
    };
  });

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const channel = createChannel(sessionId);
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== SESSION_STORAGE_KEY) {
        return;
      }

      const stored = loadStoredSession(sessionId);

      if (stored) {
        setSnapshot({
          quizSet: null,
          state: stored,
        });
      }
    };

    window.addEventListener("storage", handleStorage);

    if (channel) {
      const handleMessage = (event: MessageEvent<SessionChannelMessage>) => {
        if (event.data.type !== "session_snapshot") {
          return;
        }

        setSnapshot(event.data.snapshot);
      };

      channel.addEventListener("message", handleMessage);
      postMessageSafely(channel, {
        type: "request_snapshot",
        sessionId,
      });

      return () => {
        window.removeEventListener("storage", handleStorage);
        channel.removeEventListener("message", handleMessage);
        channel.close();
      };
    }

    const stored = loadStoredSession(sessionId);
    if (stored) {
      setSnapshot({
        quizSet: null,
        state: stored,
      });
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [sessionId]);

  return snapshot;
}
