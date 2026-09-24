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

dayjs.extend(utc);
dayjs.extend(timezone);

const defaultResultByActivityType = {
  Meeting: "Meeting Held",
  "To-Do": "To-do Done",
  Appointment: "Appointment Completed",
  Boardroom: "Boardroom - Completed",
  "Call Billing": "Call Billing - Completed",
  "Email Billing": "Mail - Completed",
  "Initial Consultation": "Initial Consultation - Completed",
  Call: "Call Attempted",
  Mail: "Mail - Completed",
  "Meeting Billing": "Meeting Billing - Completed",
  "Personal Activity": "Personal Activity - Completed",
  "Room 1": "Room 1 - Completed",
  "Room 2": "Room 2 - Completed",
  "Room 3": "Room 3 - Completed",
  "To Do Billing": "To Do Billing - Completed",
  Vacation: "Vacation - Completed",
};

const getDefaultResult = (activityType) =>
  defaultResultByActivityType[activityType] || "Note";

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
}) {
  const calculateDuration = (durationInMinutes) => {
    if (!durationInMinutes) return "5 minutes";
    const minutes = parseInt(durationInMinutes, 10);
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
  };

  const [duration, setDuration] = React.useState(
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
          getDefaultResult(
            selectedRowData?.Type_of_Activity || selectedRowData?.type
          )
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
          getDefaultResult(
            selectedRowData?.Type_of_Activity || selectedRowData?.type
          )
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
      const activityType =
        selectedRowData?.Type_of_Activity || selectedRowData?.type || "";
      const effectiveResult = result || getDefaultResult(activityType);
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
                  <Select
                    labelId="duration-label"
                    value={duration}
                    size="small"
                    onChange={(e) => setDuration(e.target.value)}
                    sx={{ minWidth: 150 }}
                    disabled
                  >
                    <MenuItem value="5 minutes">5 minutes</MenuItem>
                    <MenuItem value="30 minutes">30 minutes</MenuItem>
                    <MenuItem value="1 hour">1 hour</MenuItem>
                    <MenuItem value="2 hours">2 hours</MenuItem>
                  </Select>
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
                    <MenuItem value="Call Attempted">Call Attempted</MenuItem>
                    <MenuItem value="Call Completed">Call Completed</MenuItem>
                    <MenuItem value="Call Left Message">
                      Call Left Message
                    </MenuItem>
                    <MenuItem value="Call Received">Call Received</MenuItem>
                    <MenuItem value="Meeting Held">Meeting Held</MenuItem>
                    <MenuItem value="Meeting Not Held">
                      Meeting Not Held
                    </MenuItem>
                    <MenuItem value="To-do Done">To-do Done</MenuItem>
                    <MenuItem value="To-do Not Done">To-do Not Done</MenuItem>
                    <MenuItem value="Appointment Completed">
                      Appointment Completed
                    </MenuItem>
                    <MenuItem value="Appointment Not Completed">
                      Appointment Not Completed
                    </MenuItem>
                    <MenuItem value="Boardroom - Completed">
                      Boardroom - Completed
                    </MenuItem>
                    <MenuItem value="Boardroom - Not Completed">
                      Boardroom - Not Completed
                    </MenuItem>
                    <MenuItem value="Call Billing - Completed">
                      Call Billing - Completed
                    </MenuItem>
                    <MenuItem value="Initial Consultation - Completed">
                      Initial Consultation - Completed
                    </MenuItem>
                    <MenuItem value="Initial Consultation - Not Completed">
                      Initial Consultation - Not Completed
                    </MenuItem>
                    <MenuItem value="Mail - Completed">
                      Mail - Completed
                    </MenuItem>
                    <MenuItem value="Mail - Not Completed">
                      Mail - Not Completed
                    </MenuItem>
                    <MenuItem value="Meeting Billing - Completed">
                      Meeting Billing - Completed
                    </MenuItem>
                    <MenuItem value="Meeting Billing - Not Completed">
                      Meeting Billing - Not Completed
                    </MenuItem>
                    <MenuItem value="Personal Activity - Completed">
                      Personal Activity - Completed
                    </MenuItem>
                    <MenuItem value="Personal Activity - Not Completed">
                      Personal Activity - Not Completed
                    </MenuItem>
                    <MenuItem value="Note">Note</MenuItem>
                    <MenuItem value="Mail Received">Mail Received</MenuItem>
                    <MenuItem value="Mail Sent">Mail Sent</MenuItem>
                    <MenuItem value="Email Received">Email Received</MenuItem>
                    <MenuItem value="Courier Sent">Courier Sent</MenuItem>
                    <MenuItem value="Email Sent">Email Sent</MenuItem>
                    <MenuItem value="Payment Received">
                      Payment Received
                    </MenuItem>
                    <MenuItem value="Room 1 - Completed">
                      Room 1 - Completed
                    </MenuItem>
                    <MenuItem value="Room 1 - Not Completed">
                      Room 1 - Not Completed
                    </MenuItem>
                    <MenuItem value="Room 2 - Completed">
                      Room 2 - Completed
                    </MenuItem>
                    <MenuItem value="Room 2 - Not Completed">
                      Room 2 - Not Completed
                    </MenuItem>
                    <MenuItem value="Room 3 - Completed">
                      Room 3 - Completed
                    </MenuItem>
                    <MenuItem value="Room 3 - Not Completed">
                      Room 3 - Not Completed
                    </MenuItem>
                    <MenuItem value="To Do Billing - Completed">
                      To Do Billing - Completed
                    </MenuItem>
                    <MenuItem value="To Do Billing - Not Completed">
                      To Do Billing - Not Completed
                    </MenuItem>
                    <MenuItem value="Vacation - Completed">
                      Vacation - Completed
                    </MenuItem>
                    <MenuItem value="Vacation - Not Completed">
                      Vacation - Not Completed
                    </MenuItem>
                    <MenuItem value="Vacation Cancelled">
                      Vacation Cancelled
                    </MenuItem>
                    <MenuItem value="Attachment">Attachment</MenuItem>
                    <MenuItem value="E-mail Attachment">
                      E-mail Attachment
                    </MenuItem>
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
