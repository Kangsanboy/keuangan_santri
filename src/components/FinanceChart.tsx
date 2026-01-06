import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ================= PROPS ================= */
interface Props {
  pemasukan: number;
  pengeluaran: number;
}

/* ================= FORMAT RUPIAH ================= */
const formatRupiah = (value: number) =>
  `Rp ${value.toLocaleString("id-ID")}`;

const FinanceChart = ({ pemasukan, pengeluaran }: Props) => {
  const data = [
    {
      name: "Pemasukan",
      value: pemasukan,
    },
    {
      name: "Pengeluaran",
      value: pengeluaran,
    },
  ];

  return (
    <div className="w-full h-[280px] md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barCategoryGap={40}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tickFormatter={(v) =>
              v >= 1000 ? `${v / 1000}k` : v
            }
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            formatter={(value: number) => formatRupiah(value)}
            cursor={{ fill: "rgba(22, 163, 74, 0.08)" }}
          />

          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            fill="#16a34a"
            name="Nominal"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;