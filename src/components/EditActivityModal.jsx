import React from "react";
import "@mobiscroll/react/dist/css/mobiscroll.min.css";
import { Input, Select, Textarea } from "@mobiscroll/react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import FirstComponent from "./FirstComponent";
import SecondComponent from "./SecondComponent";
import ThirdComponent from "./ThirdComponent";
import CloseIcon from "@mui/icons-material/Close";

// Helper function to format date with timezone offset
function formatDateForRemindAt(date) {
  if (!date) return null;

  // Helper function to pad numbers with leading zeros
  const pad = (num) => String(num).padStart(2, "0");

  // Extract date and time components
  const formattedYear = date.getFullYear();
  const formattedMonth = pad(date.getMonth() + 1);
  const formattedDay = pad(date.getDate());
  const formattedHours = pad(date.getHours());
  const formattedMinutes = pad(date.getMinutes());
  const formattedSeconds = pad(date.getSeconds());

  // Get timezone offset
  const timezoneOffset = -date.getTimezoneOffset();
  const offsetSign = timezoneOffset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(timezoneOffset) / 60));
  const offsetMinutes = pad(Math.abs(timezoneOffset) % 60);

  // Return formatted date string with timezone offset
  return `${formattedYear}-${formattedMonth}-${formattedDay}T${formattedHours}:${formattedMinutes}:${formattedSeconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

// Function to calculate Remind_At based on Reminder_Text
function calculateRemindAt(reminderText, startDateTime) {
  const startDate = new Date(startDateTime);
  // Calculate the amount of time to subtract based on Reminder_Text
  switch (reminderText) {
    case "At time of meeting":
      return startDate.toISOString(); // No change
    case "5 minutes before":
      startDate.setMinutes(startDate.getMinutes() - 5);
      break;
    case "10 minutes before":
      startDate.setMinutes(startDate.getMinutes() - 10);
      break;
    case "15 minutes before":
      startDate.setMinutes(startDate.getMinutes() - 15);
      break;
    case "30 minutes before":
      startDate.setMinutes(startDate.getMinutes() - 30);
      break;
    case "1 hour before":
    case "60 minutes before":
      startDate.setHours(startDate.getHours() - 1);
      break;
    case "2 hours before":
    case "120 minutes before":
      startDate.setHours(startDate.getHours() - 2);
      break;
    case "1 day before":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "2 days before":
      startDate.setDate(startDate.getDate() - 2);
      break;
    case "None":
    default:
      return null; // No reminder
  }
  // Format the updated date back into the required ISO string format
  return formatDateForRemindAt(startDate);
}

function formatDateWithOffset(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  // Pad numbers with leading zeros
  const pad = (num) => String(num).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // Calculate timezone offset
  const timezoneOffset = -date.getTimezoneOffset();
  const offsetSign = timezoneOffset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(timezoneOffset) / 60));
  const offsetMinutes = pad(Math.abs(timezoneOffset) % 60);

  // Return formatted date string with timezone offset
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}


function transformFormSubmission(data) {
  // Function to transform scheduleWith data into the Participants format
  const transformScheduleWithToParticipants = (scheduleWith) => {
    return scheduleWith.map((contact) => ({
      Email: contact.Email || null, // Use Email if available, or set to null
      name: contact.Full_Name || contact.name || null, // Use Full_Name for the name
      invited: false, // Default to false
      type: "contact", // Default type to "contact"
      participant: contact.participant || contact.id || null, // Use the CRM participant ID
      status: "not_known", // Default status to "not_known"
    }));
  };

  const participantsFromScheduleWith = data.scheduledWith
    ? transformScheduleWithToParticipants(data.scheduledWith)
    : [];

  const hasDuration = data.Duration_Min !== "" && data.Duration_Min != null;
  let transformedData = {
    ...data,
    Start_DateTime: formatDateWithOffset(data.start), // Format `start` to ISO with timezone
    End_DateTime: formatDateWithOffset(data.end), // Format `end` to ISO with timezone
    Description: data.Description, // Map `description` to `Description`
    Event_Priority: data.priority, // Map `priority` to `Event_Priority`

    // Updated `What_Id` with both name and id from `associateWith`
    What_Id: data.What_Id,
    se_module: "Accounts",

    // Combine the manually set participants and those from `scheduleWith`
    Participants: participantsFromScheduleWith,
    ...(hasDuration ? { Duration_Min: String(data.Duration_Min) } : {}),
    Owner: {
      id: data?.scheduleFor?.id,
    },
  };
  if (!hasDuration) delete transformedData.Duration_Min;

  let remindAt = null;
  if (
    data?.Reminder_Text !== null &&
    data?.Reminder_Text !== "" &&
    data?.Reminder_Text !== "None"
  ) {
    remindAt = calculateRemindAt(
      data?.Reminder_Text,
      formatDateWithOffset(data.start)
    );
    transformedData["Remind_At"] = remindAt;
  } else {
    delete transformedData["Remind_At"];
  }

  if (data.Send_Reminders && remindAt) {
    transformedData["User_Reminder"] = remindAt;
  } else {
    delete transformedData["User_Reminder"];
  }

  if (data.Send_Invites) {
    transformedData["$send_notification"] = true;
  } else {
    delete transformedData["$send_notification"];
  }

  // Explicitly remove the scheduleWith, scheduleFor, and description keys
  delete transformedData.scheduledWith;
  delete transformedData.scheduleFor;
  delete transformedData.description;
  delete transformedData.associateWith;

  // Remove keys that have null or undefined values
  Object.keys(transformedData).forEach((key) => {
    if (transformedData[key] === null || transformedData[key] === undefined) {
      delete transformedData[key];
    }
  });

  return transformedData;
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ px: 0, py: 1 }}>{children}</Box>}
    </div>
  );
}

const EditActivityModal = ({
  handleClose,
  selectedRowData,
  ZOHO,
  users,
  setEvents,
  picklistConfig,
}) => {
  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [textvalue, setTextValue] = useState("");
  const [formData, setFormData] = useState({
    id: selectedRowData?.id,
    Event_Title: selectedRowData?.Event_Title || "",
    Type_of_Activity: selectedRowData?.Type_of_Activity || "",
    start: selectedRowData?.Start_DateTime || "",
    end: selectedRowData?.End_DateTime || "",
    Duration_Min: selectedRowData?.Duration_Min ?? "",
    What_Id: selectedRowData?.What_Id || "",
    scheduledWith: selectedRowData?.Participants
      ? selectedRowData.Participants
      : [], // Map 'name' and 'participant' to create the appropriate structure for Autocomplete
    Venue: selectedRowData?.Venue || "",
    priority: selectedRowData?.Event_Priority || "",
    ringAlarm: selectedRowData?.ringAlarm || "",
    Colour: selectedRowData?.Colour || "#ff0000",
    Regarding: selectedRowData?.Regarding || "",
    Description: selectedRowData?.Description || "",
    Banner: selectedRowData?.Banner || false,
    scheduleFor: selectedRowData?.Owner || null,
    Reminder_Text: selectedRowData?.Reminder_Text || "15 minutes before",
    Send_Invites: Boolean(
      selectedRowData?.Send_Invites || selectedRowData?.$send_notification
    ),
    Send_Reminders: Boolean(selectedRowData?.Send_Reminders),
    $send_notification: Boolean(selectedRowData?.$send_notification),
  });

  const [isSnackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // Handlers for Next and Back buttons
  const handleNext = () => {
    if (value < 2) setValue(value + 1); // Increment to next tab
  };

  const handleBack = () => {
    if (value > 0) setValue(value - 1); // Decrement to previous tab
  };

  const handleInputChange = (field, value) => {
    if (field === "resource") {
      value = parseInt(value, 10); // Convert the input to an integer
    }

    if (field === "scheduleWith") {
      setFormData((prev) => ({
        ...prev,
        [field]: Array.isArray(value) ? [...value] : value, // Spread array values for multiple selections
      }));
    }
    setFormData((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };
const handleSubmit = async () => {
  const transformedData = transformFormSubmission(formData);
  try {
    const data = await ZOHO.CRM.API.updateRecord({
      Entity: "Events",
      APIData: transformedData,
      Trigger: ["workflow"],
    });

    if (data.data && data.data.length > 0 && data.data[0].code === "SUCCESS") {
      setSnackbarSeverity("success");
      setSnackbarMessage("Event updated successfully.");
      setSnackbarOpen(true);

      // Ensure updateEvent always receives the latest associateWith value
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === formData.id ? { ...event, ...formData } : event
        )
      );

      setTimeout(() => {
        // window.location.reload(); 
        handleClose()
      }, 1000);
    } else {
      throw new Error("Failed to update event");
    }
  } catch (error) {
    console.log(error)
    setSnackbarSeverity("error");
    setSnackbarMessage("Error updating event.");
    setSnackbarOpen(true);
  }
};

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };


  console.log({selectedRowData})
  

  return (
    <Box
      role="dialog"
      aria-labelledby="edit-activity-title"
      sx={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "90%",
        maxWidth: "750px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxSizing: "border-box",
        bgcolor: "background.paper",
        borderRadius: 4,
        boxShadow: 24,
        zIndex: 100,
        p: "15px 30px 20px 30px",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography
          id="edit-activity-title"
          variant="subtitle1"
          sx={{ fontWeight: "bold" }}
        >
          Edit Activity
        </Typography>

        {/* Replacing IconButton with Cancel Button */}
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={handleClose}
          endIcon={<CloseIcon />}
        >
          Cancel
        </Button>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          textColor="inherit"
          aria-label="simple tabs example"
          sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, fontSize: "9pt" } }}
        >
          <Tab label="General" />
          <Tab label="Details" />
          <Tab label="Reccurence" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <FirstComponent
          formData={formData}
          handleInputChange={handleInputChange}
          users={users}
          selectedRowData={selectedRowData}
          ZOHO={ZOHO}
          isEditMode={true} // Pass true if it's the EditModal, false otherwise
          picklistConfig={picklistConfig}
        />
        <Box display="flex" justifyContent="space-between" mt={2}>
          {/* First button aligned to the left */}
          <Button size="small" disabled>
            Back
          </Button>

          {/* Wrapper for the other two buttons aligned to the right */}
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={handleSubmit}
            >
              Ok
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleNext}
            >
              Next
            </Button>
          </Box>
        </Box>
      </TabPanel>
      <TabPanel value={value} index={1}>
        {/* <SecondComponent /> */}
        <Typography variant="h6">Description</Typography>
        {/* <ReactQuill
          theme="snow"
          style={{ height: 250, marginBottom: 80 }}
          value={formData.quillContent}
          onChange={(content) => handleInputChange("quillContent", content)}
        /> */}
        <TextField
          multiline
          rows={10}
          fullWidth
          value={formData?.Description}
          onChange={(event) =>
            handleInputChange("Description", event.target.value)
          }
        />
        <Box display="flex" justifyContent="space-between" mt={2}>
          {/* First button aligned to the left */}
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={handleBack}
          >
            Back
          </Button>

          {/* Wrapper for the other two buttons aligned to the right */}
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={handleSubmit}
            >
              Ok
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleNext}
            >
              Next
            </Button>
          </Box>
        </Box>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <ThirdComponent
          formData={formData}
          handleInputChange={handleInputChange}
        />
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={handleBack}
          >
            Back
          </Button>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={handleSubmit}
          >
            Ok
          </Button>{" "}
          {/* Next is disabled on the last tab */}
        </Box>
      </TabPanel>
      <Snackbar
        open={isSnackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditActivityModal;
