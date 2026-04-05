import React, { useRef } from 'react';
import { Box, useTheme } from '@mui/material';

const OtpInput = ({ length = 6, value, onChange, disabled = false }) => {
  const theme   = useTheme();
  const refs    = useRef([]);
  const digits  = value.split('').concat(Array(length).fill('')).slice(0, length);

  const focus = (i) => refs.current[i]?.focus();

  const handleChange = (e, i) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = [...digits];
    arr[i]    = val;
    onChange(arr.join(''));
    if (val && i < length - 1) focus(i + 1);
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const arr = [...digits];
        arr[i]    = '';
        onChange(arr.join(''));
      } else if (i > 0) {
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focus(i + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(length, '').slice(0, length));
    focus(Math.min(pasted.length, length - 1));
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', my: 1 }}>
      {Array.from({ length }).map((_, i) => (
        <Box
          key={i}
          component="input"
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          disabled={disabled}
          onChange={e => handleChange(e, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          sx={{
            width: 48,
            height: 56,
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            border: `2px solid`,
            borderColor: digits[i]
              ? theme.palette.primary.main
              : theme.palette.divider,
            borderRadius: 2,
            bgcolor: 'background.paper',
            color: 'text.primary',
            outline: 'none',
            cursor: 'text',
            transition: 'border-color 0.15s',
            '&:focus': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 3px ${theme.palette.primary.main}25`,
            },
            '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
          }}
        />
      ))}
    </Box>
  );
};

export default OtpInput;