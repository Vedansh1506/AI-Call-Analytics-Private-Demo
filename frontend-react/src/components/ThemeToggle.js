import React from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { useThemeContext } from "../context/ThemeContext";

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useThemeContext();

  return (
    <Box
      onClick={toggleTheme}
      sx={{
        width: 70,
        height: 34,
        borderRadius: 20,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: "4px",
        background: isDark
          ? "linear-gradient(135deg,#111827,#1f2937)"
          : "linear-gradient(135deg,#e5e7eb,#f9fafb)",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2)",
        position: "relative",
      }}
    >
      {/* Knob */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: isDark
            ? "linear-gradient(135deg,#111827,#000)"
            : "linear-gradient(135deg,#fff,#ddd)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
        animate={{
          x: isDark ? 34 : 0,
        }}
      />

      {/* Icons */}
      <Box
        sx={{
          position: "absolute",
          left: 10,
          fontSize: 14,
          opacity: isDark ? 0.4 : 1,
        }}
      >
        ☀️
      </Box>

      <Box
        sx={{
          position: "absolute",
          right: 10,
          fontSize: 14,
          opacity: isDark ? 1 : 0.4,
        }}
      >
        🌙
      </Box>
    </Box>
  );
};

export default ThemeToggle;
