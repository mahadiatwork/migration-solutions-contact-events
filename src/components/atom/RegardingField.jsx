import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
} from "@mui/material";
import {
  getRegardingOptions,
  isManualOtherEnabled,
} from "../../services/picklistConfigService.js";

const RegardingField = ({
  formData,
  handleInputChange,
  selectedRowData,
  picklistConfig,
  isEditMode,
}) => {
  const existingValue =
    formData.Regarding ?? selectedRowData?.Regarding ?? "";
  const predefinedOptions = getRegardingOptions(
    formData.Type_of_Activity,
    picklistConfig,
    existingValue,
    Boolean(isEditMode && selectedRowData)
  );
  const manualOtherEnabled = isManualOtherEnabled(
    formData.Type_of_Activity,
    picklistConfig
  );
  const displayedOptions = manualOtherEnabled
    ? predefinedOptions.filter((option) => option !== "Other")
    : predefinedOptions;

  const [selectedValue, setSelectedValue] = useState(existingValue);
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    if (existingValue && predefinedOptions.includes(existingValue)) {
      setSelectedValue(existingValue);
      setManualInput("");
    } else if (existingValue && manualOtherEnabled) {
      setSelectedValue("Other");
      setManualInput(existingValue);
    } else {
      setSelectedValue("");
      setManualInput("");
    }
    // Reinitialize only when the option set changes, not while typing manually.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.Type_of_Activity,
    selectedRowData?.id,
    picklistConfig,
  ]);

  const handleSelectChange = (event) => {
    const value = event.target.value;
    setSelectedValue(value);
    if (value !== "Other" || !manualOtherEnabled) {
      setManualInput(""); // Clear manual input if predefined option is selected
      handleInputChange("Regarding", value); // Pass the selected value to handleInputChange
    }
  };

  const handleManualInputChange = (event) => {
    const value = event.target.value;
    setManualInput(value);
    handleInputChange("Regarding", value); // Pass the manual input value to handleInputChange
  };

  return (
    <Box sx={{ width: "100%" }}>
      <FormControl fullWidth size="small">
        <InputLabel id="regarding-label" sx={{ top: "-5px" }}>
          Regarding
        </InputLabel>
        <Select
          labelId="regarding-label"
          id="regarding-select"
          label="Regarding"
          fullWidth
          size="small"
          value={selectedValue}
          onChange={handleSelectChange}
          sx={{
            "& .MuiOutlinedInput-root": {
              padding: 0, // Remove extra padding from the select input
            },
            "& .MuiInputBase-input": {
              display: "flex",
              alignItems: "center", // Vertically align the content
            },
          }}
        >
          {displayedOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
          {manualOtherEnabled && (
            <MenuItem value="Other">Other (Manually enter)</MenuItem>
          )}
        </Select>
      </FormControl>

      {selectedValue === "Other" && (
        <TextField
          label="Enter your custom regarding"
          fullWidth
          size="small"
          value={manualInput}
          onChange={handleManualInputChange}
          sx={{ mt: 2, "& .MuiOutlinedInput-root": { padding: 0 } }}
        />
      )}
    </Box>
  );
};

export default RegardingField;
