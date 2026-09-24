import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
} from "@mui/material";

const RegardingField = ({ formData, handleInputChange }) => {
  const predefinedOptions = [
    "Hourly Consult $220",
    "Initial Consultation Fee $165",
    "No appointments today",
    "No appointments tonight",
  ]; // The predefined options

  const [selectedValue, setSelectedValue] = useState(formData.Regarding || "");
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    // Check if the selected value is part of the predefined options
    if (selectedValue && !predefinedOptions.includes(selectedValue)) {
      setSelectedValue("Other"); // Set to "Other" if it doesn't match any predefined option
      setManualInput(formData.Regarding); // Populate manual input with the custom value
    }
  }, [selectedValue, formData.Regarding]);

  const handleSelectChange = (event) => {
    const value = event.target.value;
    setSelectedValue(value);
    if (value !== "Other") {
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
          {predefinedOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
          <MenuItem value="Other">Other (Manually enter)</MenuItem>
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
