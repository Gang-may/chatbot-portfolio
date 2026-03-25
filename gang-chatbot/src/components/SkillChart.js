"use client";
/**
 * SkillChart.js
 * ------------------------------------------------------------------
 * FAQ 캐시에서 type: "chart" 응답이 왔을 때 채팅 말풍선 안에
 * 렌더링되는 Chart.js 기반 차트 컴포넌트입니다.
 *
 * chartData.chartType === "radar"  → Radar (방사형) 차트
 * chartData.chartType === "bar"    → Bar (가로 막대) 차트
 *
 * ▶ 의존성: chart.js, react-chartjs-2 (package.json에 이미 설치됨)
 * ------------------------------------------------------------------
 */
import {
  Chart as ChartJS,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";

// Chart.js 컴포넌트 전역 등록 (사용할 구성요소만 등록하여 번들 최소화)
ChartJS.register(
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// ── 레이더 차트 기본 옵션 ────────────────────────────────────────────
const radarOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      labels: {
        color: "#a1e8df",       // 범례 텍스트 색 (다크 모드 친화)
        font: { size: 11 },
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.r}점`,
      },
    },
  },
  scales: {
    r: {
      min: 0,
      max: 100,
      ticks: {
        stepSize: 25,
        color: "#6b7280",       // 눈금 숫자 색
        font: { size: 9 },
        backdropColor: "transparent",
      },
      grid: { color: "rgba(255,255,255,0.08)" },
      pointLabels: {
        color: "#e5e7eb",
        font: { size: 11 },
      },
    },
  },
};

// ── 막대 차트 기본 옵션 ────────────────────────────────────────────
const barOptions = {
  indexAxis: "y",               // 가로 막대 (horizontal bar)
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.x}점`,
      },
    },
  },
  scales: {
    x: {
      min: 0,
      max: 100,
      ticks: { color: "#9ca3af", font: { size: 10 } },
      grid: { color: "rgba(255,255,255,0.06)" },
    },
    y: {
      ticks: { color: "#e5e7eb", font: { size: 11 } },
      grid: { display: false },
    },
  },
};

export default function SkillChart({ chartData }) {
  if (!chartData) return null;

  const { chartType, title, labels, datasets } = chartData;
  const data = { labels, datasets };

  return (
    <div style={{ width: "100%", maxWidth: "360px", padding: "8px 0" }}>
      {title && (
        <p
          style={{
            color: "#a1e8df",
            fontWeight: 600,
            marginBottom: "10px",
            fontSize: "0.9rem",
          }}
        >
          {title}
        </p>
      )}

      {chartType === "radar" && (
        <Radar data={data} options={radarOptions} />
      )}
      {chartType === "bar" && (
        <Bar data={data} options={barOptions} />
      )}
    </div>
  );
}
