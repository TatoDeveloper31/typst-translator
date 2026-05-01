import { useState, useCallback } from "react";
import { translateText } from "../utils/api";

const PLACEHOLDER = `# My Document

Hello! This is a sample document.

## Features

- Bullet points work
- **Bold** and *italic* text too

1. Ordered lists
2. Also supported

Write your plain text here and see the Typst output on the right.`;

export default function Translator() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await translateText(input);
      setOutput(data.typst);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        handleTranslate();
      }
    },
    [handleTranslate]
  );

  return (
    <div className="translator">
      <div className="panel">
        <div className="panel-header">
          <span>Plain Text</span>
          <button
            className="translate-btn"
            onClick={handleTranslate}
            disabled={loading || !input.trim()}
          >
            {loading ? "Translating…" : "Translate  ⌘↵"}
          </button>
        </div>
        <textarea
          className="editor"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          spellCheck={false}
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <span>Typst Output</span>
          {output && (
            <button
              className="copy-btn"
              onClick={() => navigator.clipboard.writeText(output)}
            >
              Copy
            </button>
          )}
        </div>
        <pre className="output">
          {error ? (
            <span className="error">{error}</span>
          ) : output ? (
            output
          ) : (
            <span className="placeholder">Typst markup will appear here…</span>
          )}
        </pre>
      </div>
    </div>
  );
}
