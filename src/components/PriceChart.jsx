import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { airtableService } from '../api/airtable';

const PriceChart = ({ address }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const history = await airtableService.getPriceHistory(address);
      setData(history);
      setLoading(false);
    };
    if (address) {
      fetchHistory();
    }
  }, [address]);

  if (loading) return <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>가격 추이 분석 중...</div>;
  if (data.length === 0) return <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>과거 가격 데이터가 없습니다.</div>;

  return (
    <div style={{ width: '100%', height: '150px', marginTop: '15px' }}>
      <h4 style={{ fontSize: '0.8rem', marginBottom: '8px', color: '#64748b' }}>최근 가격 변동 (만원)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10 }} 
            tickFormatter={(str) => str.split('-').slice(1).join('/')}
          />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#6366f1" 
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
