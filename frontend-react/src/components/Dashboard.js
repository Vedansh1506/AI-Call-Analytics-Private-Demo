import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Call as CallIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Treemap
} from 'recharts';
import { api } from '../services/api';

const formatName = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

const Dashboard = () => {
  const theme = useTheme();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
const [user, setUser] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

 const fetchStats = async () => {
  try {
    const response = await api.get('/assets/stats');

    setStats(response.data);
    setUser(response.data.user || null);

  } catch (err) {
    setError('Failed to load dashboard stats.');
  } finally {
    setLoading(false);
  }
};
  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statCards = [
    {
      title: 'Total Calls',
      value: stats?.total_calls || 0,
      icon: <CallIcon />,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    },
    {
      title: 'Completed Calls',
      value: stats?.completed_calls || 0,
      icon: <CheckCircleIcon />,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    },
    {
      title: 'Failed Calls',
      value: stats?.failed_calls || 0,
      icon: <CancelIcon />,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
    },
    {
      title: 'Average Call Duration',
      value: formatDuration(stats?.average_call_duration_sec || 0),
      icon: <TimerIcon />,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    },
  ];

  const sentimentData = stats?.sentiment_distribution
    ? Object.entries(stats.sentiment_distribution).map(([name, value]) => ({
        name,
        value,
        color:
          name === 'Positive' ? '#27e920' : name === 'Negative' ? '#ff0000' : name === 'Neutral' ? '#6b7280' : '#ff8945'

      }))
    : [];

  const callsPerDayData = stats?.calls_per_day || [];

  const keywordData = stats?.top_keywords
    ? Object.entries(stats.top_keywords).map(([name, value]) => ({
        name,
        value
      }))
    : [];

  const callTypeData =
  (stats?.call_types || []).sort((a, b) => b.value - a.value);

const renderTreemapContent = ({
  x,
  y,
  width,
  height,
  name,
}) => {
  if (width < 90 || height < 50) return null;

  const safeLabel =
    typeof name === "string" ? name : "Unknown";

  // dynamic font based on BOTH width + height
  const fontSize = Math.max(
    11,
    Math.min(15, Math.min(width / 9, height / 3))
  );

  // estimate characters allowed using width
  const maxChars = Math.floor((width - 20) / (fontSize * 0.55));

  let shortLabel = safeLabel;

  if (safeLabel.length > maxChars) {
    shortLabel = safeLabel.slice(0, maxChars - 1) + "…";
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={0}
        ry={0}
        style={{
          fill: "url(#treemapGradient)",
          stroke: "#0f172a",
          strokeWidth: 1,
          filter: "brightness(1)",
        }}
      />

      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={fontSize}
        fontWeight={600}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {shortLabel}
      </text>
    </g>
  );
};

const CustomTreemapTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <Box
      sx={{
        background: "#0f172a",
        color: "#fff",
        px: 2,
        py: 1.2,
        borderRadius: 2,
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        fontSize: 13,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
        {item?.name || "Unknown"}
      </Typography>
      <Typography sx={{ opacity: 0.85 }}>
        Calls: {item?.value ?? 0}
      </Typography>
    </Box>
  );
};
  // const callStatusData = [
  //   { name: 'Completed', value: stats?.completed_calls || 0, color: '#10b981' },
  //   { name: 'Failed', value: stats?.failed_calls || 0, color: '#ef4444' },
  // ].filter(d => d.value > 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
  {user && (
    <Typography
      variant="h4"
      sx={{
        
        fontWeight: 700,
        mb: 1,
      }}
    >
      Welcome {formatName(user.first_name)} {formatName(user.last_name)}!
    </Typography>
  )}

  <Typography
    variant="h5"
    component="h1"
    sx={{ fontWeight: 700 }}
  >
    Dashboard
  </Typography>
</Box>
      </motion.div>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card
                sx={{
                  background: stat.gradient,
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${stat.color}40`,
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -20,
                      right: -20,
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sentiment Distribution Pie Chart */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card sx={{ height: '100%' , background: "rgba(255,255,255,0.03)" }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, letterSpacing: 0.3 }}>
                  
                  Sentiment Distribution
                </Typography>
                {sentimentData.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={0}
                          outerRadius={100}
                          paddingAngle={0}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">No sentiment data available</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

<Grid item xs={12} md={6}>
  <Card sx={{ background: "rgba(255,255,255,0.03)" }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }} gutterBottom>
        Top Keywords
      </Typography>

      {keywordData.length > 0 ? (
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={keywordData}   margin={{ top: 10, right: 20, left: 10, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3"   stroke={theme.palette.divider}
/>
<XAxis
  dataKey="name"
  angle={-60}
  textAnchor="end"
  interval={0}
  height={75}
  tick={{ fontSize: 16, fill: theme.palette.text.primary }}
  tickFormatter={(v) => v.length > 10 ? v.slice(0,10) + "…" : v}
/>
              <YAxis tick={{ fontSize: 16, fill: theme.palette.text.primary}} />
              <Tooltip
  contentStyle={{
    background: "#1f2937",
    border: "none",
    color: "#fff",
    borderRadius: 8
  }}
/>

              <Bar dataKey="value"  radius={[4,4,0,0]} fill="#ff0088" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography>No keyword data</Typography>
      )}
    </CardContent>
  </Card>
</Grid>

        <Grid item xs={12}>
  <Card sx={{ background: "rgba(255,255,255,0.03)" }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }} gutterBottom>
        Calls Per Day
      </Typography>

      {callsPerDayData.length > 0 ? (
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={callsPerDayData}   margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
>
              <CartesianGrid strokeDasharray="3 3"   stroke={theme.palette.divider}
/>
              <XAxis
  dataKey="date"
  angle={-35}
  textAnchor="end"
  interval={0}
  height={70}
  tick={{ fill: theme.palette.text.primary, fontSize: 16 }}
/>
              <YAxis tick={{ fill: theme.palette.text.primary }} />
              <Tooltip
  contentStyle={{
    background: "#1f2937",
    border: "none",
    color: "#fff",
    borderRadius: 8
  }}
/>

              <Line type="monotone" dataKey="count" stroke="#8d00c5" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography>No data available</Typography>
      )}
    </CardContent>
  </Card>
</Grid>

<Grid item xs={12}>
  <Card sx={{ background: "rgba(255,255,255,0.03)" }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }} gutterBottom>
        Call Types Distribution
      </Typography>

      {callTypeData.length > 0 && callTypeData.some(c => c.value > 0) ? (
        <Box sx={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={callTypeData}
              dataKey="value"
              nameKey="name"
              content={renderTreemapContent}
              isAnimationActive={true}
            >
              <defs>
  <linearGradient id="treemapGradient" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#059669" />
    <stop offset="100%" stopColor="#047857" />
  </linearGradient>
</defs>
                <Tooltip
  cursor={{ stroke: "#fff", strokeWidth: 1 }}
  content={<CustomTreemapTooltip />}
/>
</Treemap>  
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography>No call type data</Typography>
      )}
    </CardContent>
  </Card>
</Grid>

        
      </Grid>
    </Box>
  );
};

export default Dashboard;
