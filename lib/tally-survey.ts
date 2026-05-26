const SURVEY_KEY = "survey_submitted:PdGLYe";

/**
 * Opens the Tally survey popup if the user hasn't participated yet,
 * then calls onDone when the popup closes. If the survey was already
 * submitted (or Tally hasn't loaded), calls onDone immediately.
 */
export function openWithSurveyGate(onDone: () => void) {
  if (
    typeof window === "undefined" ||
    !window.Tally ||
    localStorage.getItem(SURVEY_KEY)
  ) {
    onDone();
    return;
  }
  window.Tally.openPopup("PdGLYe", {
    onSubmit: () => localStorage.setItem(SURVEY_KEY, "1"),
    onClose: onDone,
  });
}
