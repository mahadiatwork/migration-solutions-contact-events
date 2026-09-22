import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
} from "@mui/material";
import { getRegardingOptionsFromConfig } from "../../services/picklistConfigService";

const RegardingField = ({ formData, handleInputChange, picklistConfig }) => {
  const existingValue = formData?.Regarding || "";
  const predefinedOptions = React.useMemo(
    () =>
      getRegardingOptionsFromConfig(
        formData?.Type_of_Activity,
        picklistConfig
      ),
    [formData?.Type_of_Activity, picklistConfig]
  );

  const [selectedValue, setSelectedValue] = useState(existingValue);
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    if (!existingValue) {
      setSelectedValue("");
      setManualInput("");
    } else if (predefinedOptions.includes(existingValue)) {
      setSelectedValue(existingValue);
      setManualInput("");
    } else {
      setSelectedValue("Other");
      setManualInput(existingValue);
    }
    // Resync only when the option set changes. During manual entry the parent
    // value changes on each keystroke and must not collapse the "Other" field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData?.Type_of_Activity, picklistConfig, predefinedOptions]);

  const handleSelectChange = (event) => {
    const value = event.target.value;
    setSelectedValue(value);
    if (value === "Other") {
      setManualInput("");
      handleInputChange("Regarding", "Other");
    } else {
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
