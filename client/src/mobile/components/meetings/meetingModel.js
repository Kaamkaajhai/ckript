const text = (value) => String(value ?? "").trim();

export const emptyMeetingDraft = (projectTitle = "") => ({
  title: text(projectTitle) ? `Ckript meeting: ${text(projectTitle)}` : "Ckript meeting",
  date: "",
  time: "",
  duration: "30",
  message: "",
  needsCalendar: false,
});
