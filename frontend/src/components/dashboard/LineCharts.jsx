import React from 'react';
import Chart from 'react-apexcharts';

// Gráfico de líneas para ventas en tiempo real
export const RealtimeLineChart = ({ data, title }) => {
  const options = {
    chart: {
      id: 'realtime-line',
      type: 'line',
      animations: {
        enabled: true,
        easing: 'linear',
        dynamicAnimation: {
          speed: 1000
        }
      },
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      background: 'transparent'
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    colors: ['#00E396', '#FEB019'],
    markers: {
      size: 0
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#8e8da4',
          fontSize: '12px'
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#8e8da4',
          fontSize: '12px'
        }
      }
    },
    legend: {
      show: false
    },
    grid: {
      show: true,
      borderColor: '#40475D',
      strokeDashArray: 0,
      position: 'back',
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark'
    }
  };

  const series = data || [
    {
      name: 'Ventas',
      data: generateTimeSeriesData()
    }
  ];

  return (
    <div className="apex-chart-container">
      <Chart
        options={options}
        series={series}
        type="line"
        height={300}
      />
    </div>
  );
};

// Gráfico de área para progreso
export const ProgressAreaChart = ({ data, title, showLabels = false }) => {
  const options = {
    chart: {
      type: 'area',
      sparkline: {
        enabled: !showLabels
      },
      background: 'transparent',
      toolbar: {
        show: false
      }
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    colors: ['#00E396'],
    tooltip: {
      enabled: true,
      theme: 'dark',
      y: {
        formatter: function (val) {
          return val + '%';
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: showLabels ? {
      categories: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
      labels: {
        style: {
          colors: '#8e8da4',
          fontSize: '10px'
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    } : {},
    yaxis: showLabels ? {
      labels: {
        style: {
          colors: '#8e8da4',
          fontSize: '10px'
        },
        formatter: function (val) {
          return val + '%';
        }
      },
      min: 0,
      max: 100
    } : {},
    grid: showLabels ? {
      show: true,
      borderColor: '#40475D',
      strokeDashArray: 0,
      position: 'back',
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    } : { show: false }
  };

  const series = data || [
    {
      name: 'Progreso',
      data: [65, 78, 85, 92]
    }
  ];

  return (
    <div className={`apex-chart-container ${showLabels ? '' : 'small'}`}>
      <Chart
        options={options}
        series={series}
        type="area"
        height={showLabels ? 200 : 120}
      />
    </div>
  );
};

// Gráfico de tendencia de inventario
export const InventoryTrendChart = ({ data, title }) => {
  const options = {
    chart: {
      type: 'line',
      sparkline: {
        enabled: true
      },
      background: 'transparent'
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    colors: ['#FF6B6B'],
    tooltip: {
      enabled: true,
      theme: 'dark',
      y: {
        formatter: function (val) {
          return val + ' productos';
        }
      }
    },
    markers: {
      size: 4,
      colors: ['#FF6B6B'],
      strokeColors: '#fff',
      strokeWidth: 2
    }
  };

  const series = data || [
    {
      name: 'Stock Bajo',
      data: [12, 8, 15, 6, 9, 11, 7]
    }
  ];

  return (
    <div className="apex-chart-container small">
      <Chart
        options={options}
        series={series}
        type="line"
        height={120}
      />
    </div>
  );
};

// Función helper para generar datos de time series
function generateTimeSeriesData() {
  const data = [];
  const baseTime = new Date().getTime();
  
  for (let i = 0; i < 24; i++) {
    data.push([
      baseTime + (i * 3600000), // cada hora
      Math.floor(Math.random() * (500 - 100 + 1)) + 100
    ]);
  }
  
  return data;
}
