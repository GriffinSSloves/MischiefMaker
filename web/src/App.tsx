import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Encode from './pages/Encode';
import Decode from './pages/Decode';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/encode" element={<Encode />} />
          <Route path="/decode" element={<Decode />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
