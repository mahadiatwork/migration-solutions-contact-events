import {
  Autocomplete,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid2 as Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState, useEffect, useContext } from "react";
import CustomTextField from "./atom/CustomTextField";
import ContactField from "./atom/ContactField";
import AccountField from "./atom/AccountField";
import { ChromePicker, SketchPicker } from "react-color";
import { Datepicker } from "@mobiscroll/react";
import RegardingField from "./atom/RegardingField";
import { ZohoContext } from "../App";
import CustomColorPicker from "./atom/CustomColorPicker";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import {
  getDurationOptionsFromConfig,
  getRegardingOptions,
  getTypeOptionsFromConfig,
  normalizeDurationValue,
} from "../services/picklistConfigService.js";

const commonTextStyles = {
  fontSize: "9pt",
  "& .MuiOutlinedInput-input": { fontSize: "9pt" },
  "& .MuiAutocomplete-input": { fontSize: "9pt" },
  "& .MuiFormLabel-root": { fontSize: "9pt" },
  "& .MuiTypography-root": { fontSize: "9pt" },
};

const parseDateString = (dateString) => {
  const [datePart, timePart, ampm] = dateString.split(" "); // Split date and time
  const [day, month, year] = datePart.split("/").map(Number); // Split date part
  let [hours, minutes] = timePart.split(":").map(Number); // Split time part

  // Convert 12-hour format to 24-hour format
  if (ampm === "PM" && hours < 12) {
    hours += 12;
  } else if (ampm === "AM" && hours === 12) {
    hours = 0; // Convert 12 AM to 00 hours
  }

  // Create a new Date object with the parsed values
  return new Date(year, month - 1, day, hours, minutes);
};

