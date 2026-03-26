"use client";
import React from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

const SkillChart = ({ chartData }) => {
  if (!chartData) return null;

  const isRadar = chartData.type === "radar";

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 14 },
        bodyFont: { size: 14 },
        displayColors: false,
      },
    },
    scales: isRadar
      ? {
          r: {
            angleLines: { color: "rgba(255, 255, 255, 0.1)" },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            pointLabels: {
              color: "#94a3b8",
              font: { size: 11, weight: "bold" },
            },
            ticks: {
              display: false,
              stepSize: 20,
            },
            suggestedMin: 0,
            suggestedMax: 100,
          },
        }
      : {
          x: {
            grid: { display: false },
            ticks: { color: "#94a3b8", font: { size: 11 } },
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8", font: { size: 11 } },
            suggestedMin: 0,
            suggestedMax: 80,
          },
        },
  };

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: chartData.datasetLabel || "Score",
        data: chartData.data,
        backgroundColor: isRadar
          ? "rgba(16, 185, 129, 0.2)" // Emerald-500 with opacity
          : chartData.data.map((_, i) => (i === 0 ? "#10b981" : "rgba(16, 185, 129, 0.4)")),
        borderColor: "#10b981",
        borderWidth: 2,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#10b981",
      },
    ],
  };

  return (
    <div className="chart-container" style={{ position: "relative", height: "180px", width: "100%", marginTop: "10px" }}>
      {isRadar ? (
        <Radar data={data} options={options} />
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
  );
};

export default SkillChart;
