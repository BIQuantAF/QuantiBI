import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../../services/api';
import { Report } from '../../types/index';

const PublicReportPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    try {
      const data = await apiService.getPublicReport(shareToken!);
      setReport(data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching public report:', err);
      setError(err?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  useEffect(() => {
    if (!shareToken) return;
    fetchReport();
  }, [shareToken, fetchReport]);

  const exportToPDF = async () => {
    if (!reportRef.current || !report) return;

    try {
      setExporting(true);
      // Load html2pdf dynamically from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        const html2pdf = (window as any).html2pdf;
        const options = {
          margin: 10,
          filename: `${report.title}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        };
        html2pdf().set(options).from(reportRef.current).save();
        setExporting(false);
      };
      script.onerror = () => {
        setError('Failed to load PDF export library');
        setExporting(false);
      };
      document.body.appendChild(script);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      setError('Failed to export PDF');
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">Loading report...</div>
          <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600">{error || 'This report is no longer available or was not shared.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{report.title}</h1>
              {report.description && (
                <p className="text-gray-600">{report.description}</p>
              )}
            </div>
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {exporting ? 'Exporting...' : 'Download PDF'}
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Generated on {new Date(report.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Printable content */}
        <div ref={reportRef} className="bg-white p-8 rounded-lg shadow-sm">
          {/* Title page */}
          <div className="text-center mb-12 pb-12 border-b-2 border-gray-200">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">{report.title}</h1>
            {report.description && (
              <p className="text-xl text-gray-600 mb-4">{report.description}</p>
            )}
            <p className="text-sm text-gray-500">
              Generated on {new Date(report.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Executive Summary */}
          {report.summary && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Executive Summary</h2>
              <p className="text-lg text-gray-700 leading-relaxed">{report.summary}</p>
            </section>
          )}

          {/* Key Metrics */}
          {report.sections && report.sections.filter(s => s.type === 'metric').length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.sections
                  .filter(s => s.type === 'metric')
                  .map((section, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg">
                      <p className="text-gray-600 text-sm font-medium mb-2">{section.metrics?.label}</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {section.metrics?.value}
                      </p>
                      {section.metrics?.format && (
                        <p className="text-xs text-gray-500 mt-1">{section.metrics.format}</p>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Key Insights */}
          {report.insights && report.insights.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Insights</h2>
              <div className="space-y-4">
                {report.insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white">
                        <span className="text-sm font-bold">{idx + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700">{insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Conclusion */}
          <section className="border-t-2 border-gray-200 pt-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Conclusion</h2>
            <p className="text-gray-700 leading-relaxed">
              This report provides a comprehensive analysis of your dataset with actionable insights and key metrics to support informed decision-making.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PublicReportPage;
