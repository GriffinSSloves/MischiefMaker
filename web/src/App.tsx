import { RouterProvider } from 'react-router-dom';
import { AppRouter } from './lib/router/router';
import './App.css';

function App() {
  return <RouterProvider router={AppRouter} />;
}

export default App;
