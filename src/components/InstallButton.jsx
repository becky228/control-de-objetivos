import React, { useEffect, useState } from "react";
import { COLORS } from "./ui.jsx";

// Botón "Instalar app". Funciona en Chrome/Edge (celular y computadora).
// En iPhone/iPad no existe el botón automático: se muestra la instrucción de Safari.
export default function InstallButton({ dark = false }) {
  const [evt, setEvt] = useState(null);
  const [instalada, setInstalada] = useState(false);
  const [ayuda, setAyuda] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setInstalada(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const yaEsApp = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone;
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (instalada || yaEsApp) return null;
  if (!evt && !esIOS) return null;

  const click = async () => {
    if (evt) { evt.prompt(); await evt.userChoice; setEvt(null); }
    else setAyuda(!ayuda);
  };
  const c = dark ? "#CFE2D9" : COLORS.forest;
  return (
    <div>
      <button onClick={click} className="text-xs px-2 py-1 text-left" style={{ color: c, border: `1px solid ${dark ? "#3E5A50" : COLORS.forest}` }}>
        ⬇ Instalar app
      </button>
      {ayuda && <p className="text-xs mt-1" style={{ color: c }}>En Safari: toca Compartir y luego "Añadir a pantalla de inicio".</p>}
    </div>
  );
}
