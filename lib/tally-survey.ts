const SURVEY_KEY = "survey_submitted:PdGLYe";

export function maybeOpenTallySurvey() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SURVEY_KEY)) return;
  window.Tally?.openPopup("PdGLYe", {
    onSubmit: () => localStorage.setItem(SURVEY_KEY, "1"),
  });
}
