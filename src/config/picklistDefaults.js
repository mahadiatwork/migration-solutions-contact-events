// Compatibility defaults used when Widget_Picklist_Config is unavailable.
export const defaultTypeOptions = [
  "Meeting",
  "To-Do",
  "Appointment",
  "Boardroom",
  "Call Billing",
  "Email Billing",
  "Initial Consultation",
  "Call",
  "Mail",
  "Meeting Billing",
  "Personal Activity",
  "Room 1",
  "Room 2",
  "Room 3",
  "To Do Billing",
  "Vacation",
];

export const defaultDurationOptions = Array.from(
  { length: 24 },
  (_, index) => (index + 1) * 10
);

// Contact Events historically offered one combined result list when clearing
// an activity. Keep that behavior as the fallback.
export const defaultResultOptions = [
  "Call Attempted",
  "Call Completed",
  "Call Left Message",
  "Call Received",
  "Meeting Held",
  "Meeting Not Held",
  "To-do Done",
  "To-do Not Done",
  "Appointment Completed",
  "Appointment Not Completed",
  "Boardroom - Completed",
  "Boardroom - Not Completed",
  "Call Billing - Completed",
  "Initial Consultation - Completed",
  "Initial Consultation - Not Completed",
  "Mail - Completed",
  "Mail - Not Completed",
  "Meeting Billing - Completed",
  "Meeting Billing - Not Completed",
  "Personal Activity - Completed",
  "Personal Activity - Not Completed",
  "Note",
  "Mail Received",
  "Mail Sent",
  "Email Received",
  "Courier Sent",
  "Email Sent",
  "Payment Received",
  "Room 1 - Completed",
  "Room 1 - Not Completed",
  "Room 2 - Completed",
  "Room 2 - Not Completed",
  "Room 3 - Completed",
  "Room 3 - Not Completed",
  "To Do Billing - Completed",
  "To Do Billing - Not Completed",
  "Vacation - Completed",
  "Vacation - Not Completed",
  "Vacation Cancelled",
  "Attachment",
  "E-mail Attachment",
];

export const defaultRegardingOptions = [
  "Hourly Consult $220",
  "Initial Consultation Fee $165",
  "No appointments today",
  "No appointments tonight",
];
