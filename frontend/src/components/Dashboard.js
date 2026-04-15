import React, { useState, useEffect } from 'react';
import {
  Grid, Typography, Box, Card, CardContent,
  Alert, useTheme, Skeleton,
} from '@mui/material';
import {
  Call as CallIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Treemap,
} from 'recharts';
import { api } from '../services/api';

const formatName = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, accent, delay }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card sx={{
        height: '100%',
        borderColor: theme.palette.divider,
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: accent + '50',
          boxShadow: `0 0 0 1px ${accent}30, 0 4px 24px ${accent}12`,
        },
        transition: 'all 0.2s ease',
      }}>
        {/* Accent bar top */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 2, backgroundColor: accent, opacity: 0.8,
        }} />

        <CardContent sx={{ pt: 2.5, pb: '16px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: theme.palette.text.disabled,
                mb: 0.75,
              }}>
                {title}
              </Typography>
              <Typography sx={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '1.75rem',
                fontWeight: 500,
                color: theme.palette.text.primary,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {value}
              </Typography>
            </Box>
            <Box sx={{
              width: 36, height: 36,
              borderRadius: '6px',
              backgroundColor: accent + '18',
              border: `1px solid ${accent}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent,
            }}>
              {React.cloneElement(icon, { sx: { fontSize: 17 } })}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ── Chart card wrapper ─────────────────────────────────────────────────────
const ChartCard = ({ title, children, delay = 0, minHeight = 340 }) => {
  const theme = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: '100%' }}
    >
      <Card sx={{ height: '100%', minHeight }}>
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{
            fontSize: '0.75rem', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: theme.palette.text.disabled, mb: 2,
          }}>
            {title}
          </Typography>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ── Lollipop shapes for language bar ──────────────────────────────────────
const LollipopBar = ({ x, y, width, height, fill }) => {
  const cy = y + height / 2;
  return (
    <g>
      <line x1={x} y1={cy} x2={x + width} y2={cy}
        stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x + width} cy={cy} r={5} fill={fill} />
    </g>
  );
};
const LollipopValueLabel = ({ x, y, width, height, value, fill }) => (
  value != null ? (
    <text x={x + width + 8} y={y + height / 2}
      fill={fill} fontSize={11} fontWeight={600}
      textAnchor="start" dominantBaseline="middle">
      {value}
    </text>
  ) : null
);

// ── Treemap ────────────────────────────────────────────────────────────────
const renderTreemapContent = ({ x, y, width, height, name }) => {
  if (width < 80 || height < 44) return null;
  const safe = typeof name === 'string' ? name : 'Unknown';
  const fs = Math.max(10, Math.min(13, Math.min(width / 9, height / 3)));
  const maxC = Math.floor((width - 16) / (fs * 0.55));
  const label = safe.length > maxC ? safe.slice(0, maxC - 1) + '…' : safe;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={0}
        style={{
          fill: 'url(#tmGrad)',
          stroke: 'rgba(0,0,0,0.15)',
          strokeWidth: 1,
        }}
      />
      <text x={x + width / 2} y={y + height / 2}
        textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.92)" fontSize={fs} fontWeight={500}
        style={{ pointerEvents: 'none', fontFamily: '"DM Sans", sans-serif' }}>
        {label}
      </text>
    </g>
  );
};

const CustomTreemapTooltip = ({ active, payload }) => {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <Box sx={{
      background: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '6px', px: 1.75, py: 1.25,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    }}>
      <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item?.name}</Typography>
      <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
        {item?.value} calls
      </Typography>
    </Box>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const amber = theme.palette.primary.main;

  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get('/assets/stats')
      .then(r => { setStats(r.data); setUser(r.data.user || null); })
      .catch(() => setError('Failed to load dashboard stats.'))
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (s) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const tooltipStyle = {
    contentStyle: {
      background: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 6,
      fontSize: 12,
      color: theme.palette.text.primary,
      fontFamily: '"DM Sans", sans-serif',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    },
    labelStyle: { fontWeight: 600, color: theme.palette.text.primary },
    itemStyle:  { color: theme.palette.text.secondary },
    cursor: { fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
  };

  if (loading) {
    return (
      <Box className="page-enter">
        <Skeleton variant="text" width={260} height={36} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={180} height={22} sx={{ mb: 4 }} />
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {[0,1,2,3].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '8px' }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2.5}>
          {[0,1,2,3].map(i => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={340} sx={{ borderRadius: '8px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  const statCards = [
    { title: 'Total Calls',            value: stats?.total_calls || 0,
      icon: <CallIcon />,          accent: amber },
    { title: 'Completed',              value: stats?.completed_calls || 0,
      icon: <CheckCircleIcon />,   accent: '#2CB67D' },
    { title: 'Failed',                 value: stats?.failed_calls || 0,
      icon: <CancelIcon />,        accent: '#E05252' },
    { title: 'Avg. Duration',          value: formatDuration(stats?.average_call_duration_sec || 0),
      icon: <TimerIcon />,         accent: '#5B9CF6' },
  ];

  const sentimentData = stats?.sentiment_distribution
    ? Object.entries(stats.sentiment_distribution).map(([name, value]) => ({
        name, value,
        color: name === 'Positive' ? '#2CB67D'
             : name === 'Negative' ? '#E05252'
             : name === 'Neutral'  ? '#8C8880'
             : '#D4900A',
      }))
    : [];
  const sentimentTotal = sentimentData.reduce((s, d) => s + (Number(d.value) || 0), 0);

  const callsPerDay = stats?.calls_per_day || [];
  const langData = (stats?.language_distribution || []).filter(
    d => String(d?.name || '').trim().toLowerCase() !== 'unknown'
  );
  const keywordData = stats?.top_keywords
    ? Object.entries(stats.top_keywords).map(([name, value]) => ({ name, value }))
    : [];
  const callTypeData = (stats?.call_types || []).sort((a, b) => b.value - a.value);

  const lollipopColor = isDark ? '#5B9CF6' : '#3060B0';

  return (
    <Box className="page-enter">
      {/* ── Header ── */}
      <Box sx={{ mb: 4 }}>
        {user && (
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '1.75rem', fontWeight: 400,
            color: theme.palette.text.primary, mb: 0.5,
          }}>
            Good day, {formatName(user.first_name)}
          </Typography>
        )}
        <Typography sx={{
          fontSize: '0.875rem', color: theme.palette.text.secondary,
        }}>
          Here's an overview of your call analytics
        </Typography>
      </Box>

      {/* ── Stat cards ── */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {statCards.map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={s.title}>
            <StatCard {...s} delay={i * 0.06} />
          </Grid>
        ))}
      </Grid>

      {/* ── Charts row 1 ── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }} alignItems="stretch">

        {/* Sentiment donut */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Sentiment Distribution" delay={0.2}>
            {sentimentData.length > 0 ? (
              <Box sx={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart margin={{ top: 10, right: 60, bottom: 10, left: 60 }}>
                    <Pie
                      data={sentimentData} cx="50%" cy="50%"
                      innerRadius={64} outerRadius={96}
                      paddingAngle={3} dataKey="value"
                      label={({ cx, cy, midAngle, outerRadius, name }) => {
                        const R = Math.PI / 180;
                        const r = outerRadius + 20;
                        const x = cx + r * Math.cos(-midAngle * R);
                        const y = cy + r * Math.sin(-midAngle * R);
                        return (
                          <text x={x} y={y}
                            fill={theme.palette.text.secondary}
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={11} fontFamily='"DM Sans", sans-serif'>
                            {name}
                          </text>
                        );
                      }}
                      labelLine={false}
                    >
                      {sentimentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => {
                        const num = Number(v) || 0;
                        const pct = sentimentTotal ? ((num / sentimentTotal) * 100).toFixed(0) : 0;
                        return [`${num} (${pct}%)`, n];
                      }}
                      {...tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartState label="No sentiment data" />
            )}
          </ChartCard>
        </Grid>

        {/* Top keywords */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Top Keywords" delay={0.25}>
            {keywordData.length > 0 ? (
              <Box sx={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={keywordData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 56 }}>
                    <CartesianGrid strokeDasharray="2 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="name" angle={-50} textAnchor="end" interval={0} height={60}
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontFamily: '"DM Sans", sans-serif' }}
                      tickFormatter={(v) => v?.length > 9 ? v.slice(0, 9) + '…' : v}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontFamily: '"DM Sans", sans-serif' }}
                      axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" radius={[3,3,0,0]}
                      fill={amber} fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartState label="No keyword data" />
            )}
          </ChartCard>
        </Grid>

        {/* Calls per day */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Calls Per Day" delay={0.3}>
            {callsPerDay.length > 0 ? (
              <Box sx={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={callsPerDay}
                    margin={{ top: 8, right: 8, left: 0, bottom: 56 }}>
                    <CartesianGrid strokeDasharray="2 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="date" angle={-35} textAnchor="end" interval={0} height={64}
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontFamily: '"DM Sans", sans-serif' }}
                      axisLine={{ stroke: theme.palette.divider }} tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontFamily: '"DM Sans", sans-serif' }}
                      axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count"
                      stroke={amber} strokeWidth={2}
                      dot={{ r: 3, fill: amber, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: amber }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartState label="No daily call data" />
            )}
          </ChartCard>
        </Grid>

        {/* Language distribution */}
        <Grid item xs={12} md={6}>
          <ChartCard title="Language Distribution" delay={0.35}>
            {langData.length > 0 ? (
              <Box sx={{ flex: 1, minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={langData.slice(0, 10)} layout="vertical"
                    margin={{ top: 4, right: 56, left: 24, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 3" stroke={theme.palette.divider} />
                    <XAxis type="number"
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontFamily: '"DM Sans", sans-serif' }}
                      axisLine={{ stroke: theme.palette.divider }} tickLine={false}
                    />
                    <YAxis type="category" dataKey="name" width={110} interval={0}
                      tick={{ fontSize: 11, fill: theme.palette.text.secondary, fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Calls']} />
                    <Bar dataKey="value" shape={<LollipopBar fill={lollipopColor} />}>
                      <LabelList dataKey="value"
                        content={<LollipopValueLabel fill={theme.palette.text.secondary} />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartState label="No language data" />
            )}
          </ChartCard>
        </Grid>

        {/* Call types treemap — full width */}
        <Grid item xs={12}>
          <ChartCard title="Call Types" delay={0.4} minHeight={380}>
            {callTypeData.length > 0 && callTypeData.some(c => c.value > 0) ? (
              <Box sx={{ flex: 1, minHeight: 320 }}>
                <ResponsiveContainer width="100%" height={320}>
                  <Treemap data={callTypeData} dataKey="value" nameKey="name"
                    content={renderTreemapContent} isAnimationActive>
                    <defs>
                      <linearGradient id="tmGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={isDark ? '#2A2820' : '#1A3A2A'} />
                        <stop offset="100%" stopColor={isDark ? '#1A1810' : '#0F2A1A'} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<CustomTreemapTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyChartState label="No call type data" />
            )}
          </ChartCard>
        </Grid>

      </Grid>
    </Box>
  );
};

// ── Empty chart state ──────────────────────────────────────────────────────
const EmptyChartState = ({ label }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      flex: 1, minHeight: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.disabled }}>
        {label}
      </Typography>
    </Box>
  );
};

export default Dashboard;