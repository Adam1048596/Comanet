import { LineChart, Line } from 'recharts'

export default function MetricSparkline({ data }: { data: { value: number }[] }) {
  if (!data || data.length === 0) return <div className="h-8 w-20" />
  return (
    <LineChart width={80} height={28} data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke="#008060"
        strokeWidth={1.5}
        dot={false}
      />
    </LineChart>
  )
}