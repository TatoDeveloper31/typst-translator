import Translator from "./components/Translator";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Typst Translator</h1>
        <p>Convert plain text into Typst markup</p>
      </header>
      <main className="main">
        <Translator />
      </main>
    </div>
  );
}
