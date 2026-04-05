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
  LabelList,
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
import Skeleton from '@mui/material/Skeleton';

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
  const sentimentTotal = sentimentData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const callsPerDayData = stats?.calls_per_day || [];
  const languageDistributionData = (stats?.language_distribution || []).filter(
    (item) => String(item?.name || "").trim().toLowerCase() !== "unknown"
  );

  const keywordData = stats?.top_keywords
    ? Object.entries(stats.top_keywords).map(([name, value]) => ({
        name,
        value
      }))
    : [];

  const callTypeData =
  (stats?.call_types || []).sort((a, b) => b.value - a.value);
  const languageLollipopColor =
    theme.palette.mode === "light" ? "#0e7490" : "#22d3ee";

const LollipopBar = ({ x, y, width, height, fill }) => {
  const cy = y + height / 2;
  const endX = x + width;
  return (
    <g>
      <line x1={x} y1={cy} x2={endX} y2={cy} stroke={fill} strokeWidth={4} strokeLinecap="round" />
      <circle cx={endX} cy={cy} r={6} fill={fill} />
    </g>
  );
};

const LollipopValueLabel = ({ x, y, width, height, value, fill }) => {
  if (value === null || value === undefined) return null;
  return (
    <text
      x={x + width + 10}
      y={y + height / 2}
      fill={fill}
      fontSize={12}
      fontWeight={700}
      textAnchor="start"
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
};

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

  const fontSize = Math.max(
    11,
    Math.min(14, Math.min(width / 9, height / 3))
  );

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
          stroke: "rgba(0,0,0,0.2)",
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
      sx={(theme) => ({
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
        px: 2,
        py: 1.2,
        borderRadius: 2,
        boxShadow: theme.shadows[4],
        fontSize: 13,
        border: `1px solid ${theme.palette.divider}`,
      })}
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
      <Box>
        <Skeleton variant="text" width={280} height={44} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={120} height={36} sx={{ mb: 3 }} />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1,2,3,4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {[1,2,3,4].map(i => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
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
        fontSize: 'h4.fontSize',
        fontWeight: 600,
        mb: 1,
      }}
    >
      👋 Welcome, {formatName(user.first_name)}!
    </Typography>
  )}

  <Typography
    variant="h5"
    component="h1"
    sx={{ fontWeight: 700 }}
  >
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
      <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">
        {/* Sentiment Distribution Pie Chart */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{ width: "100%"}}
          >
            <Card sx={{ height: "100%", minHeight: 380, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
              <CardContent sx={{ p: 3, height: "100%" }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  Sentiment Distribution
                </Typography>
                {sentimentData.length > 0 ? (
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 56, bottom: 20, left: 56 }}>
                        <Pie
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={0}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ cx, cy, midAngle, outerRadius, name }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = (outerRadius || 0) + 18;
                            const x = (cx || 0) + radius * Math.cos(-midAngle * RADIAN);
                            const y = (cy || 0) + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill={theme.palette.text.primary}
                                textAnchor={x > (cx || 0) ? "start" : "end"}
                                dominantBaseline="central"
                                fontSize={14}
                                fontWeight={500}
                              >
                                {name}
                              </text>
                            );
                          }}
                          labelLine={false}
                        >
                          {sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => {
                            const numeric = Number(value) || 0;
                            const percent = sentimentTotal ? ((numeric / sentimentTotal) * 100).toFixed(0) : "0";
                            return [`${numeric} (${percent}%)`, name];
                          }}
                          contentStyle={{
                            borderRadius: 8,
                            border: `1px solid ${theme.palette.divider}`,
                            background: theme.palette.background.paper,
                            color: theme.palette.text.primary,
                            boxShadow: theme.shadows[4],
                          }}
                          labelStyle={{ color: theme.palette.text.primary }}
                          itemStyle={{ color: theme.palette.text.primary }}
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
  <Card sx={{ height: "100%", minHeight: 380, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
    <CardContent sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
        Top Keywords
      </Typography>

      {keywordData.length > 0 ? (
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={keywordData} margin={{ top: 10, right: 20, left: 10, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="name"
                angle={-60}
                textAnchor="end"
                interval={0}
                height={75}
                tick={{ fontSize: 14, fill: theme.palette.text.primary }}
                tickFormatter={(v) => (v && v.length > 10 ? v.slice(0, 10) + "…" : v)}
              />
              <YAxis tick={{ fontSize: 14, fill: theme.palette.text.primary }} />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={theme.palette.primary.main} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">No keyword data available</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
</Grid>

        <Grid item xs={12} md={6}>
  <Card sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
        Calls Per Day
      </Typography>

      {callsPerDayData.length > 0 ? (
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={callsPerDayData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="date"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fill: theme.palette.text.primary, fontSize: 14 }}
              />
              <YAxis tick={{ fill: theme.palette.text.primary, fontSize: 14 }} />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
              />
              <Line type="monotone" dataKey="count" stroke={theme.palette.secondary.main} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">No call data available</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
</Grid>

<Grid item xs={12} md={6}>
  <Card sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
        Language Distribution
      </Typography>

      {languageDistributionData.length > 0 ? (
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={languageDistributionData.slice(0, 10)}
              layout="vertical"
              margin={{ top: 10, right: 64, left: 30, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis type="number" tick={{ fill: theme.palette.text.primary, fontSize: 13 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={118}
                interval={0}
                tick={{ fill: theme.palette.text.primary, fontSize: 14, fontWeight: 500 }}
              />
              <Tooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                }}
                labelStyle={{ fontWeight: 700 }}
                formatter={(value) => [`${value}`, "Calls"]}
              />
              <Bar dataKey="value" shape={<LollipopBar fill={languageLollipopColor} />}>
                <LabelList
                  dataKey="value"
                  content={<LollipopValueLabel fill={theme.palette.text.primary} />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">No language data available</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
</Grid>

<Grid item xs={12}>
  <Card sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
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
        <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="text.secondary">No call type data available</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
</Grid>

        
      </Grid>
    </Box>
  );
};

export default Dashboard;
