import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface ChartEntry {
  name: string
  count: number
  fill: string
}

export default function ApplicationChart({ data, total }: { data: ChartEntry[]; total: number }) {
  return (
    <div className="chart-donut">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" innerRadius={30} outerRadius={45} paddingAngle={4} stroke="none">
            {data.map((item) => <Cell key={item.name} fill={item.fill} />)}
          </Pie>
          <Tooltip formatter={(value) => [value, 'Applications']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-label"><strong>{total}</strong><span>total</span></div>
    </div>
  )
}
