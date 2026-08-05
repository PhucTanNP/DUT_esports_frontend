import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminDashboard from './components/admin/AdminDashboard';
import Footer from './components/layout/Footer';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import TournamentDetail from './pages/TournamentDetail';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang chủ */}
        <Route
          path="/"
          element={
            <div className="app">
              <Header />
              <HomePage />
              <Footer />
            </div>
          }
        />

        {/* Chi tiết giải đấu */}
        <Route
          path="/tournament/:id"
          element={
            <div className="app">
              <Header />
              <TournamentDetail />
              <Footer />
            </div>
          }
        />

        {/* Admin Dashboard — không có header/footer */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
