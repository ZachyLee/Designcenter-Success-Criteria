import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState('EN');
  const [loading, setLoading] = useState(false);
  const [showCaseStudy, setShowCaseStudy] = useState(false);
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);

    // Store user info in sessionStorage for the checklist
    sessionStorage.setItem('userEmail', email);
    sessionStorage.setItem('userLanguage', language);

    // Navigate to checklist
    navigate('/checklist');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6">
      <div className="neumo-card max-w-md w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            Solid Edge Success Criteria Checklist - V2
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            {language === 'EN' 
              ? 'Evaluate your Solid Edge implementation with our comprehensive assessment tool.'
              : 'Evaluasi implementasi Solid Edge Anda dengan alat penilaian komprehensif kami.'
            }
          </p>
          {/* Force refresh indicator */}
          <div className="mt-4 p-4 bg-yellow-200 border-4 border-yellow-500 rounded-lg">
            <p className="text-lg text-yellow-800 font-bold text-center">
              🚨 NEW VERSION DEPLOYED - V2
            </p>
            <p className="text-sm text-yellow-700 text-center mt-2">
              If you see this yellow box, the latest code is working!
            </p>
            <p className="text-xs text-yellow-600 mt-1 text-center">
              Build: {new Date().toISOString()}
            </p>
          </div>
        </div>

        {/* Main Form Section */}
        <div className="space-y-6">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {language === 'EN' ? 'Select Language' : 'Pilih Bahasa'}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="neumo-select text-gray-800 text-base py-4"
            >
              <option value="EN">English</option>
              <option value="ID">Bahasa Indonesia</option>
            </select>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {language === 'EN' ? 'Email Address' : 'Alamat Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'EN' ? 'Enter your email' : 'Masukkan email Anda'}
              className="neumo-input text-gray-800 text-base py-4"
              required
            />
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={loading}
            className="neumo-button primary w-full py-5 text-white font-semibold text-lg disabled:opacity-60"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="neumo-spinner mr-3"></div>
                {language === 'EN' ? 'Loading...' : 'Memuat...'}
              </div>
            ) : (
              language === 'EN' ? 'Start Assessment' : 'Mulai Penilaian'
            )}
          </button>
        </div>

        {/* Case Study Toggle */}
        <div className="mt-8">
          <button
            onClick={() => setShowCaseStudy(!showCaseStudy)}
            className="neumo-button secondary w-full py-4 flex items-center justify-center space-x-3 text-base"
          >
            <span className="text-lg">⌄</span>
            <span>
              {language === 'EN' 
                ? (showCaseStudy ? 'Hide Customer Success Story' : 'View Customer Success Story')
                : (showCaseStudy ? 'Sembunyikan Kisah Sukses Pelanggan' : 'Lihat Kisah Sukses Pelanggan')
              }
            </span>
          </button>
          {/* Temporary test indicator */}
          <div className="mt-2 text-center text-xs text-blue-600 font-semibold">
            🆕 Latest Version Loaded
          </div>
        </div>

        {/* Case Study Content */}
        {showCaseStudy && (
          <div className="neumo-card mt-6 p-6 space-y-6 max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center justify-center">
                <span className="mr-2">📽️</span>
                {language === 'EN' ? 'PT ADR - Success Story' : 'PT ADR - Kisah Sukses'}
              </h3>
              <p className="text-sm text-gray-600">
                {language === 'EN' 
                  ? 'Indonesian automotive manufacturer achieving excellence with Solid Edge'
                  : 'Produsen otomotif Indonesia mencapai keunggulan dengan Solid Edge'
                }
              </p>
            </div>

            {/* YouTube Video */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src="https://www.youtube.com/embed/PTBSFF0sghA"
                title="PT ADR Case Study"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            {/* Case Study Summary */}
            <div className="space-y-4">
              {/* Company Background */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                  <span className="mr-2">🏢</span>
                  {language === 'EN' ? 'Company Background' : 'Latar Belakang Perusahaan'}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === 'EN'
                    ? 'PT ADR is a listed Indonesian manufacturer specializing in automotive components such as radiators, filters, and brake systems.'
                    : 'PT ADR adalah produsen Indonesia yang terdaftar yang mengkhususkan diri dalam komponen otomotif seperti radiator, filter, dan sistem rem.'
                  }
                </p>
              </div>

              {/* Challenges */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                  <span className="mr-2">⚙️</span>
                  {language === 'EN' ? 'Challenges Faced' : 'Tantangan yang Dihadapi'}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {language === 'EN'
                    ? 'The company encountered complex CAD design workflows, long modeling times, and inconsistencies in surface modeling quality using traditional methods.'
                    : 'Perusahaan menghadapi alur kerja desain CAD yang kompleks, waktu pemodelan yang lama, dan inkonsistensi dalam kualitas pemodelan permukaan menggunakan metode tradisional.'
                  }
                </p>
              </div>

              {/* Solutions & Improvements */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                  <span className="mr-2">✅</span>
                  {language === 'EN' ? 'Solutions & Results' : 'Solusi & Hasil'}
                </h4>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  {language === 'EN'
                    ? 'After adopting Solid Edge with synchronous modeling, PT ADR achieved:'
                    : 'Setelah mengadopsi Solid Edge dengan pemodelan sinkron, PT ADR mencapai:'
                  }
                </p>
                <ul className="text-sm text-gray-600 space-y-2 ml-4">
                  <li>• {language === 'EN' ? '30% reduction in design iteration time' : '30% pengurangan waktu iterasi desain'}</li>
                  <li>• {language === 'EN' ? 'Smoother surface transitions with better G2 control' : 'Transisi permukaan yang lebih halus dengan kontrol G2 yang lebih baik'}</li>
                  <li>• {language === 'EN' ? 'Easier collaboration across design teams' : 'Kolaborasi yang lebih mudah antar tim desain'}</li>
                  <li>• {language === 'EN' ? 'Improved productivity in handling large assemblies' : 'Peningkatan produktivitas dalam menangani perakitan besar'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Admin Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            {language === 'EN' ? 'Admin Dashboard' : 'Dashboard Admin'}
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-blue-50 rounded-2xl border-l-4 border-blue-400">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            {language === 'EN' ? 'Assessment Overview' : 'Ikhtisar Penilaian'}
          </h3>
          <p className="text-xs text-blue-700">
            {language === 'EN' 
              ? 'This assessment evaluates various aspects of your Solid Edge implementation. You can export your results as PDF upon completion.'
              : 'Penilaian ini mengevaluasi berbagai aspek implementasi Solid Edge Anda. Anda dapat mengekspor hasil sebagai PDF setelah selesai.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;