import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Button,
  Autocomplete,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

const getContactName = (contact) =>
  contact.Full_Name ||
  contact.name ||
  `${contact.First_Name || ""} ${contact.Last_Name || ""}`.trim() ||
  "contact";

const normalizeParticipant = (participant) => {
  const id = participant.id || participant.participant || null;

  return {
    ...participant,
    id,
    participant: id,
    Full_Name: getContactName(participant),
    type: participant.type || "contact",
  };
};

const getInitialParticipants = (formData, selectedRowData) => {
  const participants = formData?.scheduledWith?.length
    ? formData.scheduledWith
    : selectedRowData?.Participants || [];

  return participants.map(normalizeParticipant);
};

export default function ContactField({
  formData,
  handleInputChange,
  ZOHO,
  selectedRowData,
}) {
  const [selectedParticipants, setSelectedParticipants] = useState(
    () => getInitialParticipants(formData, selectedRowData)
  );
  const [draftParticipants, setDraftParticipants] = useState(
    () => getInitialParticipants(formData, selectedRowData)
  );
  const [searchType, setSearchType] = useState("First_Name");
  const [searchText, setSearchText] = useState("");
  const [filteredContacts, setFilteredContacts] = useState(
    () => getInitialParticipants(formData, selectedRowData)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleInputChangeRef = useRef(handleInputChange);
  const participantLoadStarted = useRef(false);
  const participantLoadVersion = useRef(0);

  const commonTextStyles = {
    fontSize: "9pt", // Uniform font size
    "& .MuiOutlinedInput-input": { fontSize: "9pt" }, // Input text
    "& .MuiInputBase-input": { fontSize: "9pt" }, // Base input text
    "& .MuiTypography-root": { fontSize: "9pt" }, // Typography text
    "& .MuiFormLabel-root": { fontSize: "9pt" }, // Form labels
  };

  const [participantsLoaded, setParticipantsLoaded] = useState(false);

  useEffect(() => {
    handleInputChangeRef.current = handleInputChange;
  }, [handleInputChange]);

  useEffect(() => {
    const fetchParticipantsDetails = async () => {
      const participantsToLoad = selectedRowData?.Participants || [];

      if (
        !participantsLoaded &&
        !participantLoadStarted.current &&
        participantsToLoad.length > 0 &&
        ZOHO
      ) {
        participantLoadStarted.current = true;
        const loadVersion = participantLoadVersion.current;
        const participants = await Promise.all(
          participantsToLoad.map(async (participant) => {
            const recordId = participant.participant || participant.id;

            if (!recordId) {
              // No valid ID to fetch, return basic info
              return {
                id: null,
                Full_Name: getContactName(participant),
                Email: participant.Email || "No Email",
                type: "contact", // Default type to "contact"
              };
            }

            try {
              const contactDetails = await ZOHO.CRM.API.getRecord({
                Entity: "Contacts",
                RecordID: recordId,
              });

              if (contactDetails.data && contactDetails.data.length > 0) {
                const contact = contactDetails.data[0];
                return {
                  id: contact.id,
                  First_Name: contact.First_Name || "N/A",
                  Last_Name: contact.Last_Name || "N/A",
                  Email: contact.Email || "No Email",
                  Mobile: contact.Mobile || "N/A",
                  Full_Name: `${contact.First_Name || "N/A"} ${contact.Last_Name || "N/A"}`,
                  ID_Number: contact.ID_Number || "N/A",
                  type: "contact", // Default type to "contact"
                  participant: contact.id
                };
              } else {
                return {
                  id: recordId,
                  Full_Name: getContactName(participant),
                  Email: participant.Email || "No Email",
                  type: "contact", // Default type to "contact"
                  participant: recordId
                };
              }
            } catch (error) {
              console.error(`Error fetching contact details for ID ${recordId}:`, error);
              return {
                id: recordId,
                Full_Name: getContactName(participant),
                Email: participant.Email || "No Email",
                type: "contact", // Default type to "contact"
                participant: recordId
              };
            }
          })
        );

        if (participantLoadVersion.current !== loadVersion) return;

        setSelectedParticipants(participants);
        setDraftParticipants(participants);
        handleInputChangeRef.current("scheduledWith", participants);
        setParticipantsLoaded(true); // prevent future fetches
      }
    };

    fetchParticipantsDetails();
  }, [
    participantsLoaded,
    selectedRowData?.Participants,
    ZOHO,
  ]);


  const handleOpen = () => {
    setFilteredContacts([]);
    setDraftParticipants(selectedParticipants);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setDraftParticipants(selectedParticipants);
    setIsModalOpen(false);
  };

  const handleSearch = async () => {
    if (!ZOHO || !searchText.trim()) return;

    try {
      let searchResults;
      if (searchType === "Email") {
        searchResults = await ZOHO.CRM.API.searchRecord({
          Entity: "Contacts",
          Type: "email",
          Query: searchText.trim(),
        });
      } else if (searchType === "Mobile") {
        searchResults = await ZOHO.CRM.API.searchRecord({
          Entity: "Contacts",
          Type: "criteria",
          Query: `(Mobile:equals:${searchText.trim()})`,
        });
      } else if (searchType === "ID_Number") {
        searchResults = await ZOHO.CRM.API.searchRecord({
          Entity: "Contacts",
          Type: "criteria",
          Query: `(ID_Number:equals:${searchText.trim()})`,
        });
      } else if (searchType === "Full_Name") {
        searchResults = await ZOHO.CRM.API.searchRecord({
          Entity: "Contacts",
          Type: "word",
          Query: searchText.trim(),
        });
      } else {
        searchResults = await ZOHO.CRM.API.searchRecord({
          Entity: "Contacts",
          Type: "criteria",
          Query: `(${searchType}:equals:${searchText.trim()})`,
        });
      }

      if (searchResults.data && searchResults.data.length > 0) {
        const formattedContacts = searchResults.data.map((contact) => ({
          First_Name: contact.First_Name || "N/A",
          Last_Name: contact.Last_Name || "N/A",
          Email: contact.Email || "No Email",
          Mobile: contact.Mobile || "N/A",
          ID_Number: contact.ID_Number || "N/A",
          id: contact.id,
          Staff_Type: contact.Staff_Type,
        }));
        setFilteredContacts(formattedContacts);
      } else {
        setFilteredContacts([]);
      }
    } catch (error) {
      console.error("Error during search:", error);
      setFilteredContacts([]);
    }
  };

  const toggleContactSelection = (contact) => {
    setDraftParticipants((prev) =>
      prev.some((c) => c.id === contact.id)
        ? prev.filter((c) => c.id !== contact.id)
        : [...prev, contact]
    );
  };

  const handleOk = () => {
    participantLoadVersion.current += 1;
    const updatedParticipants = draftParticipants.map((participant) => ({
      Full_Name: getContactName(participant),
      Email: participant.Email,
      participant: participant.id,
      type: "contact",
    }));

    setSelectedParticipants(draftParticipants);
    handleInputChange("scheduledWith", updatedParticipants);
    setIsModalOpen(false);
  };

  const [staffUsers, setStaffUsers] = useState([]);

  useEffect(() => {
    const fetchStaffUsers = async () => {
      if (searchType === "Staff" && ZOHO) {
        try {
          const contacts = [];
          let page = 1;
          let response;

          // ponytail: Zoho Search caps at 2,000; switch to COQL if staff exceeds that.
          do {
            response = await ZOHO.CRM.API.searchRecord({
              Entity: "Contacts",
              Type: "criteria",
              Query: "(Staff_Type:equals:Active)",
              page,
              per_page: 200,
            });
            contacts.push(
              ...(response?.data || []).filter(
                (contact) =>
                  contact.Staff_Type === "Active" ||
                  contact.Staff_Type === "Staff"
              )
            );
            page += 1;
          } while (response?.info?.more_records && page <= 10);

          setStaffUsers(contacts);
        } catch (error) {
          console.error("Error fetching staff users:", error);
          setStaffUsers([]);
        }
      }
    };

    fetchStaffUsers();
  }, [searchType, ZOHO]);

  const contactPicker =
    isModalOpen &&
    createPortal(
      <Box
        onClick={handleCancel}
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          bgcolor: "rgba(0, 0, 0, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Box
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-picker-title"
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: "100%",
            maxWidth: 820,
            maxHeight: "85vh",
            overflowY: "auto",
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 2.5,
          }}
        >
          <Typography
            id="contact-picker-title"
            variant="subtitle1"
            sx={{ fontWeight: "bold", mb: 2, fontSize: "11pt" }}
          >
            Select Contacts
          </Typography>

          <Box display="flex" gap={2} mb={2}>
            <TextField
              select
              label="Search By"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              fullWidth
              size="small"
              SelectProps={{
                MenuProps: {
                  disableScrollLock: true,
                  sx: { zIndex: 2001 },
                },
              }}
              sx={{
                ...commonTextStyles,
                "& .MuiOutlinedInput-root": {
                  padding: "0rem",
                  lineHeight: "1.5",
                },
                "& .MuiSelect-select": {
                  display: "flex",
                  alignItems: "center",
                },
              }}
            >
              <MenuItem value="First_Name" sx={{ fontSize: "9pt" }}>
                First Name
              </MenuItem>
              <MenuItem value="Last_Name" sx={{ fontSize: "9pt" }}>
                Last Name
              </MenuItem>
              <MenuItem value="Email" sx={{ fontSize: "9pt" }}>
                Email
              </MenuItem>
              <MenuItem value="Mobile" sx={{ fontSize: "9pt" }}>
                Mobile
              </MenuItem>
              <MenuItem value="ID_Number" sx={{ fontSize: "9pt" }}>
                MS File Number
              </MenuItem>
              <MenuItem value="Staff" sx={{ fontSize: "9pt" }}>
                Staff
              </MenuItem>
            </TextField>

            {searchType === "Staff" ? (
              <Autocomplete
                multiple
                disableCloseOnSelect
                filterSelectedOptions
                openOnFocus
                options={staffUsers}
                value={staffUsers.filter((staff) =>
                  draftParticipants.some(
                    (contact) =>
                      (contact.id || contact.participant) === staff.id
                  )
                )}
                getOptionLabel={getContactName}
                isOptionEqualToValue={(option, value) =>
                  option.id === (value.id || value.participant)
                }
                onChange={(event, selectedStaff) => {
                  const staffIds = new Set(
                    staffUsers.map((contact) => contact.id)
                  );
                  setDraftParticipants((contacts) => [
                    ...contacts.filter(
                      (contact) =>
                        !staffIds.has(contact.id || contact.participant)
                    ),
                    ...selectedStaff,
                  ]);
                }}
                noOptionsText="No staff contacts found"
                fullWidth
                size="small"
                slotProps={{ popper: { sx: { zIndex: 2001 } } }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Text"
                    placeholder="Select staff"
                    sx={{
                      ...commonTextStyles,
                      "& .MuiOutlinedInput-root": {
                        padding: "0rem",
                        lineHeight: "1.5",
                      },
                    }}
                  />
                )}
              />
            ) : (
              <TextField
                label="Search Text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                fullWidth
                size="small"
                sx={{
                  ...commonTextStyles,
                  "& .MuiOutlinedInput-root": {
                    padding: "0rem",
                    lineHeight: "1.5",
                  },
                }}
              />
            )}

            {searchType !== "Staff" && (
              <Button
                variant="contained"
                onClick={handleSearch}
                sx={{ width: "150px", flexShrink: 0, ...commonTextStyles }}
              >
                Search
              </Button>
            )}
          </Box>

          <TableContainer
            sx={{
              maxHeight: 280,
              overflowY: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed", fontSize: "9pt" }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{ fontWeight: "bold", width: "5%" }}
                  ></TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>First Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Last Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold", width: "30%" }}>
                    Email
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Mobile</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    MS File Number
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(searchType === "Staff" ? staffUsers : filteredContacts)
                  .length > 0 ? (
                  (searchType === "Staff" ? staffUsers : filteredContacts).map(
                    (contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox
                            checked={draftParticipants.some(
                              (c) => c.id === contact.id
                            )}
                            onChange={() => toggleContactSelection(contact)}
                            inputProps={{
                              "aria-label": `Select ${getContactName(contact)}`,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {(contact.Staff_Type === "Active" ||
                              contact.Staff_Type === "Staff") && (
                              <PersonIcon
                                fontSize="small"
                                style={{ marginRight: 4 }}
                              />
                            )}
                            {contact.First_Name}
                          </div>
                        </TableCell>
                        <TableCell>{contact.Last_Name}</TableCell>
                        <TableCell>{contact.Email}</TableCell>
                        <TableCell>{contact.Mobile}</TableCell>
                        <TableCell>{contact.ID_Number}</TableCell>
                      </TableRow>
                    )
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No data found. Please try another search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={3}>
            <Typography variant="h6" sx={{ ...commonTextStyles, mb: 1 }}>
              Selected Contacts:
            </Typography>
            <TableContainer
              sx={{
                maxHeight: 180,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Table
                size="small"
                sx={{ tableLayout: "fixed", fontSize: "9pt" }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: "bold", width: "5%" }}
                    ></TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      First Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Last Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold", width: "30%" }}>
                      Email
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Mobile</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      MS File Number
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {draftParticipants.length > 0 ? (
                    draftParticipants.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox
                            checked
                            onChange={() => toggleContactSelection(contact)}
                            inputProps={{
                              "aria-label": `Remove ${getContactName(contact)}`,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {(contact.Staff_Type === "Active" ||
                              contact.Staff_Type === "Staff") && (
                              <PersonIcon
                                fontSize="small"
                                style={{ marginRight: 4 }}
                              />
                            )}
                            {contact.First_Name}
                          </div>
                        </TableCell>
                        <TableCell>{contact.Last_Name}</TableCell>
                        <TableCell>{contact.Email}</TableCell>
                        <TableCell>{contact.Mobile}</TableCell>
                        <TableCell>{contact.ID_Number}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No contacts selected.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box display="flex" justifyContent="flex-end" gap={1} mt={2.5}>
            <Button
              onClick={handleCancel}
              variant="outlined"
              sx={commonTextStyles}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOk}
              variant="contained"
              color="primary"
              disabled={draftParticipants.length === 0}
              sx={commonTextStyles}
            >
              OK
            </Button>
          </Box>
        </Box>
      </Box>,
      document.body
    );

  return (
    <>
      <Box display="flex" alignItems="center" gap={2}>
        <TextField
          fullWidth
          value={selectedParticipants
            .map(getContactName)
            .join(", ")}
          variant="outlined"
          placeholder="Selected contacts"
          InputProps={{
            readOnly: true,
          }}
          size="small"
          sx={commonTextStyles}
        />
        <Button
          variant="contained"
          onClick={handleOpen}
          sx={{ width: "100px", ...commonTextStyles }}
        >
          Contacts
        </Button>
      </Box>

      {contactPicker || null}
    </>
  );
}
