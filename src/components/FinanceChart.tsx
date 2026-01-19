import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RekapSaldo {
  kelas: number;
  gender: "ikhwan" | "akhwat";
  saldo: number;
}

interface FinanceChartProps {
  data: RekapSaldo[]; 
}

const FinanceChart = ({ data }: FinanceChartProps) => {
  
  // 1. OLAH DATA
  const chartData = [7, 8, 9, 10, 11, 12].map((kelas) => {
    const saldoIkhwan = data.find((d) => d.kelas === kelas && d.gender === "ikhwan")?.saldo || 0;
    const saldoAkhwat = data.find((d) => d.kelas === kelas && d.gender === "akhwat")?.saldo || 0;

    return {
      name: `Kls ${kelas}`,
      Ikhwan: saldoIkhwan,
      Akhwat: saldoAkhwat,
    };
  });

  // Format Angka Sumbu Y (Misal: 1jt)
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
    return value.toString();
  };

  // Format Angka Tooltip (Misal: Rp 1.000.000)
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 5,
          }}
          barGap={2} // Jarak antar batang Ikhwan & Akhwat dipersempit biar nempel
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 'bold' }} // Tebalin font sumbu X
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={formatYAxis} 
          />
          <Tooltip
            cursor={{ fill: '#f3f4f6' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
                    <p className="font-bold text-gray-800 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-500 capitalize">{entry.name}:</span>
                        <span className="font-bold text-gray-700">
                          {formatRupiah(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="top" 
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }}
          />
          
          {/* 🔥 BATANG IKHWAN (HIJAU) - LEBIH GENDUT */}
          <Bar 
            dataKey="Ikhwan" 
            fill="#16a34a" 
            radius={[6, 6, 0, 0]} // Sudut atas agak bulat biar manis
            barSize={45} // 🔥 GANTI JADI 45 (Biar Gendut)
            name="Ikhwan"
          />
          
          {/* 🔥 BATANG AKHWAT (PINK) - LEBIH GENDUT */}
          <Bar 
            dataKey="Akhwat" 
            fill="#db2777" 
            radius={[6, 6, 0, 0]} // Sudut atas agak bulat
            barSize={45} // 🔥 GANTI JADI 45 (Biar Gendut)
            name="Akhwat"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;
