import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  ListItemText,
  Modal,
  Box,
  TextField,
  FormControlLabel,
} from "@mui/material";
import ClearActivityModal from "./ClearActivityModal";
import EditActivityModal from "./EditActivityModal";
import CreateActivityModal from "./CreateActivityModal";

// Function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Custom TableCell component for conditional styling
const CustomTableCell = ({
  children,
  selectedRowIndex,
  index,
  row,
  highlightedRow,
  ...props
}) => {
  return (
    <TableCell
      sx={{
        color:
          highlightedRow === row.id
            ? "#FFFFFF"
            : selectedRowIndex === row.id
            ? "#FFFFFF"
            : row?.color || "black",
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

// // Function to create table data
// function createData(event, type) {
//   let startDateTime, endDateTime, time, duration, scheduledFor;

//   try {
//     startDateTime = event.Start_DateTime
//       ? new Date(event.Start_DateTime)
//       : new Date();
//     endDateTime = event.End_DateTime ? new Date(event.End_DateTime) : new Date();
//     time = startDateTime.toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//     duration = `${Math.round((endDateTime - startDateTime) / 60000)} minutes`;
//     scheduledFor = event.Owner ? event.Owner.name : "Unknown";
//   } catch (err) {
//     console.error("Error processing event data", err);
//   }

//   const date = startDateTime ? startDateTime.toLocaleDateString() : "N/A";
//   const priority = event.Event_Priority || "Low";
//   const regarding = event.Regarding || "No Data";
//   const associateWith = event.What_Id ? event.What_Id.name : "None";
//   const id = event.id;
//   const title = event.Event_Title || "Untitled Event";
//   const participants = event.Participants || [];
//   const color = event.Colour || "black";
//   const Event_Status = event.Event_Status || "";
//   return {
//     title,
//     type,
//     date,
//     time,
//     priority,
//     scheduledFor,
//     participants,
//     regarding,
//     duration,
//     associateWith,
//     id,
//     color,
//     Event_Status,
//   };
// }

function createData(event, type) {
  const startDateTime = event.Start_DateTime
    ? new Date(event.Start_DateTime)
    : new Date();
  const endDateTime = event.End_DateTime
    ? new Date(event.End_DateTime)
    : new Date();
  const time = startDateTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const duration = event.Duration_Min ? `${event.Duration_Min} minutes` : " - "
    // startDateTime && endDateTime
    //   ? `${Math.round((endDateTime - startDateTime) / 60000)} minutes`
    //   : "Unknown duration";

  // ScheduledFor field handling
  const scheduledFor =
    event.Owner?.name || event.scheduleFor?.full_name || "Unknown";

  // AssociateWith field handling
  // let associateWith = "";
  const associateWith = event.What_Id?.name || event.associateWith?.Account_Name || "None";

  // if(event.associateWith !== null){
  //   associateWith = event.associateWith?.Account_Name;
  // }

  // Participants field handling
  const participants = event.Participants || event.scheduledWith || [];

  const title = event.Event_Title || "Untitled Event";
  const color = event.Colour || "black";
  const Event_Status = event.Event_Status || "";

  return {
    title,
    type,
    date: startDateTime.toLocaleDateString(),
    time,
    priority: event.Event_Priority || "Low",
    scheduledFor,
    participants,
    regarding: event.Regarding || "No Data",
    duration,
    associateWith,
    id: event.id || "No ID",
    color,
    Event_Status,
  };
}

// Custom Range Modal Component
const CustomRangeModal = ({ open, handleClose, setCustomDateRange }) => {
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const handleSearch = () => {
    setCustomDateRange({ startDate, endDate });
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <h2>Select Date Range</h2>
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{ marginBottom: 2 }}
        />
        <TextField
          label="End Date"
          type="date"
          fullWidth
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <Grid container spacing={2} sx={{ marginTop: 2 }}>
          <Grid item xs={6}>
            <Button variant="outlined" fullWidth onClick={handleClose}>
              Cancel
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button variant="contained" fullWidth onClick={handleSearch}>
              Search
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
};

// Main ScheduleTable component
export default function ScheduleTable({
  events = [],
  ZOHO,
  users = [],
  filterDate,
  setFilterDate,
  loggedInUser,
  setEvents,
  customDateRange,
  setCustomDateRange,
}) {
  const [selectedRowIndex, setSelectedRowIndex] = React.useState(null);
  const [highlightedRow, setHighlightedRow] = React.useState(null);
  const [openClearModal, setOpenClearModal] = React.useState(false);
  const [openEditModal, setOpenEditModal] = React.useState(false);
  const [selectedRowData, setSelectedRowData] = React.useState(null);
  const [openCreateModal, setOpenCreateModal] = React.useState(false);
  const [openCustomRangeModal, setOpenCustomRangeModal] = React.useState(false);

  const [filterType, setFilterType] = React.useState([]);
  const [filterPriority, setFilterPriority] = React.useState([]);
  const [filterUser, setFilterUser] = React.useState([]);

  const [showCleared, setShowCleared] = React.useState(false); // State for "Cleared" checkbox

  const filterDateOptions = [
    { label: "Default", value: "All" },
    { label: "Last 7 Days", value: "Last 7 Days" },
    { label: "Last 30 Days", value: "Last 30 Days" },
    { label: "Last 90 Days", value: "Last 90 Days" },
    { label: "Current Week", value: "Current Week" },
    { label: "Current Month", value: "Current Month" },
    { label: "Next Week", value: "Next Week" },
    { label: "Custom Range", value: "Custom Range" }, // New custom range option
  ];

  const typeOptions = [
    "Meeting",
    "To-Do",
    "Call",
    "Appointment",
    "Boardroom",
    "Call Billing",
    "Email Billing",
    "Initial Consultation",
    "Mail",
    "Meeting Billing",
    "Personal Activity",
    "Room 1",
    "Room 2",
    "Room 3",
    "Todo Billing",
    "Vacation",
  ];

  const priorityOptions = ["Low", "Medium", "High"];

  const handleTypeChange = (event) => {
    const value = event.target.value;
    setFilterType(typeof value === "string" ? value.split(",") : value);
  };

  const handlePriorityChange = (event) => {
    const value = event.target.value;
    setFilterPriority(typeof value === "string" ? value.split(",") : value);
  };

  const handleUserChange = (event) => {
    const value = event.target.value;
    setFilterUser(typeof value === "string" ? value.split(",") : value);
  };

  const handleClearFilters = () => {
    setFilterDate("All");
    setFilterType([]);
    setFilterPriority([]);
    setFilterUser([]);
    setCustomDateRange(null);
  };

  const rows = Array.isArray(events)
    ? events.map((event) =>
        createData(event, event.Type_of_Activity || "Other")
      )
    : [];

  // Filter rows based on selected filters and "Cleared" checkbox
  const filteredRows = React.useMemo(() => {
    return rows
      .filter((row) => {
        const typeMatch =
          filterType.length === 0 || filterType.includes(row.type);
        const priorityMatch =
          filterPriority.length === 0 || filterPriority.includes(row.priority);
        const userMatch =
          filterUser.length === 0 ||
          filterUser.some((user) => row.scheduledFor.includes(user));
        const dateMatch =
          !customDateRange ||
          (new Date(row.date) >= new Date(customDateRange.startDate) &&
            new Date(row.date) <= new Date(customDateRange.endDate));
        const clearedMatch = !showCleared || row.Event_Status === "Closed";

        return (
          typeMatch && priorityMatch && userMatch && dateMatch && clearedMatch
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [
    events,
    rows,
    filterType,
    filterPriority,
    filterUser,
    customDateRange,
    showCleared, // Include "Cleared" checkbox state in dependencies
  ]);

  // Checkbox handler
  const handleClearedCheckboxChange = (event) => {
    setShowCleared(event.target.checked);
  };

  const handleDateFilterChange = (e) => {
    const value = e.target.value;
    setFilterDate(value);
    if (value === "Custom Range") {
      setOpenCustomRangeModal(true);
    }
  };

  const handleClose = () => {
    setOpenClearModal(false);
    setOpenEditModal(false);
    setOpenCreateModal(false);
    setOpenCustomRangeModal(false);
  };

  const handleRowClick = (row) => {
    if (highlightedRow === row.id) {
      setHighlightedRow(null); // Unhighlight if clicked again
      setSelectedRowIndex(null);
    } else {
      setHighlightedRow(row.id); // Highlight the new row and reset any previously highlighted rows
      setSelectedRowIndex(row.id);
    }
    setSelectedRowData(row);
  };

  const handleRowDoubleClick = async (row) => {
    setHighlightedRow(row.id); // Highlight the new row and reset any previously highlighted rows
    setSelectedRowIndex(row.id);
    if (row?.id) {
      try {
        const response = await ZOHO.CRM.API.getRecord({
          Entity: "Events",
          approved: "both",
          RecordID: row.id,
        });

        if (response && response.data) {
          setSelectedRowData(response.data[0]);
        }
        setOpenEditModal(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
  };

  const handleCheckboxChange = (index, row) => {
    setHighlightedRow(row.id); // Highlight the new row and reset any previously highlighted rows
    setSelectedRowIndex(row.id);
    if (row?.id) {
      async function getData() {
        try {
          const response = await ZOHO.CRM.API.getRecord({
            Entity: "Events",
            approved: "both",
            RecordID: row.id,
          });

          if (response && response.data) {
            setSelectedRowData(response.data[0]);
          }
          setOpenClearModal(true);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
      getData();
      return;
    }
    setSelectedRowData(row);
    setOpenClearModal(true);
  };

  const updateEvent = (updatedEvent) => {
    setEvents((prevEvents) => {
      const updatedEvents = prevEvents.map((event) =>
        event.id === updatedEvent.id
          ? {
              ...event,
              ...updatedEvent,
              Start_DateTime: updatedEvent.Start_DateTime,
              End_DateTime: updatedEvent.End_DateTime,
              Event_Priority: updatedEvent.Event_Priority,
              Description: updatedEvent.Description,
              Duration_Min: updatedEvent.Duration_Min,
              // Add other fields as needed
            }
          : event
      );
      return [...updatedEvents]; // Return a new array reference to ensure re-rendering
    });
  };

  console.log({ events, filteredRows });

  return (
    <>
      {/* Filters */}
      <Grid
        container
        spacing={2}
        style={{
          marginTop: 20,
          marginBottom: 20,
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "white",
          overflowY: "hidden",
        }}
      >
        <Grid item xs={2}>
          <FormControl fullWidth>
            <InputLabel>Date</InputLabel>
            <Select
              value={filterDate}
              onChange={handleDateFilterChange}
              label="Date"
              size="small"
            >
              {filterDateOptions.map((option, index) => (
                <MenuItem key={index} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {/* Other filter controls */}
        <Grid item xs={2}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              multiple
              value={filterType}
              onChange={handleTypeChange}
              label="Type"
              size="small"
              renderValue={(selected) => selected.join(", ")}
            >
              {typeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={filterType.indexOf(type) > -1} />
                  <ListItemText primary={type} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={2}>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              multiple
              value={filterPriority}
              onChange={handlePriorityChange}
              label="Priority"
              size="small"
              renderValue={(selected) => selected.join(", ")}
            >
              {priorityOptions.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  <Checkbox checked={filterPriority.indexOf(priority) > -1} />
                  <ListItemText primary={priority} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={1}>
          <FormControl fullWidth>
            <InputLabel>User</InputLabel>
            <Select
              multiple
              value={filterUser}
              onChange={handleUserChange}
              label="User"
              size="small"
              renderValue={(selected) => selected.join(", ")}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.full_name}>
                  <Checkbox checked={filterUser.indexOf(user.full_name) > -1} />
                  <ListItemText primary={user.full_name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={2} sx={{ display: "flex" }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleClearFilters}
            color="secondary"
          >
            Clear filter
          </Button>
        </Grid>
        <Grid item xs={1} sx={{ display: "flex" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showCleared} // Bind to state
                onChange={handleClearedCheckboxChange} // Checkbox change handler
              />
            }
            label="Cleared"
          />
        </Grid>

        <Grid item xs={2}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setOpenCreateModal(true)}
          >
            Create New Event
          </Button>
        </Grid>
      </Grid>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "100vh", overflowY: "auto" }}
      >
        <Table stickyHeader sx={{ minWidth: 650 }} aria-label="schedule table">
          <TableHead>
            <TableRow>
              <TableCell
                padding="checkbox"
                sx={{ bgcolor: "#efefef", fontWeight: "bold" }}
              >
                Select
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Title
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Type
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Date
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Time
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Priority
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Scheduled For
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Scheduled With
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Regarding
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Duration
              </TableCell>
              <TableCell sx={{ bgcolor: "#efefef", fontWeight: "bold" }}>
                Associate With
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{
                    backgroundColor:
                      highlightedRow === row.id ||
                      (selectedRowIndex === row.id && openClearModal)
                        ? "#0072DC"
                        : index % 2 === 0
                        ? "white"
                        : "#f9f9f9",
                    color:
                      highlightedRow === row.id ||
                      (selectedRowIndex === row.id && openClearModal)
                        ? "#FFFFFF"
                        : "black",
                    position: "relative",
                    textDecoration:
                      row.Event_Status === "Closed" ? "line-through" : "none",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRowClick(row)}
                  onDoubleClick={() => handleRowDoubleClick(row)}
                >
                  <TableCell
                    padding="checkbox"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedRowIndex === index && openClearModal}
                      onChange={() => handleCheckboxChange(index, row)}
                      sx={{
                        color: selectedRowIndex === index ? "#fff" : "inherit",
                      }}
                    />
                  </TableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.title}
                  </CustomTableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.type}
                  </CustomTableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {formatDate(row.date)}
                  </CustomTableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.time}
                  </CustomTableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.priority}
                  </CustomTableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.scheduledFor}
                  </CustomTableCell>
                  <TableCell>
                    {row.participants.length > 0
                      ? row.participants.map((participant, i) => (
                          <React.Fragment key={i}>
                            <a
                              href={`https://crm.zoho.com.au/crm/org7004396182/tab/Contacts/${participant.participant}/canvas/76775000000287551`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color:
                                  selectedRowIndex === row.id
                                    ? "#fff"
                                    : "#0072DC",
                                textDecoration: "underline",
                              }}
                            >
                              {participant.name || participant.Full_Name}
                            </a>
                            {i < row.participants.length - 1 && ", "}
                          </React.Fragment>
                        ))
                      : "No Participants"}
                  </TableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.regarding}
                  </CustomTableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.duration}
                  </CustomTableCell>
                  <CustomTableCell
                    selectedRowIndex={selectedRowIndex}
                    index={index}
                    row={row}
                    highlightedRow={highlightedRow}
                  >
                    {row.associateWith}
                  </CustomTableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modals */}
      {openClearModal && (
        <ClearActivityModal
          open={openClearModal}
          handleClose={handleClose}
          selectedRowData={selectedRowData}
          ZOHO={ZOHO}
          users={users}
          setEvents={setEvents}
        />
      )}

      {openEditModal && (
        <EditActivityModal
          open={openEditModal}
          handleClose={handleClose}
          selectedRowData={selectedRowData}
          ZOHO={ZOHO}
          users={users}
          updateEvent={updateEvent}
          setEvents={setEvents}
        />
      )}

      {openCreateModal && (
        <CreateActivityModal
          open={openCreateModal}
          handleClose={handleClose}
          ZOHO={ZOHO}
          users={users}
          loggedInUser={loggedInUser}
          setEvents={setEvents}
          setSelectedRowIndex={setSelectedRowIndex}
          setHighlightedRow={setHighlightedRow}
        />
      )}

      <CustomRangeModal
        open={openCustomRangeModal}
        handleClose={handleClose}
        setCustomDateRange={setCustomDateRange}
      />
    </>
  );
}
