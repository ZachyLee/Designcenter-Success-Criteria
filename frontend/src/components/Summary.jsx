import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Summary = () => {
  const { responseId } = useParams();
  const navigate = useNavigate();
  const [responseData, setResponseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessEmail, setAccessEmail] = useState('');
  const [accessMessage, setAccessMessage] = useState('');
  const [submittingAccess, setSubmittingAccess] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    fetchResponseData();
  }, [responseId]);

  const fetchResponseData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/responses/${responseId}`);
      setResponseData(response.data.data);
    } catch (error) {
      console.error('Error fetching response data:', error);
      setError('Failed to load response data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const response = await axios.get(`/api/responses/${responseId}/pdf`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `checklist-report-${responseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getAnswerStats = () => {
    if (!responseData?.answers) return { yes: 0, no: 0, na: 0 };
    
    return responseData.answers.reduce((stats, answer) => {
      if (answer.answer === 'Yes') stats.yes++;
      else if (answer.answer === 'No') stats.no++;
      else if (answer.answer === 'N/A') stats.na++;
      return stats;
    }, { yes: 0, no: 0, na: 0 });
  };

  const groupAnswersByArea = () => {
    if (!responseData?.answers) return {};
    
    return responseData.answers.reduce((groups, answer) => {
      const area = answer.area || 'Other';
      if (!groups[area]) groups[area] = [];
      groups[area].push(answer);
      return groups;
    }, {});
  };

  // Certification section functions
  const handleCertificationClick = () => {
    setHasInteracted(true);
    window.open('https://cadcertification.sw.siemens.com/solid-edge/', '_blank');
  };

  const handleAcademyClick = () => {
    setHasInteracted(true);
    window.open('https://learn.sw.siemens.com/library/solid-edge-for-education-and-community/VyR_oDmjP', '_blank');
  };

  const handleRequestAccess = () => {
    setHasInteracted(true);
    setAccessEmail(sessionStorage.getItem('userEmail') || '');
    setShowAccessModal(true);
  };

  const handleSubmitAccessRequest = async () => {
    try {
      setSubmittingAccess(true);
      
      const response = await axios.post('/api/responses/access-request', {
        email: accessEmail,
        message: accessMessage
      });

      if (response.data.success) {
        alert('Thanks! We\'ll email your access code shortly.');
        setShowAccessModal(false);
        setAccessEmail('');
        setAccessMessage('');
      } else {
        alert('Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting access request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmittingAccess(false);
    }
  };

  // Show reminder after 5 seconds if user hasn't interacted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasInteracted && !showReminder) {
        setShowReminder(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [hasInteracted, showReminder]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neumo-card text-center">
          <div className="neumo-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error || !responseData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="neumo-card max-w-md text-center">
          <div className="neumo-alert error mb-4">
            <p>{error || 'Response not found'}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="neumo-button primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const { response, answers } = responseData;
  const language = response.language;
  const stats = getAnswerStats();
  const groupedAnswers = groupAnswersByArea();
  const total = stats.yes + stats.no + stats.na;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="neumo-card mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {language === 'EN' ? 'Assessment Summary' : 'Ringkasan Penilaian'}
              </h1>
              <div className="text-gray-600">
                <p><strong>{language === 'EN' ? 'Email:' : 'Email:'}</strong> {response.email}</p>
                <p><strong>{language === 'EN' ? 'Language:' : 'Bahasa:'}</strong> {language === 'EN' ? 'English' : 'Bahasa Indonesia'}</p>
                <p><strong>{language === 'EN' ? 'Date:' : 'Tanggal:'}</strong> {new Date(response.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="neumo-button success disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <div className="flex items-center">
                    <div className="neumo-spinner mr-2"></div>
                    {language === 'EN' ? 'Downloading...' : 'Mengunduh...'}
                  </div>
                ) : (
                  language === 'EN' ? 'Download PDF' : 'Unduh PDF'
                )}
              </button>
              <button
                onClick={() => navigate('/')}
                className="neumo-button"
              >
                {language === 'EN' ? 'New Assessment' : 'Penilaian Baru'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="neumo-card mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {language === 'EN' ? 'Results Overview' : 'Ikhtisar Hasil'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-green-50 rounded-2xl">
              <div className="text-2xl font-bold text-green-600">{stats.yes}</div>
              <div className="text-sm text-green-700">
                {language === 'EN' ? 'Yes' : 'Ya'} ({total ? Math.round(stats.yes/total*100) : 0}%)
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-2xl">
              <div className="text-2xl font-bold text-red-600">{stats.no}</div>
              <div className="text-sm text-red-700">
                {language === 'EN' ? 'No' : 'Tidak'} ({total ? Math.round(stats.no/total*100) : 0}%)
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-2xl">
              <div className="text-2xl font-bold text-gray-600">{stats.na}</div>
              <div className="text-sm text-gray-700">
                N/A ({total ? Math.round(stats.na/total*100) : 0}%)
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-2xl">
              <div className="text-2xl font-bold text-blue-600">{total}</div>
              <div className="text-sm text-blue-700">
                {language === 'EN' ? 'Total Questions' : 'Total Pertanyaan'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex text-xs text-gray-600 mb-1">
              <span>{language === 'EN' ? 'Completion Rate' : 'Tingkat Penyelesaian'}</span>
              <span className="ml-auto">100%</span>
            </div>
            <div className="neumo-progress">
              <div className="neumo-progress-bar" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Certification Section */}
        <div className="neumo-card mt-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center">
              <span className="mr-2">🎓</span>
              {language === 'EN' ? 'Next Step: Keep learning, get certified with a Credly badge' : 'Langkah Selanjutnya: Terus belajar, dapatkan sertifikasi dengan lencana Credly'}
            </h2>
            <p className="text-gray-600">
              {language === 'EN' 
                ? 'Take your skills further with the official Siemens Solid Edge Certification and enhance your knowledge with free training via Siemens Xcelerator Academy.'
                : 'Tingkatkan keterampilan Anda dengan Sertifikasi Siemens Solid Edge resmi dan tingkatkan pengetahuan Anda dengan pelatihan gratis melalui Siemens Xcelerator Academy.'
              }
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Xcelerator Academy */}
            <div className="neumo-card p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Xcelerator Academy Online Training</h3>
              </div>
              
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="mr-2">📚</span>
                  {language === 'EN' ? 'On-demand, virtual, and in-person learning' : 'Pembelajaran sesuai permintaan, virtual, dan tatap muka'}
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🌍</span>
                  {language === 'EN' ? 'Free access to Solid Edge self-paced training for education & community users' : 'Akses gratis ke pelatihan Solid Edge mandiri untuk pengguna pendidikan & komunitas'}
                </li>
              </ul>

              <div className="space-y-4">
                <button
                  onClick={handleAcademyClick}
                  className="neumo-button primary w-full"
                >
                  {language === 'EN' ? 'Start Solid Edge Online Learning' : 'Mulai Pembelajaran Solid Edge Online'}
                </button>
                
                <button
                  onClick={handleRequestAccess}
                  className="neumo-button secondary w-full"
                >
                  {language === 'EN' ? 'Request Free Access Code' : 'Minta Kode Akses Gratis'}
                </button>
              </div>
            </div>

            {/* Solid Edge Certification */}
            <div className="neumo-card p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Solid Edge Certification</h3>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <span className="text-green-600 font-bold">✅ 100% Free</span>
                </div>
              </div>
              
              <ul className="text-sm text-gray-600 space-y-2 mb-4">
                <li className="flex items-center">
                  <span className="mr-2">🛠️</span>
                  {language === 'EN' ? 'Includes MCQs & 3D modeling' : 'Termasuk MCQ & pemodelan 3D'}
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🧑‍💼</span>
                  {language === 'EN' ? 'Earn a Credly digital badge recognized by employers' : 'Dapatkan lencana digital Credly yang diakui oleh pemberi kerja'}
                </li>
              </ul>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  {language === 'EN' 
                    ? 'A Credly badge is a verified digital credential that showcases your certified skills, making your achievements visible and trusted by employers on platforms like LinkedIn, resumes, and portfolios.'
                    : 'Lencana Credly adalah kredensial digital terverifikasi yang menampilkan keterampilan bersertifikat Anda, membuat pencapaian Anda terlihat dan dipercaya oleh pemberi kerja di platform seperti LinkedIn, resume, dan portofolio.'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleCertificationClick}
                  className="neumo-button primary w-full"
                >
                  {language === 'EN' ? 'Start Certification' : 'Mulai Sertifikasi'}
                </button>
                
                <button
                  onClick={() => {
                    setHasInteracted(true);
                    window.open('https://www.credly.com/organizations/siemens-sw/directory', '_blank');
                  }}
                  className="neumo-button secondary w-full"
                >
                  {language === 'EN' ? 'View Credly Badges' : 'Lihat Lencana Credly'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Results by Area */}
        <div className="space-y-6">
          {Object.entries(groupedAnswers).map(([area, areaAnswers]) => (
            <div key={area} className="neumo-card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{area}</h3>
              
              <div className="space-y-4">
                {areaAnswers.map((answer, index) => (
                  <div key={answer.id || index} className="border-l-4 border-gray-200 pl-4">
                    <div className="mb-2">
                      <h4 className="font-medium text-gray-800">{answer.activity}</h4>
                      <p className="text-sm text-gray-600 mt-1">{answer.criteria}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          {language === 'EN' ? 'Answer:' : 'Jawaban:'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          answer.answer === 'Yes' 
                            ? 'bg-green-100 text-green-800' 
                            : answer.answer === 'No'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {answer.answer === 'Yes' 
                            ? (language === 'EN' ? 'Yes' : 'Ya')
                            : answer.answer === 'No'
                            ? (language === 'EN' ? 'No' : 'Tidak')
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {answer.remarks && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">
                          {language === 'EN' ? 'Remarks:' : 'Keterangan:'}
                        </p>
                        <p className="text-sm text-gray-700">{answer.remarks}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>



        {/* Action Buttons */}
        <div className="neumo-card mt-6">
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="neumo-button success disabled:opacity-50"
            >
              {downloadingPdf ? (
                <div className="flex items-center">
                  <div className="neumo-spinner mr-2"></div>
                  {language === 'EN' ? 'Downloading...' : 'Mengunduh...'}
                </div>
              ) : (
                language === 'EN' ? 'Download PDF Report' : 'Unduh Laporan PDF'
              )}
            </button>
            <button
              onClick={() => navigate('/')}
              className="neumo-button"
            >
              {language === 'EN' ? 'Take Another Assessment' : 'Ambil Penilaian Lain'}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            {language === 'EN' 
              ? 'This assessment was completed using the Solid Edge Success Criteria Checklist tool.'
              : 'Penilaian ini diselesaikan menggunakan alat Solid Edge Success Criteria Checklist.'
            }
          </p>
        </div>

        {/* Access Code Request Modal */}
        {showAccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="neumo-card max-w-md w-full">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">✉️ Request Free Access Code</h3>
                <p className="text-sm text-gray-600">
                  {language === 'EN' 
                    ? 'We\'ll send you a free access code for Siemens Xcelerator Academy training.'
                    : 'Kami akan mengirimkan kode akses gratis untuk pelatihan Siemens Xcelerator Academy.'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'EN' ? 'Email Address' : 'Alamat Email'}
                  </label>
                  <input
                    type="email"
                    value={accessEmail}
                    onChange={(e) => setAccessEmail(e.target.value)}
                    className="neumo-input w-full"
                    placeholder={language === 'EN' ? 'Enter your email' : 'Masukkan email Anda'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'EN' ? 'Message (Optional)' : 'Pesan (Opsional)'}
                  </label>
                  <textarea
                    value={accessMessage}
                    onChange={(e) => setAccessMessage(e.target.value)}
                    className="neumo-textarea w-full"
                    rows="3"
                    placeholder={language === 'EN' ? 'Any additional information...' : 'Informasi tambahan...'}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAccessModal(false)}
                    className="neumo-button secondary flex-1"
                  >
                    {language === 'EN' ? 'Cancel' : 'Batal'}
                  </button>
                  <button
                    onClick={handleSubmitAccessRequest}
                    disabled={submittingAccess || !accessEmail}
                    className="neumo-button primary flex-1 disabled:opacity-50"
                  >
                    {submittingAccess ? (
                      <div className="flex items-center justify-center">
                        <div className="neumo-spinner mr-2"></div>
                        {language === 'EN' ? 'Sending...' : 'Mengirim...'}
                      </div>
                    ) : (
                      language === 'EN' ? 'Send Request' : 'Kirim Permintaan'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reminder Notification */}
        {showReminder && (
          <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-40">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-800 mb-1">
                  {language === 'EN' ? 'Don\'t miss this opportunity!' : 'Jangan lewatkan kesempatan ini!'}
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  {language === 'EN' 
                    ? 'Get certified and level up your CAD skills! You can come back anytime, or start now while it\'s fresh.'
                    : 'Dapatkan sertifikasi dan tingkatkan keterampilan CAD Anda! Anda dapat kembali kapan saja, atau mulai sekarang selagi masih segar.'
                  }
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCertificationClick}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    {language === 'EN' ? 'Start Certification' : 'Mulai Sertifikasi'}
                  </button>
                  <button
                    onClick={handleAcademyClick}
                    className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    {language === 'EN' ? 'Access Academy' : 'Akses Academy'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowReminder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;