// Utility to format date
const formatTime = (date) => {
  const newDate = new Date(date);

  console.log({ formatTime: newDate });

  const year = newDate.getFullYear();
  const month = String(newDate.getMonth() + 1).padStart(2, "0");
  const day = String(newDate.getDate()).padStart(2, "0");

  // Convert to 12-hour format and determine AM/PM
  let hours = newDate.getHours();
  const minutes = String(newDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // Convert 0 hours to 12 for AM

  console.log({
    formattedTime: `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`,
  });

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
};

const formatTimeForBanner = (date, hour) => {
  const newDate = new Date(date);
  newDate.setHours(hour, 0, 0, 0);
  // Manually format the date in YYYY-MM-DDTHH:mm without converting to UTC
  const year = newDate.getFullYear();
  const month = String(newDate.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(newDate.getDate()).padStart(2, "0");
  const hours = String(newDate.getHours()).padStart(2, "0");
  const minutes = String(newDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to calculate duration between two dates in minutes, rounded to the nearest 10
const calculateDuration = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMinutes = (endDate - startDate) / (1000 * 60); // Convert milliseconds to minutes

  // Round to the nearest multiple of 10
  const roundedDuration = Math.round(durationMinutes / 10) * 10;

  return Math.max(10, Math.min(roundedDuration, 240)); // Clamp duration between 10 and 240
};

// Helper to calculate end date based on start date and duration in minutes
const calculateEndDate = (start, duration) => {
  const startDate = new Date(start);
  startDate.setMinutes(startDate.getMinutes() + duration);
  return startDate;
};

const FirstComponent = ({
  formData,
  handleInputChange,
  users,
  selectedRowData,
  ZOHO,
  isEditMode, // New prop to check if it's edit mode
  picklistConfig,
}) => {
  const {
    events,
    filterDate,
    setFilterDate,
    recentColors,
    setRecentColor,
    currentContactId,
  } = useContext(ZohoContext);

  const activityType = getTypeOptionsFromConfig(
    picklistConfig,
    selectedRowData?.Type_of_Activity,
    Boolean(isEditMode && selectedRowData)
  );
  const durations = getDurationOptionsFromConfig(
    picklistConfig,
    selectedRowData?.Duration_Min ?? selectedRowData?.duration,
    Boolean(isEditMode && selectedRowData)
  );
  const configuredDuration = (value) => {
    const normalizedValue = normalizeDurationValue(value);
    return (
      durations.find(
        (duration) => Number(duration) === Number(normalizedValue)
      ) ?? ""
    );
  };

  function addMinutesToDateTime(formatType, durationInMinutes) {
    // // Create a new Date object using the start time from formData
    // console.log(formatType,durationInMinutes)
    if (formatType === "Duration_Min") {
      let date = new Date(formData.start);

      date.setMinutes(date.getMinutes() + parseInt(durationInMinutes, 10));
      const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      );

      const modifiedDate = localDate.toISOString().slice(0, 16);

      handleInputChange("end", modifiedDate);
      setEndValue(dayjs(modifiedDate));
    } else {
      let date = new Date(formData.start);

      date.setMinutes(
        date.getMinutes() - parseInt(durationInMinutes.value, 10)
      );

      const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      );

      const modifiedDate = localDate.toISOString().slice(0, 16);

      handleInputChange("Remind_At", modifiedDate);
      handleInputChange("Reminder_Text", durationInMinutes.name);
    }
  }

  useEffect(() => {
    const initializeDefaultValues = () => {
      const now = new Date();
      const oneHourLater = new Date(now);
      const defaultDuration = durations[0] ?? "";
      const defaultDurationMinutes =
        defaultDuration === "" ? Number.NaN : Number(defaultDuration);
      oneHourLater.setMinutes(
        now.getMinutes() +
          (Number.isFinite(defaultDurationMinutes) ? defaultDurationMinutes : 60)
      );

      handleInputChange("start", now.toISOString());
      handleInputChange("end", oneHourLater.toISOString());
      handleInputChange("duration", defaultDuration);
      handleInputChange("Duration_Min", defaultDuration);
      setStartValue(dayjs(now));
      setEndValue(dayjs(oneHourLater));
    };

    const initializeSelectedRowData = () => {
      handleInputChange("Reminder_Text", selectedRowData.Reminder_Text || "");
      handleInputChange("Event_Title", selectedRowData.Event_Title || "");
      handleInputChange(
        "Type_of_Activity",
        selectedRowData.Type_of_Activity || ""
      );

      const formattedStart = selectedRowData.Start_DateTime
        ? new Date(selectedRowData.Start_DateTime)
        : null;
      const formattedEnd = selectedRowData.End_DateTime
        ? new Date(selectedRowData.End_DateTime)
        : null;

      // Set start, end, and duration if valid times are provided
      if (formattedStart && formattedEnd) {
        handleInputChange("start", formattedStart.toISOString());
        handleInputChange("end", formattedEnd.toISOString());
        const selectedDuration = configuredDuration(
          selectedRowData.Duration_Min ??
            selectedRowData.duration ??
            ""
        );
        handleInputChange("duration", selectedDuration);
        handleInputChange("Duration_Min", selectedDuration);
        setStartValue(dayjs(formattedStart));
        setEndValue(dayjs(formattedEnd));
      } else {
        initializeDefaultValues();
      }

      handleInputChange("Venue", selectedRowData.Venue || "");
      handleInputChange("priority", selectedRowData.Event_Priority || "");
      handleInputChange("ringAlarm", selectedRowData.ringAlarm || "");
      handleInputChange("Colour", selectedRowData.Colour || "#ff0000");
      handleInputChange("Banner", selectedRowData.Banner || false);

      const owner = users.find(
        (user) => user.full_name === selectedRowData.Owner?.name
      );
      handleInputChange("scheduleFor", owner || null);

      handleInputChange(
        "scheduledWith",
        selectedRowData.Participants
          ? selectedRowData.Participants.map((participant) => ({
              name: participant.name,
              participant: participant.participant,
              type: participant.type,
            }))
          : []
      );
    };

    if (!selectedRowData) {
      initializeDefaultValues();
    } else {
      initializeSelectedRowData();
    }
  }, [selectedRowData, users, picklistConfig]);

  const [openStartDatepicker, setOpenStartDatepicker] = useState(false);
  const [openEndDatepicker, setOpenEndDatepicker] = useState(false);
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [color, setColor] = useState(formData.Colour || "#ff0000");
  const [sendInvites, setSendInvites] = useState(
    Boolean(formData?.Send_Invites)
  );
  const [sendReminders, setSendReminders] = useState(
    Boolean(formData?.Send_Reminders)
  );

  const handleBannerChecked = (e) => {
    handleInputChange("Banner", e.target.checked);
    const selectedDate = formData.start;
    console.log({ selectedDate });
    if (selectedDate) {
      const timeAt6AM = formatTimeForBanner(selectedDate, 6);
      const timeAt7AM = formatTimeForBanner(selectedDate, 7);
      // console.log("fahim", timeAt6AM, timeAt7AM);
      handleInputChange("start", timeAt6AM);
      handleInputChange("end", timeAt7AM);
      setStartValue(dayjs(timeAt6AM));
      setEndValue(dayjs(timeAt7AM));
    } else {
      const now = new Date();
      // console.log(now);
      const timeAt6AM = formatTimeForBanner(now, 6);
      const timeAt7AM = formatTimeForBanner(now, 7);
      // console.log("fahim", timeAt6AM, timeAt7AM);
      handleInputChange("start", timeAt6AM);
      handleInputChange("end", timeAt7AM);
      setStartValue(dayjs(timeAt6AM));
      setEndValue(dayjs(timeAt7AM));
    }
  };

  const handleActivityChange = (event) => {
    const selectedType = event.target.value;
    handleInputChange("Type_of_Activity", selectedType);
    handleInputChange(
      "Regarding",
      getRegardingOptions(selectedType, picklistConfig)[0] || ""
    );
  };

  const handleClick = () => {
    setDisplayColorPicker(!displayColorPicker);
  };

  const handleClose = () => {
    setDisplayColorPicker(false);
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    handleInputChange("Colour", newColor);
  };

  const handleSendInvitesChange = (checked) => {
    setSendInvites(checked);
    handleInputChange("Send_Invites", checked);
    handleInputChange("$send_notification", checked);
  };

  const handleSendRemindersChange = (checked) => {
    setSendReminders(checked);
    handleInputChange("Send_Reminders", checked);

    if (checked) {
      const reminderText =
        formData.Reminder_Text && formData.Reminder_Text !== "None"
          ? formData.Reminder_Text
          : "15 minutes before";
      handleInputChange("Reminder_Text", reminderText);
    } else {
      handleInputChange("Remind_Participants", []);
      handleInputChange("Remind_At", null);
    }
  };

  // Custom input for datepicker
  const customInputComponent = (field, placeholder, openDatepickerState) => {
    return (
      <CustomTextField
        fullWidth
        size="small"
        placeholder={placeholder}
        variant="outlined"
        value={formData[field]} // Use formData
        onClick={() => openDatepickerState(true)}
        disabled={formData.Banner} // Disable if Banner is checked
      />
    );
  };

  // Handle input change for start date and calculate end date & duration
  const handleInputChangeWithEnd = (field, value) => {
    if (field === "start") {
      const startDate = new Date(value);
      let endDate = new Date(formData.end);
      // If there's no valid end date or it's before the start, set 1 hour later as default
      if (isNaN(endDate.getTime()) || endDate <= startDate) {
        endDate = calculateEndDate(startDate, 60);
      }
      const duration = configuredDuration(
        calculateDuration(startDate, endDate)
      );

      handleInputChange("start", formatTime(startDate));
      handleInputChange("end", formatTime(endDate));
      handleInputChange("Duration_Min", duration); // Auto-update duration
      handleInputChange("duration", duration);
    } else if (field === "end") {
      const startDate = parseDateString(formData.start);
      const duration = configuredDuration(calculateDuration(startDate, value));
      handleInputChange("end", formatTime(value));
      handleInputChange("Duration_Min", duration);
      handleInputChange("duration", duration);
    } else if (field === "Duration_Min") {
      const startDate = parseDateString(formData.start);

      const newEndDate = calculateEndDate(startDate, value);
      handleInputChange("Duration_Min", value);
      handleInputChange("duration", value);
      handleInputChange("end", formatTime(newEndDate));
    } else {
      handleInputChange(field, value);
    }
  };

  const popover = {
    position: "absolute",
    zIndex: "2",
  };

  const cover = {
    position: "fixed",
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  };

  const colorBoxStyle = {
    width: "20px",
    height: "20px",
    backgroundColor: color,
    border: "1px solid #ccc",
    display: "inline-block",
    cursor: "pointer",
    marginLeft: 1,
  };

  const commonStyles = {
    height: "40px",
    "& .MuiOutlinedInput-root": {
      height: "100%",
    },
    "& .MuiSelect-select, & .MuiAutocomplete-input": {
      padding: "8px 12px",
    },
  };

  const [startValue, setStartValue] = useState(dayjs(formData.start));
  const [endValue, setEndValue] = useState(dayjs(formData.end));

  function getTimeDifference(end) {
    const startDate = new Date(formData.start);
    const endDate = new Date(end);
    const diffInMs = endDate - startDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return diffInMinutes;
  }

  const handleEndDateChange = (e) => {
    console.log("fahim", e.$d);
    handleInputChange("end", e.$d);
    console.log("end", e.value);
    const getDiffInMinutes = getTimeDifference(e.$d);
    const allowedDuration = configuredDuration(getDiffInMinutes);
    handleInputChange("Duration_Min", allowedDuration);
    handleInputChange("duration", allowedDuration);
    console.log({ getDiffInMinutes });
    // if (formData.end ) {
    //   console.log('hello')
    // }
  };

  //  const [selectedParticipants, setSelectedParticipants] = useState(
  //   selectedRowData?.Participants || []
  // ); // Selected values in autocomplete

  return (
    <Box sx={{ mt: 2, ...commonTextStyles }}>
      <Grid container spacing={1.7}>
        <Grid size={12}>
          <CustomTextField
            fullWidth
            size="small"
            label="Event_Title"
            variant="outlined"
            value={formData.Event_Title} // Use formData
            onChange={(e) => handleInputChange("Event_Title", e.target.value)}
          />
        </Grid>

        <Grid size={12}>
          <FormControl fullWidth size="small" sx={commonStyles}>
            <InputLabel>Activity type</InputLabel>
            <Select
              label="Activity type"
              fullWidth
              value={formData.Type_of_Activity} // Use formData
              onChange={handleActivityChange}
            >
              {activityType.map((item) => (
                <MenuItem value={item} key={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid size={4} sx={{ minWidth: 0 }}>
          {/* <Datepicker
            controls={["calendar", "time"]}
            display="center"
            inputComponent={() =>
              customInputComponent(
                "start",
                "Start Time",
                setOpenStartDatepicker
              )
            }
            onClose={() => setOpenStartDatepicker(false)}
            onChange={(e) => handleInputChangeWithEnd("start", e.value)} // Auto-populate end date and duration
            isOpen={openStartDatepicker}
            touchUi={true}
          /> */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label="Start Time"
              value={startValue}
              disabled={formData.Banner ? true : false}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
              onChange={(e) => {
                const configuredDuration =
                  formData.Duration_Min === "" ||
                  formData.Duration_Min === null ||
                  formData.Duration_Min === undefined
                    ? Number.NaN
                    : Number(formData.Duration_Min);
                const durationMinutes = Number.isFinite(configuredDuration)
                  ? configuredDuration
                  : Number(durations[0]);
                const addedHour = new Date(
                  dayjs(e.$d)
                    .add(
                      Number.isFinite(durationMinutes) ? durationMinutes : 60,
                      "minute"
                    )
                    .toDate()
                );
                handleInputChange("start", e.$d);
                handleInputChange("end", addedHour);
                setEndValue(dayjs(addedHour));
                handleInputChange(
                  "Duration_Min",
                  Number.isFinite(durationMinutes) ? durationMinutes : ""
                );
                handleInputChange(
                  "duration",
                  Number.isFinite(durationMinutes) ? durationMinutes : ""
                );
                console.log(e.$d);
                console.log(addedHour);
              }}
              sx={{ width: "100%", "& input": { py: 0 } }}
              renderInput={(params) => <TextField {...params} size="small" />}
              format="DD/MM/YYYY hh:mm A" // Ensures 24-hour format for clarity
            />
          </LocalizationProvider>
        </Grid>
        <Grid size={4} sx={{ minWidth: 0 }}>
          {/* <Datepicker
            controls={["calendar", "time"]}
            display="center"
            inputComponent={() =>
              customInputComponent("end", "End Time", setOpenEndDatepicker)
            }
            onClose={() => setOpenEndDatepicker(false)}
            onChange={(e) => handleInputChangeWithEnd("end", e.value)} // Calculate duration when end is updated
            isOpen={openEndDatepicker}
            disabled={formData.Banner} // Disable if Banner is checked
          /> */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label="End Time"
              value={endValue}
              disabled={formData.Banner ? true : false}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
              onChange={(e) => handleEndDateChange(e)}
              sx={{ width: "100%", "& input": { py: 0 } }}
              renderInput={(params) => <TextField {...params} size="small" />}
              format="DD/MM/YYYY hh:mm A" // Ensures 24-hour format for clarity
            />
          </LocalizationProvider>
        </Grid>
        <Grid size={4} sx={{ minWidth: 0 }}>
          <FormControl fullWidth size="small">
            <InputLabel
              id="demo-simple-select-standard-label"
              // sx={{ top: "-5px" }}
            >
              Duration
            </InputLabel>
            <Select
              labelId="demo-simple-select-standard-label"
              id="demo-simple-select-standard"
              label="Duration"
              fullWidth
              value={formData.Duration_Min}
              disabled={formData.Banner ? true : false}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => {
                handleInputChange("Duration_Min", e.target.value);
                handleInputChange("duration", e.target.value);
                addMinutesToDateTime("Duration_Min", e.target.value);
              }}
              sx={{
                "& .MuiSelect-select": {
                  padding: "4px 5px", // Adjust the padding to shrink the Select content
                },
                "& .MuiOutlinedInput-root": {
                  // height: '40px', // Set a consistent height
                  padding: "3px 0px", // Ensure no extra padding
                },
                "& .MuiInputBase-input": {
                  display: "flex",
                  alignItems: "center", // Align the content vertically
                },
              }}
            >
              {durations.map((minute, index) => (
                <MenuItem key={index} value={minute}>
                  {minute} minutes
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={12} container columnSpacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Checkbox
                  checked={formData.Banner}
                  onChange={handleBannerChecked}
                />
              }
              label="Banner/Timeless"
            />
          </Grid>
          <Grid
            size={{ xs: 12, sm: 3 }}
            display="flex"
            alignItems="center"
          >
            <Typography variant="body1" sx={{ mr: 1 }}>
              Colour:
            </Typography>
            <div style={colorBoxStyle} onClick={handleClick} />
            {displayColorPicker && (
              <div style={popover}>
                <div style={cover} />
                <CustomColorPicker
                  recentColors={recentColors}
                  handleClose={handleClose}
                  handleColorChange={handleColorChange}
                />
              </div>
            )}
          </Grid>
        </Grid>
        <Grid size={12}>
          <ContactField
            formData={formData} // Use formData
            handleInputChange={handleInputChange}
            ZOHO={ZOHO}
            selectedRowData={selectedRowData}
            currentContactId={currentContactId}
          />
        </Grid>
        <Grid size={12} container columnSpacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Checkbox
                  checked={sendInvites}
                  onChange={(event) =>
                    handleSendInvitesChange(event.target.checked)
                  }
                />
              }
              label="Send Invites"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Checkbox
                  checked={sendReminders}
                  onChange={(event) =>
                    handleSendRemindersChange(event.target.checked)
                  }
                />
              }
              label="Send Reminders"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Checkbox
                  checked={formData.Create_Separate_Event_For_Each_Contact}
                  onChange={(event) =>
                    handleInputChange(
                      "Create_Separate_Event_For_Each_Contact",
                      event.target.checked
                    )
                  }
                  disabled={isEditMode}
                />
              }
              label="Create separate activity for each contact"
            />
          </Grid>
        </Grid>
        <Grid size={12}>
          <AccountField
            formData={formData} // Use formData
            handleInputChange={handleInputChange}
            ZOHO={ZOHO}
            selectedRowData={selectedRowData}
          />
        </Grid>
        <Grid size={12}>
          <RegardingField
            formData={formData}
            handleInputChange={handleInputChange}
            selectedRowData={selectedRowData}
            picklistConfig={picklistConfig}
            isEditMode={isEditMode}
          />
        </Grid>
        <Grid size={12}>
          <FormControl fullWidth size="small" sx={commonStyles}>
            <Autocomplete
              id="schedule-for-autocomplete"
              size="small"
              options={users} // Ensure users array is correctly passed
              getOptionLabel={(option) => option.full_name || option.name || ""}
              value={formData.scheduleFor || null} // Ensure it's an object, or null if not set
              onChange={(event, newValue) => {
                handleInputChange("scheduleFor", newValue || null); // Set the selected value
              }}
              renderInput={(params) => (
                <TextField
                  size="small"
                  {...params}
                  label="Schedule for ..."
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      padding: 0,
                    },
                    "& .MuiInputBase-input": {
                      padding: "3px 10px",
                      display: "flex",
                      alignItems: "center",
                    },
                  }}
                />
              )}
            />
          </FormControl>
        </Grid>
        <Grid size={3}>
          <FormControl fullWidth size="small" sx={commonStyles}>
            <InputLabel>Priority</InputLabel>
            <Select
              label="Priority"
              fullWidth
              value={formData.priority} // Use formData
              onChange={(e) => handleInputChange("priority", e.target.value)}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={3}>
          <FormControl fullWidth size="small" sx={commonStyles}>
            <InputLabel>Ring Alarm</InputLabel>
            <Select
              label="Ring Alarm"
              fullWidth
              value={formData.Reminder_Text || "15 minutes before"}
              onChange={(e) =>
                handleInputChange("Reminder_Text", e.target.value)
              }
            >
              <MenuItem value="None">None</MenuItem>
              <MenuItem value="At time of meeting">At time of meeting</MenuItem>
              <MenuItem value="5 minutes before">5 minutes</MenuItem>
              <MenuItem value="10 minutes before">10 minutes</MenuItem>
              <MenuItem value="15 minutes before">15 minutes</MenuItem>
              <MenuItem value="30 minutes before">30 minutes</MenuItem>
              <MenuItem value="60 minutes before">1 hour</MenuItem>
              <MenuItem value="120 minutes before">2 hours</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={6}>
          <CustomTextField
            fullWidth
            size="small"
            placeholder="Location"
            variant="outlined"
            value={formData.Venue} // Use formData
            onChange={(e) => handleInputChange("Venue", e.target.value)}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default FirstComponent;
