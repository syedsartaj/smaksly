'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
}

interface PageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain');

  const [data, setData] = useState<AnalyticsData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;

    const fetchAnalytics = async () => {
      const [dateRes, pageRes] = await Promise.all([
        fetch(`/api/search-console?domain=${encodeURIComponent(domain)}`),
        fetch(`/api/search-console?domain=${encodeURIComponent(domain)}&type=pages`)
      ]);

      const dateJson = await dateRes.json();
      const pageJson = await pageRes.json();
      console.log(pageJson.data);
      setData(dateJson.data || []);
      setPages(pageJson.data || []);
      setLoading(false);
    };

    fetchAnalytics();
  }, [domain]);

  return (
    <div className="p-6 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-4">📈 Analytics for {domain}</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="clicks" stroke="#8884d8" name="Clicks" />
              <Line type="monotone" dataKey="impressions" stroke="#82ca9d" name="Impressions" />
              <Line type="monotone" dataKey="ctr" stroke="#ffc658" name="CTR" />
              <Line type="monotone" dataKey="position" stroke="#ff7300" name="Position" />
            </LineChart>
          </ResponsiveContainer>

          <h2 className="text-xl font-semibold mt-6 mb-2">📊 Daily Data</h2>
          <table className="w-full border border-gray-300 mb-8">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Clicks</th>
                <th className="p-2">Impressions</th>
                <th className="p-2">CTR (%)</th>
                <th className="p-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{row.date}</td>
                  <td className="p-2">{row.clicks}</td>
                  <td className="p-2">{row.impressions}</td>
                  <td className="p-2">{(row.ctr * 100).toFixed(2)}</td>
                  <td className="p-2">{row.position.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-xl font-semibold mb-2">📄 Page-wise Data</h2>
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Page URL</th>
                <th className="p-2">Clicks</th>
                <th className="p-2">Impressions</th>
                <th className="p-2">CTR (%)</th>
                <th className="p-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 text-blue-600 underline break-all">{row.page}</td>
                  <td className="p-2">{row.clicks}</td>
                  <td className="p-2">{row.impressions}</td>
                  <td className="p-2">{(row.ctr * 100).toFixed(2)}</td>
                  <td className="p-2">{row.position.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
