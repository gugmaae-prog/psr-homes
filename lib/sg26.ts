export const SG26_SOURCE = "roadshow:sg26";

export const SG26_SESSIONS = [
  {
    id: "friday-13-november-2026",
    day: "Friday",
    date: "13 November 2026",
    time: "5:00 PM onwards",
    iso: "2026-11-13T17:00:00+08:00",
  },
  {
    id: "saturday-14-november-2026",
    day: "Saturday",
    date: "14 November 2026",
    time: "5:00 PM onwards",
    iso: "2026-11-14T17:00:00+08:00",
  },
] as const;

export const SG26_EVENT_NAME = "PSR Singapore Property Show 2026";

export const SG26_INVITATION_ACTION = "Request your invitation";

export const SG26_INVITATION_NOTE = "Attendance is limited. Registration is subject to review and does not guarantee admission. Venue details will be shared following approval.";

export const SG26_REGISTRATION_HREF = "/sg26#request-invite";

export function formatSingaporeSession(session: (typeof SG26_SESSIONS)[number]) {
  return `${session.day} ${session.date}, ${session.time}, Singapore time`;
}
