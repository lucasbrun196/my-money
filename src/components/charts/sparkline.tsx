/**
 * Minigráfico de linha em SVG puro (sem Recharts): leve o bastante para
 * aparecer em listas. A linha se "desenha" na entrada.
 */
export function Sparkline({
  values,
  color = "currentColor",
  width = 96,
  height = 28,
  className,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color} opacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        className="transition-[stroke-dashoffset] duration-[1200ms] ease-out-expo starting:[stroke-dashoffset:1]"
        style={{ strokeDashoffset: 0 }}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
