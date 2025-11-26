import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { Report } from '../../types';

const ReportPage: React.FC = () => {
  const { workspaceId, reportId } = useParams<{ workspaceId: string; reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    try {
      const data = await apiService.getReport(workspaceId!, reportId!);
      setReport(data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError(err?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, reportId]);

  useEffect(() => {
    if (!workspaceId || !reportId) return;
    fetchReport();
    const interval = setInterval(fetchReport, 3000);
    return () => clearInterval(interval);
  }, [reportId, workspaceId, fetchReport]);

  const exportToPDF = async () => {
    if (!reportRef.current || !report) return;

    try {
      setExporting(true);
      // Load html2pdf dynamically from CDN if not available via npm
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

  const shareReport = async () => {
    if (!workspaceId || !reportId) return;

    try {
      const result = await apiService.shareReport(workspaceId, reportId);
      // Copy link to clipboard
      navigator.clipboard.writeText(result.shareUrl);
      alert('Share link copied to clipboard!');
    } catch (err) {
      console.error('Error sharing report:', err);
      setError('Failed to share report');
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
          <p className="text-gray-600">{error || 'The report could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  const isProcessing = report.status === 'draft';
  const isFailed = report.status === 'failed';

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
            <div className="flex gap-2">
              {report.status === 'completed' && (
                <>
                  <button
                    onClick={shareReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.589 12.430 10 11.129 10 9.5 10 5.910 7.239 3 3.5 3S-3 5.910-3 9.5 0.239 16 3.5 16c1.629 0 2.930-.411 3.684-1.342m0 0l2.921 2.921m0 0l-2.921-2.921m2.921 2.921A9.723 9.723 0 0021 12a9.723 9.723 0 00-6.612-9.066m0 0L9.265 3.265m0 0A9.745 9.745 0 0112 3c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12m0 0l2.921 2.921" />
                    </svg>
                    Share
                  </button>
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
                </>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {isProcessing && (
              <div className="flex items-center gap-2 text-yellow-600">
                <div className="animate-spin w-4 h-4 border-2 border-yellow-200 border-t-yellow-600 rounded-full"></div>
                <span className="text-sm">Generating report...</span>
              </div>
            )}
            {isFailed && (
              <div className="flex items-center gap-2 text-red-600">
                <span className="text-sm">❌ {report.error || 'Report generation failed'}</span>
              </div>
            )}
            {report.status === 'completed' && (
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-sm">✓ Report generated</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      {report.status === 'completed' && (
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

            {/* Chart Recommendations */}
            {report.sections && report.sections.find(s => s.type === 'chart') && (
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Recommended Visualizations</h2>
                <p className="text-gray-700">
                  {report.sections.find(s => s.type === 'chart')?.content}
                </p>
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
      )}
    </div>
  );
};

export default ReportPage;
