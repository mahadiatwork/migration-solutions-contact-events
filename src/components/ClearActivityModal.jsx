import * as React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  InputLabel,
  Typography,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "react-quill/dist/quill.snow.css";
import { getResultOptions } from "../services/picklistConfigService.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const formatHistoryDate = (value) => {
  if (!value) return null;

  const parsedDate = dayjs(value);
  return parsedDate.isValid()
    ? parsedDate
        .tz("Australia/Adelaide")
        .format("YYYY-MM-DDTHH:mm:ssZ")
    : null;
};

const serializeHistoryDuration = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const normalizedValue = String(value).trim();
  const hoursMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*hours?$/i);
  if (hoursMatch) return String(Number(hoursMatch[1]) * 60);

  const minutesMatch = normalizedValue.match(/^(\d+)\s*minutes?$/i);
  if (minutesMatch) return minutesMatch[1];

  return /^\d+(?:\.\d+)?$/.test(normalizedValue)
    ? normalizedValue
    : null;
};

const requireSuccessfulRecord = (response, action) => {
  const responseData = response?.data?.[0];
  if (responseData?.code === "SUCCESS") return responseData;

  throw new Error(
    `${action} failed${responseData?.message ? `: ${responseData.message}` : "."}`
  );
};

export default function ClearActivityModal({
  open,
  handleClose,
  selectedRowData,
  ZOHO,
  setEvents,
  picklistConfig,
}) {
  const activityType =
    selectedRowData?.Type_of_Activity || selectedRowData?.type || "";
  const resultOptions = getResultOptions(
    activityType,
    picklistConfig,
    selectedRowData?.result,
    true
  );
  const defaultResult = resultOptions[0] || "";
  const calculateDuration = (durationInMinutes) => {
    if (
      durationInMinutes === null ||
      durationInMinutes === undefined ||
      durationInMinutes === ""
    ) return "";

    const serialized = serializeHistoryDuration(durationInMinutes);
    if (serialized === null) return String(durationInMinutes);
    const minutes = Number(serialized);
    if (!Number.isFinite(minutes)) return String(durationInMinutes);
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    const hourText = `${hours} hour${hours === 1 ? "" : "s"}`;
    return remainder
      ? `${hourText} ${remainder} minute${remainder === 1 ? "" : "s"}`
      : hourText;
  };

  const [duration] = React.useState(
    calculateDuration(
      selectedRowData?.Duration_Min ?? selectedRowData?.duration
    )
  );
  const [result, setResult] = React.useState(selectedRowData?.result || "");
  const [addActivityToHistory, setAddActivityToHistory] = React.useState(false);
  const [clearChecked, setClearChecked] = React.useState(
    selectedRowData?.Event_Status === "Closed" ||
      Boolean(selectedRowData?.Cleared)
  );
  const [eraseChecked, setEraseChecked] = React.useState(false);
  const [activityDetails, setActivityDetails] = React.useState(
    selectedRowData?.Description || ""
  );
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const [snackbarSeverity, setSnackbarSeverity] = React.useState("success");

  const handleClearChange = (event) => {
    setClearChecked(event.target.checked);
    if (event.target.checked) {
      setEraseChecked(false);
      setResult(
        (currentResult) =>
          currentResult ||
          defaultResult
      );
    }
  };

  const handleEraseChange = (event) => {
    setEraseChecked(event.target.checked);
    if (event.target.checked) {
      setClearChecked(false);
      setResult(
        (currentResult) =>
          currentResult ||
          defaultResult
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const participants = Array.isArray(selectedRowData?.Participants)
        ? selectedRowData.Participants
        : [];
      const contactParticipants = participants.filter((participant) => {
        const participantId = participant?.participant || participant?.id;
        return Boolean(
          participantId &&
            (!participant?.type || participant.type === "contact")
        );
      });
      const effectiveResult = result || defaultResult;
      const historyDate = formatHistoryDate(
        selectedRowData?.Start_DateTime || selectedRowData?.start
      );
      const historyDuration = serializeHistoryDuration(
        selectedRowData?.Duration_Min ?? selectedRowData?.duration
      );
      let historyRecordData = null;

      if (addActivityToHistory) {
        const missingHistoryFields = [];
        if (!historyDate) missingHistoryFields.push("date");
        if (!activityType) missingHistoryFields.push("type");
        if (!effectiveResult) missingHistoryFields.push("result");
        if (historyDuration === null) missingHistoryFields.push("duration");
        if (contactParticipants.length === 0) {
          missingHistoryFields.push("contact participant");
        }

        if (missingHistoryFields.length > 0) {
          throw new Error(
            `History was not created because the event is missing: ${missingHistoryFields.join(
              ", "
            )}.`
          );
        }

        const stakeholderId = selectedRowData?.What_Id?.id;
        historyRecordData = {
          Name:
            contactParticipants
              .map((participant) => participant?.name)
              .filter(Boolean)
              .join(", ") || selectedRowData?.Event_Title || "Activity",
          Duration: historyDuration,
          History_Type: activityType,
          ...(stakeholderId
            ? { Stakeholder: { id: stakeholderId } }
            : {}),
          Regarding:
            selectedRowData?.Regarding || selectedRowData?.regarding || "",
          Date: historyDate,
          History_Details_Plain: activityDetails || "",
          History_Result: effectiveResult,
          Event_ID: selectedRowData?.id,
        };
      }

      // Helper to create history if required
      const createHistory = async () => {
        const historyResponse = await ZOHO.CRM.API.insertRecord({
          Entity: "History1",
          APIData: historyRecordData,
          Trigger: ["workflow"],
        });

        const historyResult = requireSuccessfulRecord(
          historyResponse,
          "History creation"
        );
        const historyRecordId = historyResult?.details?.id;
        if (!historyRecordId) {
          throw new Error("History creation failed: Zoho returned no record ID.");
        }

        const participantInsertResponses = await Promise.all(
          contactParticipants.map((participant) =>
            ZOHO.CRM.API.insertRecord({
              Entity: "History_X_Contacts",
              APIData: {
                Contact_Details: {
                  id: participant.participant || participant.id,
                },
                Contact_History_Info: { id: historyRecordId },
              },
              Trigger: ["workflow"],
            })
          )
        );

        participantInsertResponses.forEach((response) => {
          requireSuccessfulRecord(response, "History contact link creation");
        });

        setSnackbarMessage(
          `${clearChecked ? "Event marked as cleared" : "Event erased"} and history created successfully!`
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        return true;
      };

      if (clearChecked && !eraseChecked) {
        // Update the event to "Closed"
        const updateResponse = await ZOHO.CRM.API.updateRecord({
          Entity: "Events",
          RecordID: selectedRowData?.id,
          APIData: {
            id: selectedRowData?.id,
            Event_Status: "Closed",
            result: effectiveResult,
          },
        });
  
        if (updateResponse.data[0].code === "SUCCESS") {
          setSnackbarMessage("Event marked as cleared successfully!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
  
          // Update events in state
          setEvents((prevEvents) =>
            prevEvents.map((event) =>
              event.id === selectedRowData?.id
                ? {
                    ...event,
                    Event_Status: "Closed",
                    result: effectiveResult,
                  }
                : event
            )
          );
  
          if (addActivityToHistory) {
            await createHistory();
          }
        } else {
          throw new Error("Failed to update the event.");
        }
      }
  
      if (!clearChecked && eraseChecked) {
        // Delete the event
        const deleteResponse = await ZOHO.CRM.API.deleteRecord({
          Entity: "Events",
          RecordID: selectedRowData?.id,
        });

        const deleteResult = deleteResponse?.data?.[0];

        if (deleteResult?.code === "SUCCESS") {
          setSnackbarMessage("Event erased successfully!");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);

          // Remove the event from the events state
          setEvents((prevEvents) => prevEvents.filter((event) => event.id !== selectedRowData?.id));

          if (addActivityToHistory) {
            await createHistory();
          }

          // Reload from Zoho after deletion so the related-events list is
          // authoritative. This was part of the original working erase flow.
          window.location.reload();
          return;
        } else {
          throw new Error(
            deleteResult?.message || "Failed to delete the event."
          );
        }
      }
  
      setTimeout(() => {
        handleClose(); // Close modal or any UI related to submission
      }, 1000);
    } catch (error) {
      console.error("Error during submission:", error);
      setSnackbarMessage(
        error?.message || "An unexpected error occurred, try again!"
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };
  
  const handleActivityDetailsChange = (e) => {
    setActivityDetails(e.target.value);
  };

  const isUpdateDisabled = !clearChecked && !eraseChecked;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        PaperProps={{
          sx: {
            padding: "20px",
            borderRadius: "10px",
            maxWidth: "600px",
          },
        }}
      >
        {selectedRowData === null ? (
          <DialogContent>{/* <CircularProgress /> */}</DialogContent>
        ) : (
          <>
            <DialogTitle id="modal-title" sx={{ fontWeight: "bold" }}>
              Clear Activity
            </DialogTitle>
            <Divider />
            <form onSubmit={handleSubmit}>
              <DialogContent>
                <Typography variant="subtitle1" sx={{ marginBottom: "10px" }}>
                  <strong>Type:</strong> {selectedRowData?.Type_of_Activity}
                </Typography>
                <TextField
                  fullWidth
                  label="Title"
                  value={selectedRowData?.Event_Title || ""}
                  margin="dense"
                  multiline
                  disabled
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Organiser"
                  value={selectedRowData?.Owner?.name || ""}
                  margin="dense"
                  size="small"
                  disabled
                />
                <TextField
                  fullWidth
                  label="Participants"
                  value={
                    selectedRowData?.Participants &&
                    selectedRowData.Participants.length > 0
                      ? selectedRowData.Participants.map(
                          (participant) => participant.name
                        ).join(", ")
                      : "No Participant"
                  }
                  margin="dense"
                  size="small"
                  disabled
                />
                <TextField
                  fullWidth
                  label="Associate With"
                  value={selectedRowData?.What_Id?.name || ""}
                  margin="dense"
                  size="small"
                  disabled
                />

                <FormGroup column sx={{ marginTop: "15px" }}>
                  <InputLabel id="duration-label" sx={{ fontWeight: "bold" }}>
                    Duration
                  </InputLabel>
                  <TextField
                    value={duration}
                    size="small"
                    sx={{ minWidth: 150 }}
                    disabled
                  />
                </FormGroup>

                <Typography
                  variant="subtitle1"
                  sx={{ marginTop: "15px", fontWeight: "bold" }}
                >
                  Results:
                </Typography>
                <FormGroup row>
                  <Tooltip
                    title="Mark this event as cleared and update its status"
                    arrow
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={clearChecked}
                          onChange={handleClearChange}
                        />
                      }
                      label="Clear"
                    />
                  </Tooltip>
                  <Tooltip title="Delete this event permanently" arrow>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={eraseChecked}
                          onChange={handleEraseChange}
                        />
                      }
                      label="Erase"
                    />
                  </Tooltip>
                  <Select
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    sx={{ marginLeft: 2, minWidth: 150 }}
                    size="small"
                  >
                    {resultOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormGroup>

                <Tooltip
                  title="Add the activity details to history for future reference"
                  arrow
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={addActivityToHistory}
                        onChange={() =>
                          setAddActivityToHistory(!addActivityToHistory)
                        }
                      />
                    }
                    label="Add Activity Details to History"
                    sx={{ marginTop: "10px" }}
                  />
                </Tooltip>

                <TextField
                  fullWidth
                  label="Activity Details"
                  value={activityDetails}
                  onChange={handleActivityDetailsChange}
                  margin="dense"
                  multiline
                  minRows={4}
                  size="small"
                  disabled={!addActivityToHistory}
                />
              </DialogContent>

              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="primary"
                  variant="outlined"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  disabled={isUpdateDisabled}
                >
                  Update
                </Button>
              </DialogActions>
            </form>
          </>
        )}
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
