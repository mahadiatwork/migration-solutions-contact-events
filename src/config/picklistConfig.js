export const PICKLIST_CONFIG_MODULES = [
  "Widget_Picklist_Config",
  "CustomModule15",
];

export const PICKLIST_CONFIG_FIELDS = {
  name: "Name",
  category: "Category",
  parentType: "Parent_Type",
  sortOrder: "Sort_Order",
  active: "Active",
};

export const FALLBACK_TYPES = [
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

export const FALLBACK_RESULTS = {
  Meeting: ["Meeting Held", "Meeting Not Held"],
  "To-Do": ["To-do Done", "To-do Not Done"],
  Appointment: ["Appointment Completed", "Appointment Not Completed"],
  Boardroom: ["Boardroom - Completed", "Boardroom - Not Completed"],
  "Call Billing": [
    "Call Billing - Completed",
    "Call Billing - Not Completed",
  ],
  "Email Billing": [
    "Email Billing - Completed",
    "Email Billing - Not Completed",
  ],
  "Initial Consultation": [
    "Initial Consultation - Completed",
    "Initial Consultation - Not Completed",
  ],
  Call: [
    "Call Attempted",
    "Call Completed",
    "Call Left Message",
    "Call Received",
  ],
  Mail: ["Mail - Completed", "Mail - Not Completed"],
  "Meeting Billing": [
    "Meeting Billing - Completed",
    "Meeting Billing - Not Completed",
  ],
  "Personal Activity": [
    "Personal Activity - Completed",
    "Personal Activity - Not Completed",
    "Note",
    "Mail Received",
    "Mail Sent",
    "Email Received",
    "Courier Sent",
    "Email Sent",
    "Payment Received",
  ],
  "Room 1": ["Room 1 - Completed", "Room 1 - Not Completed"],
  "Room 2": ["Room 2 - Completed", "Room 2 - Not Completed"],
  "Room 3": ["Room 3 - Completed", "Room 3 - Not Completed"],
  "To Do Billing": [
    "To Do Billing - Completed",
    "To Do Billing - Not Completed",
  ],
  Vacation: [
    "Vacation - Completed",
    "Vacation - Not Completed",
    "Vacation Cancelled",
  ],
  _default: ["Note"],
};

export const FALLBACK_DURATIONS = Array.from(
  { length: 24 },
  (_, index) => (index + 1) * 10
);

export const FALLBACK_REGARDING = {
  _default: [
    "Hourly Consult $220",
    "Initial Consultation Fee $165",
    "No appointments today",
    "No appointments tonight",
  ],
};
