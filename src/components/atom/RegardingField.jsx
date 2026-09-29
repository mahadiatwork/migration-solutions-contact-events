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
  CUSTOM_REGARDING_LABEL,
  CUSTOM_REGARDING_OPTION,
  getPersistedRegardingValue,
  getRegardingOptions,
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
  const [selectedValue, setSelectedValue] = useState(existingValue);
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    if (existingValue && predefinedOptions.includes(existingValue)) {
      setSelectedValue(existingValue);
      setManualInput("");
    } else if (existingValue) {
      setSelectedValue(CUSTOM_REGARDING_OPTION);
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
    setManualInput("");
    handleInputChange("Regarding", getPersistedRegardingValue(value));
  };

  const handleManualInputChange = (event) => {
    const value = event.target.value;
    setManualInput(value);
    handleInputChange(
      "Regarding",
      getPersistedRegardingValue(CUSTOM_REGARDING_OPTION, value)
    );
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
          <MenuItem value={CUSTOM_REGARDING_OPTION}>
            {CUSTOM_REGARDING_LABEL}
          </MenuItem>
        </Select>
      </FormControl>

      {selectedValue === CUSTOM_REGARDING_OPTION && (
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
