import Home from './pages/home';
import './App.css'; // ensure the .page rule is imported here or globally

export default function App() {
  console.log('App component mounted successfully');
  return (
    <div>
      <Home />
    </div>
  );
}