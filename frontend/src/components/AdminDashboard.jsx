import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ChartView, { 
  generateQuestionStatsData, 
  generateOverallStatsData, 
  generateAreaStatsData,
  generateLanguageStatsData 
} from './ChartView';

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [dashboardData, setDashboardData] = useState(null);
  const [responses, setResponses] = useState([]);
  const [responseDetails, setResponseDetails] = useState({});
  const [questionStats, setQuestionStats] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [filters, setFilters] = useState({
    email: '',
    language: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20
  });

  // File upload
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
      fetchDashboardData();
      fetchResponses();
      fetchQuestionStats();
      fetchAccessRequests();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/api/admin/login', loginForm);
      
      localStorage.setItem('adminToken', response.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      setIsAuthenticated(true);
      setError(null);
      
      // Fetch initial data
      await Promise.all([
        fetchDashboardData(),
        fetchResponses(),
        fetchQuestionStats(),
        fetchAccessRequests()
      ]);
    } catch (error) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setDashboardData(null);
    setResponses([]);
    setQuestionStats([]);
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data.statistics);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchResponses = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/api/admin/responses?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResponses(response.data.data.responses);
      
      // Fetch details for each response
      response.data.data.responses.forEach(resp => {
        fetchResponseDetails(resp.id);
      });
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const fetchResponseDetails = async (responseId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/responses/${responseId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setResponseDetails(prev => ({
          ...prev,
          [responseId]: response.data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching response details:', error);
    }
  };

  const fetchQuestionStats = async () => {
    try {
      const response = await axios.get('/api/questions/stats');
      setQuestionStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching question stats:', error);
    }
  };

  const fetchAccessRequests = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/api/admin/access-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccessRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching access requests:', error);
    }
  };

  const handleUpdateAccessRequestStatus = async (requestId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/admin/access-requests/${requestId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh access requests
      await fetchAccessRequests();
    } catch (error) {
      console.error('Error updating access request status:', error);
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excel', file);

    try {
      setUploadingExcel(true);
      setUploadSuccess(null);
      setError(null);

      const token = localStorage.getItem('adminToken');
      const response = await axios.post('/api/admin/upload-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setUploadSuccess(`Excel uploaded successfully! ${response.data.questionsImported} questions imported.`);
      
      // Refresh data
      await Promise.all([
        fetchDashboardData(),
        fetchQuestionStats()
      ]);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload Excel file');
    } finally {
      setUploadingExcel(false);
      event.target.value = '';
    }
  };

  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      
      if (filters.language) params.append('language', filters.language);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(`/api/admin/report/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'consolidated-report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const handleDeleteResponse = async (responseId) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`/api/admin/responses/${responseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh responses
      await fetchResponses();
      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting response:', error);
      alert('Failed to delete response');
    }
  };

  const applyFilters = () => {
    fetchResponses();
  };

  const resetFilters = () => {
    setFilters({
      email: '',
      language: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20
    });
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="neumo-card max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Login</h1>
            <p className="text-gray-600">Access the admin dashboard</p>
          </div>

          {error && (
            <div className="neumo-alert error mb-4">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="neumo-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="neumo-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neumo-button primary w-full disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="neumo-spinner mr-2"></div>
                  Logging in...
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Back to Home
            </button>
          </div>


        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="neumo-card mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600">Manage and analyze success criteria assessments</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/')}
                className="neumo-button"
              >
                Home
              </button>
              <button
                onClick={handleLogout}
                className="neumo-button"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {uploadSuccess && (
          <div className="neumo-alert success mb-4">
            <p>{uploadSuccess}</p>
          </div>
        )}
        {error && (
          <div className="neumo-alert error mb-4">
            <p>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="neumo-card mb-6">
          <div className="flex space-x-4">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'responses', label: 'Responses' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'settings', label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`neumo-button ${activeTab === tab.id ? 'primary' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Summary Section with Answer Distribution */}
            <div className="neumo-card">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Answer Distribution Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                {(() => {
                  const totalYes = questionStats.reduce((sum, stat) => sum + (stat.yesCount || 0), 0);
                  const totalNo = questionStats.reduce((sum, stat) => sum + (stat.noCount || 0), 0);
                  const totalNA = questionStats.reduce((sum, stat) => sum + (stat.naCount || 0), 0);
                  const totalAnswers = totalYes + totalNo + totalNA;
                  
                  return (
                    <>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {totalYes}
                        </div>
                        <div className="text-sm text-gray-600">✅ Yes Answers</div>
                        <div className="text-xs text-gray-500">
                          {totalAnswers > 0 ? Math.round((totalYes / totalAnswers) * 100) : 0}% of all responses
                        </div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {totalNo}
                        </div>
                        <div className="text-sm text-gray-600">❌ No Answers</div>
                        <div className="text-xs text-gray-500">
                          {totalAnswers > 0 ? Math.round((totalNo / totalAnswers) * 100) : 0}% of all responses
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">
                          {totalNA}
                        </div>
                        <div className="text-sm text-gray-600">⚪ N/A Answers</div>
                        <div className="text-xs text-gray-500">
                          {totalAnswers > 0 ? Math.round((totalNA / totalAnswers) * 100) : 0}% of all responses
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="mt-4 text-center text-sm text-gray-500">
                Total Answers: {questionStats.reduce((sum, stat) => sum + (stat.yesCount || 0) + (stat.noCount || 0) + (stat.naCount || 0), 0)}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neumo-card text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {dashboardData.totalResponses}
                </div>
                <div className="text-gray-600">Total Responses</div>
              </div>
              <div className="neumo-card text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {dashboardData.responsesByLanguage.find(r => r.language === 'EN')?.count || 0}
                </div>
                <div className="text-gray-600">English Responses</div>
              </div>
              <div className="neumo-card text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {dashboardData.responsesByLanguage.find(r => r.language === 'ID')?.count || 0}
                </div>
                <div className="text-gray-600">Bahasa Responses</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {questionStats.length > 0 && (
                <div className="neumo-card">
                  <h3 className="text-lg font-semibold mb-4">Overall Answer Distribution</h3>
                  <ChartView
                    type="pie"
                    data={generateOverallStatsData({
                      yes: questionStats.reduce((sum, stat) => sum + (stat.yesCount || 0), 0),
                      no: questionStats.reduce((sum, stat) => sum + (stat.noCount || 0), 0),
                      na: questionStats.reduce((sum, stat) => sum + (stat.naCount || 0), 0)
                    })}
                    title="Overall Answers"
                  />
                </div>
              )}
              
              <div className="neumo-card">
                <h3 className="text-lg font-semibold mb-4">Language Distribution</h3>
                <ChartView
                  type="pie"
                  data={generateLanguageStatsData(dashboardData.responsesByLanguage)}
                  title="Responses by Language"
                />
              </div>
            </div>

            {/* Recent Responses */}
            <div className="neumo-card">
              <h3 className="text-lg font-semibold mb-4">Recent Responses</h3>
              <div className="overflow-x-auto">
                <table className="neumo-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Language</th>
                      <th>Completion</th>
                      <th>Answer Summary</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.slice(0, 5).map((response) => {
                      const details = responseDetails[response.id];
                      return (
                        <tr key={response.id}>
                          <td>{response.email}</td>
                          <td>{response.language === 'EN' ? 'English' : 'Bahasa Indonesia'}</td>
                          <td>
                            {details ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      details.completionPercentage === 100 ? 'bg-green-500' : 
                                      details.completionPercentage >= 80 ? 'bg-blue-500' : 
                                      details.completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${details.completionPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium">{details.completionPercentage}%</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Loading...</span>
                            )}
                          </td>
                          <td>
                            {details ? (
                              <div className="text-xs space-y-1">
                                <div className="flex space-x-2">
                                  <span className="text-green-600">✓ {details.answerSummary.yes}</span>
                                  <span className="text-red-600">✗ {details.answerSummary.no}</span>
                                  <span className="text-gray-500">N/A {details.answerSummary.na}</span>
                                </div>
                                <div className={`text-xs font-medium ${
                                  Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 90 ? 'text-green-600' :
                                  Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 75 ? 'text-blue-600' :
                                  Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  🎯 {Math.round((details.answerSummary.yes / details.answerSummary.total) * 100)}%
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Loading...</span>
                            )}
                          </td>
                          <td>{new Date(response.timestamp).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Responses Tab */}
        {activeTab === 'responses' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="neumo-card">
              <h3 className="text-lg font-semibold mb-4">Filter Responses</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={filters.email}
                  onChange={(e) => setFilters({...filters, email: e.target.value})}
                  className="neumo-input"
                />
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({...filters, language: e.target.value})}
                  className="neumo-select"
                >
                  <option value="">All Languages</option>
                  <option value="EN">English</option>
                  <option value="ID">Bahasa Indonesia</option>
                </select>
                <input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="neumo-input"
                />
                <input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="neumo-input"
                />
                <div className="flex space-x-2">
                  <button onClick={applyFilters} className="neumo-button primary">
                    Apply
                  </button>
                  <button onClick={resetFilters} className="neumo-button">
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Responses Table */}
            <div className="neumo-card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Responses</h3>
                <button
                  onClick={handleDownloadReport}
                  className="neumo-button success"
                >
                  Download Report
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="neumo-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                      <th>Language</th>
                      <th>Completion</th>
                      <th>Answer Summary</th>
                      <th>Access Request</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((response) => {
                      const details = responseDetails[response.id];
                      return (
                        <tr key={response.id}>
                          <td>{response.id}</td>
                          <td>{response.email}</td>
                          <td>{response.language === 'EN' ? 'English' : 'Bahasa Indonesia'}</td>
                          <td>
                            {details ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      details.completionPercentage === 100 ? 'bg-green-500' : 
                                      details.completionPercentage >= 80 ? 'bg-blue-500' : 
                                      details.completionPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${details.completionPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium">{details.completionPercentage}%</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Loading...</span>
                            )}
                          </td>
                          <td>
                            {details ? (
                              <div className="text-xs space-y-1">
                                <div className="flex space-x-3">
                                  <span className="text-green-600 font-medium">✓ {details.answerSummary.yes}</span>
                                  <span className="text-red-600 font-medium">✗ {details.answerSummary.no}</span>
                                  <span className="text-gray-500 font-medium">N/A {details.answerSummary.na}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className={`text-xs font-medium ${
                                    Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 90 ? 'text-green-600' :
                                    Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 75 ? 'text-blue-600' :
                                    Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    🎯 {Math.round((details.answerSummary.yes / details.answerSummary.total) * 100)}%
                                  </div>
                                  <div className={`w-2 h-2 rounded-full ${
                                    Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 90 ? 'bg-green-500' :
                                    Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 75 ? 'bg-blue-500' :
                                    Math.round((details.answerSummary.yes / details.answerSummary.total) * 100) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                </div>
                                {details.answerSummary.withRemarks > 0 && (
                                  <div className="text-purple-600 text-xs">
                                    💬 {details.answerSummary.withRemarks} remarks
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Loading...</span>
                            )}
                          </td>
                          <td>
                            {(() => {
                              const userAccessRequest = accessRequests.find(req => req.email === response.email);
                              if (userAccessRequest) {
                                return (
                                  <div className="flex items-center space-x-2">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Yes
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(userAccessRequest.timestamp).toLocaleDateString()}
                                    </span>
                                  </div>
                                );
                              } else {
                                return (
                                  <span className="text-gray-400 text-xs">No request</span>
                                );
                              }
                            })()}
                          </td>
                          <td>{new Date(response.timestamp).toLocaleDateString()}</td>
                          <td>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => navigate(`/summary/${response.id}`)}
                                className="neumo-button text-xs"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteResponse(response.id)}
                                className="neumo-button text-xs bg-red-100 hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && questionStats.length > 0 && (
          <div className="space-y-6">
            <div className="neumo-card">
              <h3 className="text-lg font-semibold mb-4">Question Performance by Area</h3>
              <ChartView
                type="bar"
                data={generateAreaStatsData(questionStats)}
                title="Answers by Area"
              />
            </div>

            <div className="neumo-card">
              <h3 className="text-lg font-semibold mb-4">Individual Question Performance</h3>
              <ChartView
                type="bar"
                data={generateQuestionStatsData(questionStats)}
                title="Answers by Question"
              />
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="neumo-card">
              <h3 className="text-lg font-semibold mb-4">Excel File Management</h3>
              <p className="text-gray-600 mb-4">
                Upload a new Excel file to replace the current questions. The file should contain 
                sheets named "Eng" and "Bahasa" with columns for Area, Activity, and Criteria.
              </p>
              
              <div className="mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  disabled={uploadingExcel}
                  className="neumo-input"
                />
              </div>
              
              {uploadingExcel && (
                <div className="flex items-center text-blue-600">
                  <div className="neumo-spinner mr-2"></div>
                  Uploading and processing Excel file...
                </div>
              )}
            </div>

            <div className="neumo-card">
              <h3 className="text-lg font-semibold mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Total Questions:</strong> {dashboardData?.totalQuestions || 0}
                </div>
                <div>
                  <strong>Total Responses:</strong> {dashboardData?.totalResponses || 0}
                </div>
                <div>
                  <strong>English Questions:</strong> {questionStats.filter(q => q.language === 'EN').length}
                </div>
                <div>
                  <strong>Bahasa Questions:</strong> {questionStats.filter(q => q.language === 'ID').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;