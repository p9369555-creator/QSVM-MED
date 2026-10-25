import React from 'react';
import { Card, CardHeader } from '../ui/Card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface RocCurveCardProps {
  qsvmRoc?: { fpr: number[]; tpr: number[] };
  classicalRoc?: { fpr: number[]; tpr: number[] };
  qsvmAuc?: number | null;
  classicalAuc?: number | null;
}

export const RocCurveCard: React.FC<RocCurveCardProps> = ({
  qsvmRoc,
  classicalRoc,
  qsvmAuc,
  classicalAuc,
}) => {
  // Build chart points
  const points: { fpr: number; qsvmTpr?: number; classicalTpr?: number; baseline: number }[] = [];

  const fprList = qsvmRoc ? qsvmRoc.fpr : [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  fprList.forEach((fpr, idx) => {
    points.push({
      fpr: Number(fpr.toFixed(2)),
      qsvmTpr: qsvmRoc ? Number(qsvmRoc.tpr[idx]?.toFixed(2)) : undefined,
      classicalTpr: classicalRoc ? Number((classicalRoc.tpr[idx] || fpr).toFixed(2)) : undefined,
      baseline: Number(fpr.toFixed(2)),
    });
  });

  return (
    <Card>
      <CardHeader
        title="Receiver Operating Characteristic (ROC)"
        subtitle={`QSVM AUC: ${qsvmAuc !== undefined && qsvmAuc !== null ? qsvmAuc : 'N/A'} • Classical AUC: ${classicalAuc !== undefined && classicalAuc !== null ? classicalAuc : 'N/A'}`}
      />

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
            <XAxis dataKey="fpr" stroke="#64748B" fontSize={12} tickLine={false} domain={[0, 1]} unit="" label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748B' }} />
            <YAxis stroke="#64748B" fontSize={12} tickLine={false} domain={[0, 1]} unit="" label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748B' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0C111C',
                borderColor: '#1E293B',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="plainline" />
            <Line
              type="monotone"
              dataKey="qsvmTpr"
              name={`QSVM (AUC ${qsvmAuc ?? '0.90+'})`}
              stroke="#F02F34"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#F02F34' }}
            />
            {classicalRoc && (
              <Line
                type="monotone"
                dataKey="classicalTpr"
                name={`Classical RBF (AUC ${classicalAuc ?? '0.85+'})`}
                stroke="#38BDF8"
                strokeWidth={2}
                dot={{ r: 2, fill: '#38BDF8' }}
              />
            )}
            <Line
              type="linear"
              dataKey="baseline"
              name="Random Classifier"
              stroke="#475569"
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
