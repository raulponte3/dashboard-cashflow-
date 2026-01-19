import { useEffect, useState } from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;

export default function App() {
  const [sheetId, setSheetId] = useState("");
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

const loadData = async () => {
  if (!sheetId) return;

  try {
    const res = await fetch(`/api/sheets?sheetId=${sheetId}`);

    if (!res.ok) throw new Error("Error cargando Google Sheet");

    const json = await res.json();
    setData(json.values || []);
  } catch (e) {
    setError(e.message);
  }
};
;

  useEffect(() => {
    const i = setInterval(loadData, 300000);
    return () => clearInterval(i);
  }, [sheetId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <input
        className="border p-2 mr-2"
        placeholder="Sheet ID"
        onChange={(e) => setSheetId(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={loadData}
      >
        Cargar
      </button>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      <pre className="mt-4 bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
