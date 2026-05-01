import { useState } from "react";
import Translator from "./components/Translator";
import PortfolioForm from "./components/PortfolioForm";
import "./App.css";

const TABS = [
  { id: "translator", label: "Translator" },
  { id: "portfolio", label: "Portafolio de Matemáticas" },
];

export default function App() {
  const [tab, setTab] = useState("portfolio");

  return (
    <div className="app">
      <header className="header">
        <h1>Typst Translator</h1>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="main">
        {tab === "translator" ? <Translator /> : <PortfolioForm />}
      </main>
    </div>
  );
}
