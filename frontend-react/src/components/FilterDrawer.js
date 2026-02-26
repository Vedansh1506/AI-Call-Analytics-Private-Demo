import React from "react";
import {
  Drawer,
  Box,
  Typography,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const FilterDrawer = ({
  open,
  onClose,
  onApply,
  filters,
  setFilters,
  supportedLanguages,
}) => {

  const handleClearAll = () => {
  const cleared = {
    search: "",
    language: [],
    sentiment: [],
    min_duration: 0,
    max_duration: 7200,
    from_date: null,
    to_date: null,
    sort_by: "created_date_time",
    order: "desc",
  };

  setFilters(cleared);
  onApply(cleared);   // apply immediately
};


  const toggleArrayValue = (key, value) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    setFilters({ ...filters, [key]: updated });
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: "100vw", sm: 520 },
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6">Filters</Typography>
          <Button color="error" size="medium" onClick={handleClearAll}>
            Clear All
          </Button>
        </Box>


        {/* Sort
        <Box>
          <Typography fontWeight={600}>Sort</Typography>
          <Button
            onClick={() =>
              setFilters({
                ...filters,
                order: filters.order === "asc" ? "desc" : "asc",
              })
            }
          >
            {filters.order === "asc" ? "↑ Ascending" : "↓ Descending"}
          </Button>
        </Box> */}

        {/* Languages */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Languages</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {supportedLanguages.map((lang) => (
                <FormControlLabel
                  key={lang.code}
                  control={
                    <Checkbox
                      checked={filters.language.includes(lang.name)}
                      onChange={() =>
                        toggleArrayValue("language", lang.name)
                      }
                    />
                  }
                  label={lang.name}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Sentiment */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>Sentiment</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {["Positive", "Neutral", "Negative"].map((s) => (
              <FormControlLabel
                key={s}
                control={
                  <Checkbox
                    checked={filters.sentiment.includes(s)}
                    onChange={() => toggleArrayValue("sentiment", s)}
                  />
                }
                label={s}
              />
            ))}
          </AccordionDetails>
        </Accordion>

        {/* Duration */}
        <Box>
          <Typography fontWeight={600}>Duration (seconds)</Typography>

          <Slider
            value={[filters.min_duration, filters.max_duration]}
            min={0}
            max={7200}
            onChange={(e, val) =>
              setFilters({
                ...filters,
                min_duration: val[0],
                max_duration: val[1],
              })
            }
            valueLabelDisplay="auto"
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Min"
              size="small"
              fullWidth
              value={filters.min_duration}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  min_duration: Number(e.target.value) || 0,
                })
              }
            />
            <TextField
              label="Max"
              size="small"
              fullWidth
              value={filters.max_duration}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  max_duration: Number(e.target.value) || 0,
                })
              }
            />
          </Box>
        </Box>

        {/* Date Range */}
        <Box>
          <Typography fontWeight={600} mb={1}>
            Date Range
          </Typography>

          <Box
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            backgroundColor: "#ffffff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 2,
            width:"100%"
          }}
        >

            <DateRangePicker
              months={1}
              direction="horizontal"
              ranges={[
                {
                  startDate: filters.from_date || new Date(),
                  endDate: filters.to_date || new Date(),
                  key: "selection",
                },
              ]}
              onChange={(item) =>
                setFilters({
                  ...filters,
                  from_date: item.selection.startDate,
                  to_date: item.selection.endDate,
                })
              }
              maxDate={new Date()}
              showDateDisplay={false}
              showSelectionPreview={true}
              moveRangeOnFirstSelection={false}
              staticRanges={[]}
              inputRanges={[]}
              rangeColors={["#6366f1"]}
            />
          </Box>
        </Box>

        {/* Apply */}
        <Box
  sx={{
    position: "sticky",
    bottom: 0,
    zIndex: 2,
  }}
>

  <Button
    variant="contained"
    size="large"
    fullWidth
    onClick={() => onApply(filters)}

  >
    Apply Filters
  </Button>
</Box>

      </Box>
    </Drawer>
  );
};

export default FilterDrawer;
