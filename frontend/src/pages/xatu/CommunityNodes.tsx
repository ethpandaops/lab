import { useDataFetch } from '@/utils/data.ts';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { XatuCallToAction } from '@/components/xatu/XatuCallToAction';
import { NetworkSelector } from '@/components/common/NetworkSelector';
import { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getConfig } from '@/config';
import { GetConfigResponse } from '@/api/gen/backend/pkg/server/proto/lab/lab_pb';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { AboutThisData } from '@/components/common/AboutThisData';
import { ChartWithStats, NivoLineChart } from '@/components/charts';
import useConfig from '@/contexts/config';
import useNetwork from '@/contexts/network';

interface CountryData {
  time: number;
  countries: {
    name: string;
    value: number;
  }[];
}

interface UserData {
  time: number;
  users: {
    name: string;
    nodes: number;
  }[];
}

interface TimeWindow {
  file: string;
  step: string;
  label: string;
  range: string;
}

type SectionId = 'total-nodes' | 'nodes-by-country' | 'map';

const SECTIONS: Record<SectionId, string> = {
  'total-nodes': 'total-nodes',
  'nodes-by-country': 'nodes-by-country',
  map: 'map',
};

// Generate a deterministic color based on string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

export const CommunityNodes = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [config, setConfig] = useState<GetConfigResponse | null>(null);
  const [isTimeWindowOpen, setIsTimeWindowOpen] = useState(false);
  const [hiddenCountries, setHiddenCountries] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const timeWindowRef = useRef<HTMLDivElement>(null);

  const configContext = useConfig();
  const pathPrefix = configContext?.modules?.['xatu_public_contributors']?.pathPrefix;

  console.log('fuck you', pathPrefix, configContext);

  const { selectedNetwork, setSelectedNetwork } = useNetwork();
  const [currentWindow, setCurrentWindow] = useState<TimeWindow | null>(null);
  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set());

  const timeWindows = useMemo(
    () =>
      config?.modules['xatu_public_contributors'].timeWindows || [
        { file: 'last_30_days', step: '1d', label: '30d', range: '-30d' },
        { file: 'last_1_day', step: '1h', label: '1d', range: '-1d' },
      ],
    [config],
  );

  const defaultTimeWindow = useMemo(() => timeWindows[0]?.file || 'last_30_days', [timeWindows]);

  // Get initial values from URL or defaults
  const initialTimeWindow = searchParams.get('timeWindow') || defaultTimeWindow;

  // Update handleNetworkChange to use setSelectedNetwork
  const handleNetworkChange = (newNetwork: string) => {
    setSelectedNetwork(newNetwork);
    // Reset data when network changes
    setCurrentWindow(null);
  };

  const handleTimeWindowChange = (newTimeWindow: TimeWindow) => {
    setCurrentWindow(newTimeWindow);
    const newParams = new URLSearchParams(searchParams);
    if (newTimeWindow.file !== defaultTimeWindow) {
      newParams.set('timeWindow', newTimeWindow.file);
    } else {
      newParams.delete('timeWindow');
    }
    setSearchParams(newParams, { replace: true });
  };

  // Refs for section scrolling
  const totalNodesRef = useRef<HTMLDivElement>(null);
  const countriesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConfig().then(setConfig).catch(console.error);
  }, []);

  // Handle section scrolling
  useEffect(() => {
    const hash = location.hash.slice(1) as SectionId;
    if (!hash) return;

    const refs = {
      [SECTIONS['total-nodes']]: totalNodesRef,
      [SECTIONS['nodes-by-country']]: countriesRef,
    };

    const ref = refs[hash];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  // Set initial time window when config loads
  useEffect(() => {
    if (timeWindows.length > 0) {
      const initialWindow = timeWindows.find(w => w.file === initialTimeWindow) || timeWindows[0];
      setCurrentWindow(initialWindow);
    }
  }, [timeWindows, initialTimeWindow]);

  const countriesPath = pathPrefix
    ? `${pathPrefix}/countries/${selectedNetwork}/${currentWindow?.file || defaultTimeWindow}.json`
    : null;
  const usersPath = pathPrefix
    ? `${pathPrefix}/users/${selectedNetwork}/${currentWindow?.file || defaultTimeWindow}.json`
    : null;

  const {
    data: countriesData,
    loading: countriesLoading,
    error: countriesError,
  } = useDataFetch<CountryData[]>(countriesPath);
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useDataFetch<UserData[]>(usersPath);

  const { chartData, totalNodesData, topCountries } = useMemo(() => {
    if (!countriesData) {
      return { chartData: [], totalNodesData: [], topCountries: [] };
    }

    // Convert the new format to chart data
    const chartData = countriesData
      .map(timePoint => {
        const dataPoint: Record<string, number | string> = { time: timePoint.time };
        timePoint.countries.forEach(country => {
          dataPoint[country.name] = country.value;
        });
        return dataPoint;
      })
      .sort((a, b) => Number(a.time) - Number(b.time));

    // Calculate total nodes per time point
    const totalNodesData = chartData.map(timePoint => ({
      time: timePoint.time,
      total: Object.entries(timePoint)
        .filter(([key]) => key !== 'time')
        .reduce((sum, [, value]) => sum + (value as number), 0),
    }));

    // Get all countries by total contributors (remove slice)
    const countryTotals = chartData.reduce(
      (acc, timePoint) => {
        Object.entries(timePoint).forEach(([key, value]) => {
          if (key !== 'time') {
            acc[key] = (Number(acc[key]) || 0) + Number(value);
          }
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    const topCountries = Object.entries(countryTotals)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .map(([country]) => country);

    return { chartData, totalNodesData, topCountries };
  }, [countriesData]);

  const { userChartData, topUsers } = useMemo(() => {
    if (!usersData) {
      return { userChartData: [], topUsers: [] };
    }

    // Convert the new format to chart data
    const chartData = usersData
      .map(timePoint => {
        const dataPoint: Record<string, number | string> = { time: timePoint.time };
        timePoint.users.forEach(user => {
          dataPoint[user.name] = user.nodes;
        });
        dataPoint.uniqueUsers = timePoint.users.length;
        return dataPoint;
      })
      .sort((a, b) => Number(a.time) - Number(b.time));

    // Get all users by total nodes
    const userTotals = chartData.reduce(
      (acc, timePoint) => {
        Object.entries(timePoint).forEach(([key, value]) => {
          if (key !== 'time' && key !== 'uniqueUsers') {
            acc[key] = (Number(acc[key]) || 0) + Number(value);
          }
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    const topUsers = Object.entries(userTotals)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .map(([user]) => user);

    return { userChartData: chartData, topUsers };
  }, [usersData]);

  const handleLegendClick = (
    _: React.MouseEvent<HTMLButtonElement>,
    item: { value: string; type: string },
  ) => {
    const setHiddenItems = item.type === 'country' ? setHiddenCountries : setHiddenUsers;
    const availableItems = item.type === 'country' ? topCountries : topUsers;

    setHiddenItems(prev => {
      const next = new Set(prev);
      const isOnlyVisible = !next.has(item.value) && next.size === availableItems.length - 1;
      const isHidden = next.has(item.value);

      if (isOnlyVisible) {
        next.clear();
      } else if (isHidden) {
        next.delete(item.value);
      } else if (next.size === 0) {
        availableItems.forEach(i => {
          if (i !== item.value) next.add(i);
        });
      } else {
        next.add(item.value);
      }

      return next;
    });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // 64px header + 16px padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      navigate({ hash: id });
    }
  };

  if (countriesLoading || usersLoading) {
    return <LoadingState message="Loading data..." />;
  }

  if (countriesError || usersError) {
    return (
      <ErrorState
        message="Failed to load data"
        error={countriesError || usersError || new Error('Unknown error')}
      />
    );
  }

  if (!countriesData || !usersData) {
    return <ErrorState message="No data available" />;
  }

  return (
    <div className="p-4" ref={containerRef}>
      <style>{`
        .cyber-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 255, 159, 0.3) rgba(0, 0, 0, 0);
        }
        
        .cyber-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .cyber-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          -radius: 3px;
        }
        
        .cyber-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 159, 0.3);
          -radius: 3px;
          transition: background 0.2s ease;
        }
        
        .cyber-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 159, 0.5);
        }
        
        .cyber-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }

        .chart-title {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chart-title:hover {
          color: #00ffff;
        }

        .chart-title:hover::after {
          content: ' #';
          opacity: 0.5;
        }
      `}</style>
      <XatuCallToAction />

      <div className="space-y-6">
        <AboutThisData>
          <p>
            This data represents Xatu nodes that community members have voluntarily contributed to
            the network. These are specifically nodes running the Xatu software to help collect
            network metrics, and are distinct from Ethereum nodes. The data helps us understand the
            geographical distribution of Xatu nodes and monitor the health of the Xatu network. All
            data is anonymized and no personally identifiable information is collected.
          </p>
        </AboutThisData>

        {/* Time and Network Selectors */}
        <div className="flex flex-col md:flex-row justify-end gap-4">
          <NetworkSelector
            selectedNetwork={selectedNetwork}
            onNetworkChange={handleNetworkChange}
          />
          <div className="relative" ref={timeWindowRef}>
            <button
              type="button"
              onClick={() => setIsTimeWindowOpen(!isTimeWindowOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 border border-default hover:border-prominent hover:bg-hover transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-mono">{currentWindow?.label || 'Select Time'}</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${isTimeWindowOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isTimeWindowOpen && (
              <div className="absolute z-10 right-0 mt-2 w-48 border border-default">
                {timeWindows.map(window => (
                  <button
                    key={window.file}
                    onClick={() => {
                      handleTimeWindowChange(window);
                      setIsTimeWindowOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-hover first:rounded-t-lg last:rounded-b-lg text-primary ${
                      window.file === currentWindow?.file ? 'bg-active' : ''
                    }`}
                  >
                    <span className="font-mono">{window.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Total Nodes Chart */}
        <ChartWithStats
          title={
            <a
              href="#total-nodes"
              id="total-nodes"
              onClick={e => {
                e.preventDefault();
                scrollToSection('total-nodes');
              }}
              className="chart-title"
            >
              Total Xatu Nodes
            </a>
          }
          description="Total number of Xatu nodes over time."
          chart={
            <NivoLineChart
              data={[
                {
                  id: 'total',
                  data: totalNodesData.map(d => ({
                    x: d.time,
                    y: d.total,
                  })),
                },
              ]}
              margin={{
                top: 20,
                right: 10,
                left: 25,
                bottom: 40,
              }}
              xScale={{
                type: 'time',
                format: 'native',
                precision: 'second',
              }}
              yScale={{
                type: 'linear',
                min: 0,
                max: 'auto',
              }}
              axisBottom={{
                format: (value: number) => {
                  const date = new Date(value * 1000);
                  return currentWindow?.step === '1h'
                    ? date.toLocaleTimeString()
                    : date.toLocaleDateString();
                },
                tickRotation: -45,
                legend: 'Time',
                legendOffset: 36,
                legendPosition: 'middle',
              }}
              axisLeft={{
                legend: 'Number of Nodes',
                legendOffset: -40,
                legendPosition: 'middle',
              }}
              colors={['currentColor']}
              pointSize={0}
              enableSlices="x"
            />
          }
          series={[
            {
              name: 'Total Nodes',
              color: 'currentColor',
              min: Math.min(...totalNodesData.map(d => d.total)),
              max: Math.max(...totalNodesData.map(d => d.total)),
              avg: totalNodesData.reduce((sum, d) => sum + d.total, 0) / totalNodesData.length,
              last: totalNodesData[totalNodesData.length - 1].total,
            },
          ]}
        />

        {/* Nodes by Country Chart */}
        <ChartWithStats
          title={
            <a
              href="#nodes-by-country"
              id="nodes-by-country"
              onClick={e => {
                e.preventDefault();
                scrollToSection('nodes-by-country');
              }}
              className="chart-title"
            >
              Xatu Nodes by Country
            </a>
          }
          description="Distribution of Xatu nodes across different countries."
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 10,
                  left: 25,
                  bottom: 40,
                }}
              >
                <XAxis
                  dataKey="time"
                  stroke="currentColor"
                  tickFormatter={str => {
                    const date = new Date(str * 1000);
                    return currentWindow?.step === '1h'
                      ? date.toLocaleTimeString()
                      : date.toLocaleDateString();
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'Time',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fill: 'currentColor', fontSize: 12 },
                  }}
                />
                <YAxis
                  stroke="currentColor"
                  label={{
                    value: 'Number of Nodes',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'currentColor', fontSize: 12 },
                    offset: -10,
                  }}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f',
                    fontSize: '12px',
                  }}
                  labelFormatter={value => new Date(value * 1000).toLocaleString()}
                  formatter={(value: number, name: string) => [value, name]}
                />
                {topCountries
                  .filter(country => hiddenCountries.size === 0 || !hiddenCountries.has(country))
                  .map(country => (
                    <Line
                      key={country}
                      type="monotone"
                      dataKey={country}
                      name={country}
                      stroke={stringToColor(country)}
                      strokeWidth={2}
                      dot={false}
                      opacity={hiddenCountries.has(country) ? 0.2 : 1}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          }
          series={topCountries.map(country => {
            const isHidden = hiddenCountries.has(country);
            const isOnlyVisible = !isHidden && hiddenCountries.size === topCountries.length - 1;
            const color = stringToColor(country);
            const values = chartData.map(d => d[country]).filter(Boolean);
            const latestValue = values[values.length - 1] || 0;
            const avg = values.length
              ? (values.reduce((a, b) => Number(a) + Number(b), 0) as number) / values.length
              : 0;
            const min = values.length ? Math.min(...values.map(Number)) : 0;
            const max = values.length ? Math.max(...values.map(Number)) : 0;

            return {
              name: country,
              color,
              min,
              avg,
              max,
              last: latestValue,
              isHidden,
              isHighlighted: isOnlyVisible,
              onClick: e => handleLegendClick(e, { value: country, type: 'country' }),
            };
          })}
        />

        {/* Nodes per User Chart */}
        <ChartWithStats
          title={
            <a
              href="#nodes-per-user"
              id="nodes-per-user"
              onClick={e => {
                e.preventDefault();
                scrollToSection('nodes-per-user');
              }}
              className="chart-title"
            >
              Nodes per User
            </a>
          }
          description="Number of nodes contributed by each user."
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={userChartData}
                margin={{
                  top: 20,
                  right: 10,
                  left: 25,
                  bottom: 40,
                }}
              >
                <XAxis
                  dataKey="time"
                  stroke="currentColor"
                  tickFormatter={str => {
                    const date = new Date(str * 1000);
                    return currentWindow?.step === '1h'
                      ? date.toLocaleTimeString()
                      : date.toLocaleDateString();
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'Time',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fill: 'currentColor', fontSize: 12 },
                  }}
                />
                <YAxis
                  stroke="currentColor"
                  label={{
                    value: 'Number of Nodes',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'currentColor', fontSize: 12 },
                    offset: -10,
                  }}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f',
                    fontSize: '12px',
                  }}
                  labelFormatter={value => new Date(value * 1000).toLocaleString()}
                  formatter={(value: number, name: string) => [value, name]}
                />
                {topUsers
                  .filter(user => hiddenUsers.size === 0 || !hiddenUsers.has(user))
                  .map(user => (
                    <Line
                      key={user}
                      type="monotone"
                      dataKey={user}
                      name={user}
                      stroke={stringToColor(user)}
                      strokeWidth={2}
                      dot={false}
                      opacity={hiddenUsers.has(user) ? 0.2 : 1}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          }
          series={topUsers.map(user => {
            const isHidden = hiddenUsers.has(user);
            const isOnlyVisible = !isHidden && hiddenUsers.size === topUsers.length - 1;
            const color = stringToColor(user);
            const values = userChartData.map(d => d[user]).filter(Boolean);
            const latestValue = values[values.length - 1] || 0;
            const avg = values.length
              ? (values.reduce((a, b) => Number(a) + Number(b), 0) as number) / values.length
              : 0;
            const min = values.length ? Math.min(...values.map(Number)) : 0;
            const max = values.length ? Math.max(...values.map(Number)) : 0;

            return {
              name: user,
              color,
              min,
              avg,
              max,
              last: latestValue,
              isHidden,
              isHighlighted: isOnlyVisible,
              onClick: e => handleLegendClick(e, { value: user, type: 'user' }),
            };
          })}
        />

        {/* Contributing Users Chart */}
        <ChartWithStats
          title={
            <a
              href="#contributing-users"
              id="contributing-users"
              onClick={e => {
                e.preventDefault();
                scrollToSection('contributing-users');
              }}
              className="chart-title"
            >
              Contributing Users
            </a>
          }
          description="Number of unique users contributing nodes over time."
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={userChartData}
                margin={{
                  top: 20,
                  right: 10,
                  left: 25,
                  bottom: 40,
                }}
              >
                <XAxis
                  dataKey="time"
                  stroke="currentColor"
                  tickFormatter={str => {
                    const date = new Date(str * 1000);
                    return currentWindow?.step === '1h'
                      ? date.toLocaleTimeString()
                      : date.toLocaleDateString();
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: 'Time',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fill: 'currentColor', fontSize: 12 },
                  }}
                />
                <YAxis
                  stroke="currentColor"
                  label={{
                    value: 'Number of Users',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: 'currentColor', fontSize: 12 },
                    offset: -10,
                  }}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f',
                    fontSize: '12px',
                  }}
                  labelFormatter={value => new Date(value * 1000).toLocaleString()}
                  formatter={(value: number) => [value, 'Users']}
                />
                <Line
                  type="monotone"
                  dataKey="uniqueUsers"
                  name="Users"
                  stroke="#ff2b92"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
          series={[
            {
              name: 'Users',
              color: '#ff2b92',
              min: Math.min(...userChartData.map(d => Number(d.uniqueUsers))),
              avg:
                userChartData.reduce((sum, d) => sum + Number(d.uniqueUsers), 0) /
                userChartData.length,
              max: Math.max(...userChartData.map(d => Number(d.uniqueUsers))),
              last: userChartData[userChartData.length - 1].uniqueUsers,
              isHidden: false,
              isHighlighted: false,
              onClick: () => {},
            },
          ]}
        />
      </div>
    </div>
  );
};
