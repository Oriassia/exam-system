import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ExamPage from './pages/ExamPage'
import HistoryPage from './pages/HistoryPage'
import './App.css'

function App() {
  return (
    <div className="App app-layout">
      <Sidebar />
      <div className="app-content">
        <Routes>
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:submissionId" element={<HistoryPage />} />
          <Route path="/" element={<Navigate to="/exam" replace />} />
          <Route path="*" element={<Navigate to="/exam" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
