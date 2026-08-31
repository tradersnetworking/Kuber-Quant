import { useEffect, useRef, useState } from "react";
import { saveDraft, loadDraft, serializeDraftValues } from "@/lib/onboarding/api";

const DRAFT_KEY = "kq-onboarding-draft-token";
const LOCAL_SAVE_MS = 800;
const REMOTE_SAVE_MS = 2500;

export function useOnboardingDraft(
  onboardingType: "investor" | "manager",
  step: number,
  values: Record<string, unknown>,
) {
  const [draftToken, setDraftToken] = useState<string>(
    () => localStorage.getItem(`${DRAFT_KEY}-${onboardingType}`) || "",
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastPayload = useRef<string>("");
  const draftTokenRef = useRef(draftToken);
  draftTokenRef.current = draftToken;

  useEffect(() => {
    if (!draftToken) return;
    loadDraft(draftToken).catch(() => {
      localStorage.removeItem(`${DRAFT_KEY}-${onboardingType}`);
      setDraftToken("");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({
      step,
      data: serializeDraftValues(values),
    });
    if (payload === lastPayload.current) return;

    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (payload === lastPayload.current) return;
      lastPayload.current = payload;
      setSaving(true);
      try {
        const token = draftTokenRef.current;
        const res = await saveDraft({
          draftToken: token || undefined,
          onboardingType,
          currentStep: step,
          data: serializeDraftValues(values),
          email: typeof values.email === "string" ? values.email : undefined,
        });
        if (!token) {
          setDraftToken(res.draftToken);
          localStorage.setItem(`${DRAFT_KEY}-${onboardingType}`, res.draftToken);
        }
        setLastSaved(new Date(res.savedAt));
      } catch {
        /* silent — local draft still works */
      } finally {
        setSaving(false);
      }
    }, REMOTE_SAVE_MS);

    return () => clearTimeout(timer.current);
  }, [step, values, onboardingType]);

  return { draftToken, lastSaved, saving };
}

export function loadLocalDraft(onboardingType: "investor" | "manager") {
  try {
    const raw = localStorage.getItem(`kq-onboarding-local-${onboardingType}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const localTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function saveLocalDraft(onboardingType: "investor" | "manager", values: Record<string, unknown>) {
  const key = `kq-onboarding-local-${onboardingType}`;
  const prev = localTimers.get(key);
  if (prev) clearTimeout(prev);
  localTimers.set(
    key,
    setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(serializeDraftValues(values)));
      } catch {
        /* quota / private mode */
      }
      localTimers.delete(key);
    }, LOCAL_SAVE_MS),
  );
}
