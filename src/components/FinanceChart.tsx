import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  pemasukan: number;
  pengeluaran: number;
}

const FinanceChart = ({ pemasukan, pengeluaran }: Props) => {
  const data = [
    { name: "Pemasukan", value: pemasukan },
    { name: "Pengeluaran", value: pengeluaran },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grafik Keuangan</CardTitle>
      </CardHeader>
      <CardContent style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FinanceChart;