import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ModelMetrics } from '../../types';

interface MetricsComparisonChartProps {
  qsvmMetrics: ModelMetrics;
  classicalMetrics?: ModelMetrics;
  classicalKernelName?: string;
}

export const MetricsComparisonChart: React.FC<MetricsComparisonChartProps> = ({
  qsvmMetrics,
  classicalMetrics,
  classicalKernelName = 'rbf'
}) => {
  const data = [
    {
      metric: 'Accuracy',
      QSVM: Number((qsvmMetrics.accuracy * 100).toFixed(1)),
      Classical: classicalMetrics ? Number((classicalMetrics.accuracy * 100).toFixed(1)) : 0,
    },
    {
      metric: 'Precision',
      QSVM: Number((qsvmMetrics.precision * 100).toFixed(1)),
      Classical: classicalMetrics ? Number((classicalMetrics.precision * 100).toFixed(1)) : 0,
    },
    {
      metric: 'Recall',
      QSVM: Number((qsvmMetrics.recall * 100).toFixed(1)),
      Classical: classicalMetrics ? Number((classicalMetrics.recall * 100).toFixed(1)) : 0,
    },
    {
      metric: 'F1 Score',
      QSVM: Number((qsvmMetrics.f1_score * 100).toFixed(1)),
      Classical: classicalMetrics ? Number((classicalMetrics.f1_score * 100).toFixed(1)) : 0,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Model Performance Metrics Comparison"
        subtitle={`QSVM (Quantum Kernel) vs Classical SVM (${classicalKernelName.toUpperCase()})`}
      />

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
            <XAxis dataKey="metric" stroke="#64748B" fontSize={12} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={12} tickLine={false} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0C111C',
                borderColor: '#1E293B',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '12px'
              }}
              formatter={(val: number) => [`${val}%`, '']}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
              iconType="circle"
            />
            <Bar dataKey="QSVM" fill="#F02F34" radius={[4, 4, 0, 0]} name="Quantum SVM (Fidelity Kernel)" />
            {classicalMetrics && (
              <Bar dataKey="Classical" fill="#38BDF8" radius={[4, 4, 0, 0]} name={`Classical SVM (${classicalKernelName.toUpperCase()})`} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
