import { useState, useEffect, useCallback } from "react";
import { getComplaints, getMyComplaints } from "../services/apiService";

export function useComplaints(mode = "all", filters = {}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = mode === "mine" ? getMyComplaints : getComplaints;
      const { data } = await fn(filters);
      setComplaints(data.complaints || data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [mode]); // eslint-disable-line

  useEffect(() => { fetchData(); }, [fetchData]);

  return { complaints, loading, error, refetch: fetchData };
}