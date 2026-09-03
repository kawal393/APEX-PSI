import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

type ProactiveTrigger = {
  route: string;
  delayMs: number;
  message: string;
};

const TRIGGERS: ProactiveTrigger[] = [
  { route: "/", delayMs: 45000, message: "👋 I noticed you've been exploring APEX. Have any questions about EU AI Act compliance? I'm here to help!" },
  { route: "/engine", delayMs: 30000, message: "🔧 Testing the Engine engine? I can explain how the Commit-Challenge-Prove protocol works." },
  { route: "/assess", delayMs: 20000, message: "📊 Need help with your compliance assessment? I can guide you through the process." },
  { route: "/compare", delayMs: 25000, message: "⚖️ Comparing compliance solutions? Ask me how APEX differs from traditional audit firms." },
  { route: "/architecture", delayMs: 35000, message: "🏗️ Deep-diving into PSI architecture? I can answer technical questions about our ZK-Oracle and Commit Layer." },
];

const PROACTIVE_SHOWN_KEY = "apex_proactive_shown";

function getShownRoutes(): Set<string> {
  try {
    const stored = sessionStorage.getItem(PROACTIVE_SHOWN_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markRouteShown(route: string) {
  const shown = getShownRoutes();
  shown.add(route);
  sessionStorage.setItem(PROACTIVE_SHOWN_KEY, JSON.stringify([...shown]));
}

export function useProactiveChat(
  isOpen: boolean,
  hasMessages: boolean,
  openChat: () => void,
  sendMessage: (msg: string) => void
) {
  const location = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    cleanup();

    // Don't trigger if chat is already open or user has engaged
    if (isOpen || hasMessages) return;

    const trigger = TRIGGERS.find(t => t.route === location.pathname);
    if (!trigger) return;

    const shown = getShownRoutes();
    if (shown.has(trigger.route)) return;

    timerRef.current = setTimeout(() => {
      // Re-check conditions at trigger time
      if (!isOpen && !hasMessages) {
        markRouteShown(trigger.route);
        openChat();
        // Small delay so chat is visible before message appears
        setTimeout(() => sendMessage(trigger.message), 500);
      }
    }, trigger.delayMs);

    return cleanup;
  }, [location.pathname, isOpen, hasMessages, openChat, sendMessage, cleanup]);
}
