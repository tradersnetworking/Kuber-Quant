import { useEffect, useRef, useState } from "react";
import { saveDraft, loadDraft, serializeDraftValues } from "@/lib/onboarding/api";

const DRAFT_KEY = "kq-onboarding-draft-token";

export function useOnboardingDraft(onboardingType: "investor" | "manager", step: number, values: Record<string, unknown>) {
  const [draftToken, setDraftToken] = useState<string>(() => localStorage.getItem(`${DRAFT_KEY}-${onboardingType}`) || "");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!draftToken) return;
    loadDraft(draftToken).catch(() => {
      localStorage.removeItem(`${DRAFT_KEY}-${onboardingType}`);
      setDraftToken("");
    });
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await saveDraft({
          draftToken: draftToken || undefined,
          onboardingType,
          currentStep: step,
          data: serializeDraftValues(values),
          email: typeof values.email === "string" ? values.email : undefined,
        });
        if (!draftToken) {
          setDraftToken(res.draftToken);
          localStorage.setItem(`${DRAFT_KEY}-${onboardingType}`, res.draftToken);
        }
        setLastSaved(new Date(res.savedAt));
      } catch {
        /* silent — local draft still works */
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => clearTimeout(timer.current);
  }, [step, values, draftToken, onboardingType]);

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

export function saveLocalDraft(onboardingType: "investor" | "manager", values: Record<string, unknown>) {
  localStorage.setItem(`kq-onboarding-local-${onboardingType}`, JSON.stringify(serializeDraftValues(values)));
}
