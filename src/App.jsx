import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './index.css';

function Home() {
  return (
    <div className="home-container">
      <h1>Sistema de Ocorrências</h1>
      <p>Bem-vindo ao portal da escola.</p>
      <Link to="/login" className="btn">Entrar</Link>
    </div>
  );
}

function Login() {
  return (
    <div className="login-container">
      <h2>Login</h2>
      <p>O login será integrado com o Supabase Auth.</p>
      <form onSubmit={(e) => e.preventDefault()}>
        <div>
          <label>Email</label>
          <input type="email" placeholder="usuario@escola.com" />
        </div>
        <div>
          <label>Senha</label>
          <input type="password" placeholder="***" />
        </div>
        <button type="submit" className="btn">Entrar</button>
      </form>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          {/* Futuras rotas para ADM, Gestor e Professor */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
