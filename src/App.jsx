import { useState } from "react";

function App() {
  const [sheetId, setSheetId] = useState("");
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!sheetId) {
      setError("Debes ingresar un Sheet ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/sheets?sheetId=${sheetId}`);

      if (!res.ok) {
        throw new Error("Error al cargar los datos");
      }

      const json = await res.json();
      setData(json.values || []);
    } catch (err) {
      setError(err.message || "Error desconocido");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Dashboard</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Sheet ID"
          value={sheetId}
          onChange={(e) => setSheetId(e.target.value)}
          style={{ padding: 8, width: 320, marginRight: 8 }}
        />

        <button onClick={loadData} style={{ padding: "8px 16px" }}>
          Cargar
        </button>
      </div>

      {loading && <p>Cargando...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <pre
        style={{
          background: "#f5f5f5",
          padding: 16,
          borderRadius: 4,
          maxHeight: 400,
          overflow: "auto"
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default App;
