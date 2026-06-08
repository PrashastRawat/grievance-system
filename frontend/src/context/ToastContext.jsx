import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, icon = "✅", duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, icon }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, background:"#0D0F1A",
            color:"white", padding:"12px 20px", borderRadius:10, fontSize:14, fontWeight:500,
            boxShadow:"0 8px 30px rgba(0,0,0,.25)" }}>
            <span>{t.icon}</span> {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);