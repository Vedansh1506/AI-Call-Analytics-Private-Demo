import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  useTheme,
} from "@mui/material";
import { CloudUpload, InfoOutlined, Close } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { assetsAPI } from "../services/api";

const getFileKey = (file) =>
  `${file.name}-${file.size}-${file.lastModified ?? 0}`;

const Upload = () => {
  const theme = useTheme();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [constraints, setConstraints] = useState({
    max_files_per_request: 10,
    max_file_size_mb: 100,
    allowed_extensions: [".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm"],
    allowed_mime_types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm"],
  });

  const navigate = useNavigate();

  const orderedExtensions = React.useMemo(() => {
    const preferredOrder = [".m4a", ".mp3", ".mp4", ".ogg", ".wav", ".webm"];
    const extSet = new Set(constraints.allowed_extensions || []);
    const preferred = preferredOrder.filter((ext) => extSet.has(ext));
    const remaining = [...extSet].filter((ext) => !preferredOrder.includes(ext)).sort();
    return [...preferred, ...remaining];
  }, [constraints.allowed_extensions]);


  const fetchSupportedLanguages = async () => {
    try {
      const response = await assetsAPI.getSupportedLanguages();
      const langs = response.data.supported_languages;
      if (typeof langs === "object") {
        setSupportedLanguages(Object.values(langs));
      }
    } catch {
      console.error("Failed to fetch supported languages");
    }
  };

  const fetchUploadConstraints = async () => {
    try {
      const response = await assetsAPI.getUploadConstraints();
      setConstraints(response.data);
    } catch {
      console.error("Failed to fetch upload constraints");
    }
  };

  useEffect(() => {
    fetchSupportedLanguages();
    fetchUploadConstraints();
  }, []);


  const validateFiles = (selectedFiles) => {
    const valid = [];

    selectedFiles.forEach((file) => {
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      const isMimeAllowed = (constraints.allowed_mime_types || []).includes(file.type);
      const isExtAllowed = (constraints.allowed_extensions || []).includes(ext);

      if (!isMimeAllowed && !isExtAllowed) {
        setMessage(`Invalid file type: ${file.name}`);
        return;
      }

      const maxBytes = (constraints.max_file_size_mb || 100) * 1024 * 1024;
      if (file.size > maxBytes) {
        setMessage(`File too large: ${file.name}`);
        return;
      }

      valid.push(file);
    });

    return valid;
  };


  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => {
  const newFiles = validateFiles(selectedFiles);
  const unique = newFiles.filter(
    (f) => !prev.some((p) => p.name === f.name && p.size === f.size)
  );
  const remaining = (constraints.max_files_per_request || 10) - prev.length;
  if (remaining <= 0) {
    setMessage(`Maximum ${constraints.max_files_per_request} files allowed.`);
    return prev;
  }

  if (unique.length > remaining) {
    setMessage(`Only ${remaining} more file(s) can be added.`);
  }

  return [...prev, ...unique.slice(0, remaining)];
});
    e.target.value = null;   // important reset
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => {
      const newFiles = validateFiles(droppedFiles);
      const unique = newFiles.filter(
        (f) => !prev.some((p) => p.name === f.name && p.size === f.size)
      );
      const remaining = (constraints.max_files_per_request || 10) - prev.length;
      if (remaining <= 0) {
        setMessage(`Maximum ${constraints.max_files_per_request} files allowed.`);
        return prev;
      }
      if (unique.length > remaining) {
        setMessage(`Only ${remaining} more file(s) can be added.`);
      }
      return [...prev, ...unique.slice(0, remaining)];
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage("Please select at least one file.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage("");

    try {
      const formData = new FormData();
      // IMPORTANT FIX HERE
      files.forEach((file) => {
        formData.append("file", file);
      });

      await assetsAPI.upload(formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percent);
        }
      });

      setMessage("Upload successful. Redirecting...");
      setFiles([]);

      setTimeout(() => {
        navigate("/assets");
      }, 1200);

    } catch (err) {
      console.error(err);
      setMessage("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isSuccess = message.includes("successful");

  return (
    <Container maxWidth="md">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          mt: { xs: 2, md: 4 },
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="h4">Upload Audio Files</Typography>
          <Tooltip
            title={
              <Box sx={{ p: 0.5 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  Supported Languages
                </Typography>
                {supportedLanguages.map((lang, idx) => (
                  <Typography key={idx} variant="body2">
                    {lang}
                  </Typography>
                ))}
              </Box>
            }
          >
            <IconButton aria-label="Supported languages" color="primary" size="small">
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        </Box>

        {message && (
          <Alert
            severity={isSuccess ? "success" : "error"}
            sx={{ mt: 2, borderRadius: 2 }}
            role="alert"
          >
            {message}
          </Alert>
        )}

        {/* Drag Drop Area */}
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          sx={{
            mt: 3,
            border: "2px dashed",
            borderColor: dragOver ? "primary.main" : "divider",
            borderRadius: 3,
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: dragOver ? "action.hover" : "transparent",
            transition: "border-color 0.2s ease, background-color 0.2s ease",
            "&:focus-within": {
              borderColor: "primary.main",
              outline: "2px solid",
              outlineOffset: 2,
              outlineColor: "primary.main",
            },
          }}
        >
          <CloudUpload
            sx={{
              fontSize: 48,
              mb: 1,
              color: dragOver ? "primary.main" : "text.secondary",
            }}
          />
          <Typography variant="body1" fontWeight={500}>
            Drag & drop audio files here
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
            or
          </Typography>
          <input
            accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,audio/*,video/mp4,video/webm"
            style={{ display: "none" }}
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            aria-label="Choose audio files to upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outlined" component="span" sx={{ mt: 1 }} aria-label="Browse files">
              Browse Files
            </Button>
          </label>
        </Box>

        {/* Allowed formats - stable order from useMemo */}
        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }} icon={false}>
          <Typography variant="body2" component="span">
            Allowed formats: <strong>{orderedExtensions.join(", ")}</strong>
            {" · "}
            Max {constraints.max_files_per_request} files per upload
            {" · "}
            Max {constraints.max_file_size_mb} MB per file
          </Typography>
        </Alert>

        {/* File List - stable keys to avoid reorder/flicker */}
        {files.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {files.length} file{files.length !== 1 ? "s" : ""} ready
            </Typography>
            <List dense disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
              {files.map((file, index) => (
                <ListItem
                  key={getFileKey(file)}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      disabled={uploading}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  }
                  sx={{
                    borderBottom: index < files.length - 1 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <ListItemText
                    primary={file.name}
                    primaryTypographyProps={{ noWrap: true, title: file.name }}
                    secondary={`${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  flex: 1,
                  height: 8,
                  borderRadius: 1,
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 1,
                  },
                }}
              />
              <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40 }}>
                {progress}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Uploading… do not close this page.
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 3 }}
          disabled={files.length === 0 || uploading}
          onClick={handleUpload}
          aria-label={uploading ? "Uploading" : "Upload and process selected files"}
        >
          {uploading ? "Uploading…" : "Upload & Process"}
        </Button>
      </Paper>
    </Container>
  );
};

export default Upload;
