import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Checklist = () => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  const navigate = useNavigate();
  const email = sessionStorage.getItem('userEmail');
  const language = sessionStorage.getItem('userLanguage') || 'EN';
  
  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    currentPage * questionsPerPage,
    (currentPage + 1) * questionsPerPage
  );

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }
    fetchQuestions();
  }, [email, language, navigate]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/questions?lang=${language}`);
      setQuestions(response.data.questions);
      
      // Initialize answers object
      const initialAnswers = {};
      response.data.questions.forEach(q => {
        initialAnswers[q.id] = { answer: '', remarks: '' };
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, field, value) => {
    // Limit remarks to 140 characters
    if (field === 'remarks' && value.length > 140) {
      value = value.substring(0, 140);
    }
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
  };

  const isPageComplete = () => {
    return currentQuestions.every(q => answers[q.id]?.answer);
  };

  const isAllComplete = () => {
    return questions.every(q => answers[q.id]?.answer);
  };

  const scrollToTop = () => {
    // Immediate scroll
    window.scrollTo(0, 0);
    // Also smooth scroll as backup
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Scroll to top whenever currentPage changes
  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  const handleSubmit = async () => {
    if (!isAllComplete()) {
      alert(language === 'EN' 
        ? 'Please answer all questions before submitting.' 
        : 'Mohon jawab semua pertanyaan sebelum mengirim.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const submissionData = {
        email: email,
        language: language,
        answers: Object.entries(answers).map(([questionId, data]) => ({
          questionId: parseInt(questionId),
          answer: data.answer,
          remarks: data.remarks
        }))
      };

      const response = await axios.post('/api/responses', submissionData);
      
      // Navigate to summary page
      navigate(`/summary/${response.data.responseId}`);
    } catch (error) {
      console.error('Error submitting responses:', error);
      alert(language === 'EN' 
        ? 'Failed to submit responses. Please try again.'
        : 'Gagal mengirim tanggapan. Silakan coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neumo-card text-center">
          <div className="neumo-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">
            {language === 'EN' ? 'Loading questions...' : 'Memuat pertanyaan...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="neumo-card max-w-md text-center">
          <div className="neumo-alert error mb-4">
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="neumo-button primary"
          >
            {language === 'EN' ? 'Go Back' : 'Kembali'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="neumo-card mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {language === 'EN' ? 'Success Criteria Assessment' : 'Penilaian Kriteria Sukses'}
              </h1>
              <p className="text-gray-600 mt-1">
                {email} • {language === 'EN' ? 'English' : 'Bahasa Indonesia'}
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="neumo-button text-gray-600"
            >
              {language === 'EN' ? 'Back to Home' : 'Kembali ke Beranda'}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="neumo-card mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              {language === 'EN' ? 'Progress' : 'Kemajuan'}
            </span>
            <span className="text-sm text-gray-600">
              {Object.values(answers).filter(a => a.answer).length} / {questions.length}
            </span>
          </div>
          <div className="neumo-progress">
            <div 
              className="neumo-progress-bar"
              style={{ 
                width: `${(Object.values(answers).filter(a => a.answer).length / questions.length) * 100}%` 
              }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              {language === 'EN' ? 'Page' : 'Halaman'} {currentPage + 1} {language === 'EN' ? 'of' : 'dari'} {totalPages}
            </span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {currentQuestions.map((question, index) => (
            <div key={question.id} className="neumo-card">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {language === 'EN' ? 'Question' : 'Pertanyaan'} {currentPage * questionsPerPage + index + 1}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {question.area}
                  </span>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'EN' ? 'Activity / Feature Evaluated' : 'Aktivitas / Fitur yang Dievaluasi'}
                  </label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">
                    {question.activity}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'EN' ? 'Success Criteria' : 'Kriteria Sukses'}
                  </label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">
                    {question.criteria}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Answer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'EN' ? 'Your Answer' : 'Jawaban Anda'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={answers[question.id]?.answer || ''}
                    onChange={(e) => handleAnswerChange(question.id, 'answer', e.target.value)}
                    className="neumo-select text-gray-800 max-w-xs"
                    required
                  >
                    <option value="">
                      {language === 'EN' ? 'Select an answer' : 'Pilih jawaban'}
                    </option>
                    <option value="Yes">
                      {language === 'EN' ? 'Yes' : 'Ya'}
                    </option>
                    <option value="No">
                      {language === 'EN' ? 'No' : 'Tidak'}
                    </option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {language === 'EN' ? 'Remarks (Optional)' : 'Keterangan (Opsional)'}
                    </label>
                    <span className="text-xs text-gray-500">
                      {(answers[question.id]?.remarks || '').length}/140
                    </span>
                  </div>
                  <textarea
                    value={answers[question.id]?.remarks || ''}
                    onChange={(e) => handleAnswerChange(question.id, 'remarks', e.target.value)}
                    placeholder={
                      language === 'EN' 
                        ? 'Add any additional comments or observations...'
                        : 'Tambahkan komentar atau observasi tambahan...'
                    }
                    className="neumo-textarea"
                    rows="3"
                    maxLength={140}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="neumo-card mt-6">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="neumo-button disabled:opacity-50"
            >
              {language === 'EN' ? 'Previous' : 'Sebelumnya'}
            </button>

            <div className="flex space-x-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === currentPage 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentPage === totalPages - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!isAllComplete() || submitting}
                className="neumo-button success disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="neumo-spinner mr-2"></div>
                    {language === 'EN' ? 'Submitting...' : 'Mengirim...'}
                  </div>
                ) : (
                  language === 'EN' ? 'Submit Assessment' : 'Kirim Penilaian'
                )}
              </button>
            ) : (
              <button
                onClick={handleNextPage}
                disabled={!isPageComplete()}
                className="neumo-button primary disabled:opacity-50"
              >
                {language === 'EN' ? 'Next' : 'Selanjutnya'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checklist;