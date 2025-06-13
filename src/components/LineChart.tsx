import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    borderColor: string;
    backgroundColor: string;
    borderDash?: number[];
    showLine?: boolean;
    pointRadius?: number;
    pointHoverRadius?: number;
    pointStyle?: string;
    tension?: number;
    spanGaps?: boolean;
    order?: number;
  }[];
  showMedicationPoints?: boolean;
  medicationData?: Array<{
    x: number;
    y: number;
    date: string;
    takenCount: number;
    totalCount: number;
    medications: string[];
  }>;
}

const LineChart: React.FC<LineChartProps> = ({ 
  title, 
  labels, 
  datasets, 
  showMedicationPoints = false,
  medicationData = []
}) => {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        display: false, // We'll use custom legend
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#334155',
        bodyColor: '#334155',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 6,
        filter: function(tooltipItem) {
          // Only show medication tooltips for medication points
          if (tooltipItem.dataset.label === 'Medication Taken') {
            return tooltipItem.parsed.y !== null;
          }
          // Show severity tooltips for non-null values
          return tooltipItem.parsed.y !== null;
        },
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label === 'Medication Taken' && value !== null) {
              // Find the medication data for this point
              const pointIndex = context.dataIndex;
              const medPoint = medicationData.find(point => point && point.x === pointIndex);
              
              if (medPoint) {
                return [
                  `Medications taken (${medPoint.takenCount}/${medPoint.totalCount}):`,
                  ...medPoint.medications.map(med => `• ${med}`)
                ];
              }
              return 'Medication taken';
            } else if (label === 'Severity' && value !== null) {
              const severityLabels = ['', 'Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme'];
              return `Severity: ${value} (${severityLabels[value] || value})`;
            }
            
            return null; // Don't show tooltip for null values
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
      },
      y: {
        beginAtZero: true,
        min: 0,
        max: 5.5, // Increased from 5 to 5.5 to give more breathing room at the top
        ticks: {
          stepSize: 1,
          callback: function(value) {
            if (value === 0) return '';
            if (value > 5) return ''; // Don't show labels above 5
            
            const labels = ['', 'Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme'];
            return labels[value as number] || value;
          }
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
      },
    },
    elements: {
      line: {
        tension: 0.2,
      },
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
    layout: {
      padding: {
        top: 10, // Add some padding at the top
        bottom: 10,
        left: 10,
        right: 10
      }
    }
  };

  const data = {
    labels,
    datasets,
  };

  return (
    <div style={{ height: '320px' }}> {/* Increased height slightly from 300px to 320px */}
      <Line options={options} data={data} />
    </div>
  );
};

export default LineChart;