import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";


const VISITOR_KEY = "apex_visitor_id";
const SESSION_KEY = "apex_session_id";

function getOrCreateId(key: string, storage: Storage): string {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

export function usePageTracker() {
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;

    const visitorId = getOrCreateId(VISITOR_KEY, localStorage);
    const sessionId = getOrCreateId(SESSION_KEY, sessionStorage);
    const attribution = getAttribution();

    const record = {
      visitor_id: visitorId,
      session_id: sessionId,
      page_path: path,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      language: navigator.language,
      ...attribution,
    };


    supabase.from("site_visits").insert(record).then(({ error }) => {
      if (error) console.error("Visit tracking error:", error.message);
    });

    // Append this visit to the public, tamper-evident hash chain (/live).
    (supabase.rpc as any)("witness_visit", {
      p_page_path: path,
      p_visitor_id: visitorId,
    }).then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error("Visit ledger error:", error.message);
    });
  }, [location.pathname]);
}

