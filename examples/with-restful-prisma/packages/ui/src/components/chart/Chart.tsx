import React from 'react';
import {
  Bar,
  Line,
  Pie,
  Doughnut,
  PolarArea,
  Radar,
  Scatter,
  Bubble,
} from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  registerables,
  ChartData,
  // ChartOptions,
} from 'chart.js';

ChartJS.register(
  ...registerables,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'doughnut'
  | 'polarArea'
  | 'radar'
  | 'scatter'
  | 'bubble';

interface ChartProps {
  type?: ChartType;
  data: ChartData<any>;
  options?: any;
}

export default function Chart({ type, data, options, ...props }: ChartProps) {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={data} options={options} />;
      case 'line':
        return <Line data={data} options={options} />;
      case 'pie':
        return <Pie data={data} options={options} />;
      case 'doughnut':
        return <Doughnut data={data} options={options} />;
      case 'polarArea':
        return <PolarArea data={data} options={options} />;
      case 'radar':
        return <Radar data={data} options={options} />;
      case 'scatter':
        return <Scatter data={data} options={options} />;
      case 'bubble':
        return <Bubble data={data} options={options} />;
      default:
        return null;
    }
  };

  return <div className="w-full h-full">{renderChart()}</div>;
}