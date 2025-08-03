import React from 'react';
import Chart from 'react-apexcharts';

// Gráfico de barras minimalista
export const MinimalBarChart = ({ data, title }) => {
  // Procesar datos para el formato correcto
  const processedData = data && data.length > 0 ? data : [
    { name: 'Electrónicos', value: 15000 },
    { name: 'Ropa', value: 8500 },
    { name: 'Hogar', value: 12000 },
    { name: 'Deportes', value: 6500 }
  ];

  const options = {
    chart: {
      type: 'bar',
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    colors: ['#546E7A', '#26A69A', '#FF7043', '#AB47BC'],
    xaxis: {
      categories: processedData.map(item => item.name),
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
        },
        formatter: function (val) {
          return '$' + val.toLocaleString();
        }
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
          }).format(val);
        }
      },
      theme: 'dark'
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
    }
  };

  const series = [{
    name: 'Ventas',
    data: processedData.map(item => item.value)
  }];

  return (
    <div className="apex-chart-container">
      <Chart
        options={options}
        series={series}
        type="bar"
        height={300}
      />
    </div>
  );
};

// Gráfico de barras avanzado con más opciones
export const BarChart = ({ data, title, height = 300 }) => {
  const processedData = data && data.length > 0 ? data : [
    { label: 'Producto A', value: 15000 },
    { label: 'Producto B', value: 8500 },
    { label: 'Producto C', value: 12000 }
  ];

  const options = {
    chart: {
      type: 'bar',
      height: height,
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          notation: 'compact'
        }).format(val);
      },
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ['#304758']
      }
    },
    xaxis: {
      categories: processedData.map(item => item.label),
      position: 'bottom',
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
      labels: {
        style: {
          colors: '#8e8da4',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: function (val) {
          return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            notation: 'compact'
          }).format(val);
        },
        style: {
          colors: '#8e8da4',
          fontSize: '12px'
        }
      }
    },
    grid: {
      borderColor: '#40475D',
      strokeDashArray: 4
    },
    colors: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14', '#20c997', '#6c757d'],
    tooltip: {
      y: {
        formatter: function (val) {
          return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
          }).format(val);
        }
      },
      theme: 'dark'
    }
  };

  const series = [{
    name: 'Ingresos',
    data: processedData.map(item => item.value)
  }];

  return (
    <div className="apex-chart-container">
      <Chart
        options={options}
        series={series}
        type="bar"
        height={height}
      />
    </div>
  );
};
