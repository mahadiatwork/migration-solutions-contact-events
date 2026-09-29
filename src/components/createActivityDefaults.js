import { getDurationOptionsFromConfig } from "../services/picklistConfigService.js";

export const getCreateActivityDefaults = (picklistConfig) => {
  const duration = getDurationOptionsFromConfig(picklistConfig)[0] ?? "";

  return {
    Type_of_Activity: "",
    Event_Title: "New Activity",
    Regarding: "",
    duration,
    Duration_Min: duration,
  };
};

export const getActivityTypeSelection = (selectedType) => ({
  Type_of_Activity: selectedType,
  Regarding: "",
});
