"use client";

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  ResponsiveContainer 
} from 'recharts';

interface WeeklyChartProps {
  weeklyData: any[];
  activeMetric: 'Calories' | 'Protein' | 'Fats' | 'Fiber';
  targetValue: number;
  metricUnit: { [key: string]: string };
  metricColor: { [key: string]: string };
}

function WeeklyChartComponent({ 
  weeklyData, 
  activeMetric, 
  targetValue, 
  metricUnit, 
  metricColor 
}: WeeklyChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E7EB" opacity={0.3} />
        <XAxis dataKey="name" stroke="#9A9AA2" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#9A9AA2" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip 
          cursor={{fill: '#f3f4f6', opacity: 0.4}}
          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E7EB', borderRadius: '16px', color: '#242428', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          formatter={(value: any) => [`${value} ${metricUnit[activeMetric]}`, activeMetric]}
        />
        <ReferenceLine 
          y={targetValue} 
          stroke="#ef4444" 
          strokeDasharray="4 4" 
          label={{ value: `Target`, position: 'top', fill: '#f87171', fontSize: 10, fontWeight: 'bold' }} 
        />
        <Bar 
          dataKey={activeMetric} 
          fill={metricColor[activeMetric]} 
          radius={[6, 6, 0, 0]} 
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default React.memo(WeeklyChartComponent);
