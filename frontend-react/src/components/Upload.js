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
  ListItemText
} from "@mui/material";
import { CloudUpload, InfoOutlined, Close } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { assetsAPI } from "../services/api";

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [constraints, setConstraints] = useState({
    max_files_per_request: 10,
    max_file_size_mb: 100,
    allowed_extensions: [".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm"],
    allowed_mime_types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/webm"],
  });

  const navigate = useNavigate();


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

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>

        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h4">Upload Audio Files</Typography>

          <Tooltip
            title={
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Supported Languages:
                </Typography>
                {supportedLanguages.map((lang, idx) => (
                  <Typography key={idx} variant="body2">
                    {lang}
                  </Typography>
                ))}
              </Box>
            }
          >
            <IconButton>
              <InfoOutlined />
            </IconButton>
          </Tooltip>
        </Box>

        {message && (
          <Alert severity={message.includes("successful") ? "success" : "error"} sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}

        {/* Drag Drop Area */}
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          sx={{
            mt: 3,
            border: "2px dashed #64748b",
            borderRadius: 3,
            p: 4,
            textAlign: "center",
            cursor: "pointer"
          }}
        >
          <CloudUpload sx={{ fontSize: 48, mb: 1 }} />
          <Typography>Drag & drop audio files here</Typography>
          
          <Typography variant="body2" sx={{ my: 1 }}>
            or
          </Typography>
          <input
            accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,audio/*,video/mp4,video/webm"
            style={{ display: "none" }}
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileChange}
          />
          

          <label htmlFor="file-upload">
            <Button variant="outlined" component="span" sx={{ mt: 1 }}>
              Browse Files
            </Button>
          </label>
        </Box>
        {/* allowed types and extensions */}
        <Alert severity="info" sx={{ mt: 2 }}>
          Allowed formats: {constraints.allowed_extensions.join(", ")} |
          Max files per upload: {constraints.max_files_per_request} | 
          Max size per file: {constraints.max_file_size_mb} MB
        </Alert>

        {/* File List with Remove */}
        {files.length > 0 && (
          <List sx={{ mt: 2 }}>
            {files.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFile(index)}>
                    <Close />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                />
              </ListItem>
            ))}
          </List>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Uploading... {progress}%
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
        >
          {uploading ? "Uploading..." : "Upload & Process"}
        </Button>

      </Paper>
    </Container>
  );
};

export default Upload;
