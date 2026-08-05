import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HomePage from '../screens/HomePage';

export default function Home() {
  return (
    <div className="app">
      <Header />
      <HomePage />
      <Footer />
    </div>
  );
}
