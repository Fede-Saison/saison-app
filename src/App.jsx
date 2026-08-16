import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

// ================================================================
// SAISON — DESIGN SYSTEM
// ================================================================
const BRAND = {
  cobalt:    "#0A3AF2",
  night:     "#0B1426",
  bone:      "#F5F3EC",
  boneDeep:  "#EAE7DE",
  nightMid:  "#162040",
  nightSoft: "#1E2D50",
  cobaltDim: "#0A3AF215",
  cobaltSoft:"#0A3AF230",
  muted:     "#6B7A99",
  mutedLight:"#9BAAC4",
  success:   "#1A6B3C",
  successBg: "#E8F5EE",
  warn:      "#7A5500",
  warnBg:    "#FFF8E0",
  warnBorder:"#E8C840",
  red:       "#C0392B",
  paper:     "#FBFAF5",
  mono:      "'DM Mono', monospace",
};

const S = {
  input:{ width:"100%", padding:"0.85rem 1rem", borderRadius:"0.75rem", border:`1.5px solid ${BRAND.boneDeep}`, background:BRAND.bone, fontSize:"16px", color:BRAND.night, outline:"none", boxSizing:"border-box", fontFamily:"'Hanken Grotesk',sans-serif", transition:"border-color 0.18s" },
  inputDark:{ width:"100%", padding:"0.85rem 1rem", borderRadius:"0.75rem", border:`1.5px solid ${BRAND.nightSoft}`, background:BRAND.nightMid, fontSize:"16px", color:BRAND.bone, outline:"none", boxSizing:"border-box", fontFamily:"'Hanken Grotesk',sans-serif", transition:"border-color 0.18s" },
  label:{ display:"block", fontSize:"0.65rem", fontWeight:500, color:BRAND.muted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.4rem", fontFamily:"'DM Mono',monospace" },
  card:{ background:"#fff", border:`1px solid ${BRAND.boneDeep}`, borderRadius:"0.125rem", padding:"1.25rem 1.3rem", boxShadow:"none" },
  btnCobalt:{ background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"10px", padding:"0.9rem 1.25rem", fontSize:"0.88rem", fontWeight:600, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", transition:"opacity 0.15s, transform 0.12s cubic-bezier(0.34,1.56,0.64,1)", width:"100%", letterSpacing:"0.01em" },
  btnOutline:{ background:"transparent", color:BRAND.cobalt, border:`1.5px solid ${BRAND.cobalt}`, borderRadius:"0.75rem", padding:"0.9rem 1.25rem", fontSize:"0.88rem", fontWeight:700, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", width:"100%" },
  btnGhost:{ background:BRAND.cobaltDim, color:BRAND.cobalt, border:`1px solid ${BRAND.cobaltSoft}`, borderRadius:"0.75rem", padding:"0.9rem 1.25rem", fontSize:"0.88rem", fontWeight:700, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", width:"100%" },
};

const STRIPE = {
  mensual:    "https://buy.stripe.com/8x2fZiaO9ezr3Y86iyfnO00",
  trimestral: "https://buy.stripe.com/aFafZi09v8b3eCM4aqfnO02",
};

// ================================================================
// NIVELES DE FRANCÉS POR PUESTO (estándar Saison)
// ================================================================
const FRANCES_POR_PUESTO = {
  "Lavaplatos": "ninguno",
  "Polivalente": "a2",
  "Housekeeping": "a2",
  "Ayudante de Cocina": "a2",
  "Crepero/a": "a2",
  "Trabajador Agrícola": "a2",
  "Runner": "a2",
  "Jefe de Partida": "b1",
  "Chef de Cocina": "b1",
  "Mesero de Sala": "b1",
  "Mesero de Desayunos": "b1",
  "Mesero/a de Terraza": "b1",
  "Barman / Barmaid": "b1",
  "Ayudante de Cocina ciudad": "a2",
  "Camarero/a de Sala": "b1",
  "Recepcionista": "b2",
};

const NIVEL_FRANCES_ORDEN = ["ninguno","a1","a2","b1","b2","c1"];

function nivelFrancesDesdeString(str) {
  if (!str) return "ninguno";
  const s = str.toLowerCase();
  if (s.includes("c1")||s.includes("c2")) return "c1";
  if (s.includes("b2")) return "b2";
  if (s.includes("b1")) return "b1";
  if (s.includes("a2")) return "a2";
  if (s.includes("a1")) return "a1";
  return "ninguno";
}

function cumpleNivelFrances(nivelUsuario, nivelRequerido) {
  const u = NIVEL_FRANCES_ORDEN.indexOf(nivelFrancesDesdeString(nivelUsuario));
  const r = NIVEL_FRANCES_ORDEN.indexOf(nivelRequerido || "ninguno");
  return u >= r;
}

function cumpleDocumentacion(docUsuario) {
  if (!docUsuario) return false;
  const d = docUsuario.toLowerCase();
  return d.includes("europeo") || d.includes("titre") || d.includes("permiso") || d.includes("vvt aprobada");
}

function calcularMatch(oferta, perfil) {
  if (!perfil || (!perfil.frances && !perfil.documentacion && !perfil.puesto)) return null;
  const problemas = [];
  const PUESTO_MAP = {
    "Servicio de sala / Restaurante": ["Sala"],
    "Housekeeping / Limpieza": ["Housekeeping"],
    "Cocina / Ayudante / Lavaplatos": ["Cocina"],
    "Recepción / Atención al cliente": ["Recepción"],
    "Voiturier": ["Recepción"],
    "Barman": ["Bar"],
    "Animación": ["Otro"],
    "Mantenimiento": ["Otro"],
  };
  if (perfil.puesto && oferta.puesto) {
    const puestosCompatibles = PUESTO_MAP[perfil.puesto] || [];
    if (!puestosCompatibles.includes(oferta.puesto)) {
      problemas.push({ tipo: "puesto", msg: `Tu perfil es de ${perfil.puesto} — este puesto es diferente` });
    }
  }
  const puestoKey = Object.keys(FRANCES_POR_PUESTO).find(k =>
    oferta.titulo?.toLowerCase().includes(k.toLowerCase())
  );
  const nivelRequerido = puestoKey ? FRANCES_POR_PUESTO[puestoKey] : "a2";
  if (!cumpleNivelFrances(perfil.frances, nivelRequerido) && nivelRequerido !== "ninguno") {
    const labels = { a2:"A2", b1:"B1", b2:"B2" };
    problemas.push({ tipo: "frances", msg: `Este puesto requiere francés ${labels[nivelRequerido] || nivelRequerido}` });
  }
  if (!cumpleDocumentacion(perfil.documentacion)) {
    problemas.push({ tipo: "docs", msg: "Necesitás documentación válida para trabajar en Francia" });
  }
  if (problemas.length === 0) return { estado: "match", problemas: [] };
  return { estado: "parcial", problemas };
}

// ================================================================
// SAISON LOGO
// ================================================================
function SaisonLogo({ dark=false, size="md" }) {
  const sz = size==="sm" ? 18 : size==="lg" ? 28 : 22;
  const textSize = size==="sm" ? "0.95rem" : size==="lg" ? "1.4rem" : "1.1rem";
  const color = dark ? BRAND.night : BRAND.bone;
  const gap = sz * 0.1;
  const block = (sz - gap) / 2;
  const r = Math.max(2, block * 0.18);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", userSelect:"none" }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} fill="none">
        <rect x="0" y="0" width={block} height={block} rx={r} fill={color} opacity="1"/>
        <rect x={block+gap} y="0" width={block} height={block} rx={r} fill={color} opacity="0.6"/>
        <rect x="0" y={block+gap} width={block} height={block} rx={r} fill={color} opacity="0.35"/>
        <rect x={block+gap} y={block+gap} width={block} height={block} rx={r} fill={color} opacity="0.15"/>
      </svg>
      <span style={{ fontSize:textSize, fontWeight:700, color, fontFamily:"'Bricolage Grotesque','Plus Jakarta Sans',sans-serif", letterSpacing:"-0.025em", lineHeight:1 }}>Saison</span>
    </div>
  );
}

// ================================================================
// ICONS
// ================================================================
const Icon = ({ name, size=18, color="currentColor", strokeWidth=1.7 }) => {
  const paths = {
    search:<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell:<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    check:<><polyline points="20 6 9 17 4 12"/></>,
    copy:<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    mail:<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    lock:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    tools:<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>,
    diamond:<><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></>,
    crown:<><path d="M2 20h20M5 20l2-8 5 5 5-5 2 8"/><circle cx="12" cy="5" r="2"/></>,
    calculator:<><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="18"/><line x1="8" y1="18" x2="12" y2="18"/></>,
    checklist:<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
    info:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    warning:<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    instagram:<><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
    whatsapp:<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    facebook:<><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></>,
    arrowRight:<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    sim:<><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M15 2v4H9V2"/><path d="M9 12h6M9 16h4"/></>,
    bank:<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    graduation:<><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
    folder:<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
    shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    calendar:<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    briefcase:<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    filetext:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
    euro:<><path d="M4 10h12M4 14h12"/><path d="M19.5 8.5a7 7 0 1 0 0 7"/></>,
    globe:<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    waves:<><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></>,
    mountain:<><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></>,
    island:<><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1"/><path d="M7 14c0-1.9.7-3.7 2-5"/><circle cx="15" cy="6" r="1"/><path d="M14 6c0 3.9-3.4 7-7 8"/></>,
    sun:<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
    wind:<><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></>,
    wine:<><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H7c-1.5 4-2 6-2 8a5 5 0 0 0 5 5z"/></>,
    building:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,
    leaf:<><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></>,
    eiffel:<><path d="M12 2L8 22M12 2L16 22M8 9h8M7 15h10M5 22h14"/></>,
    city:<><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M9 9h1v1H9zM14 9h1v1h-1zM9 14h1v1H9zM14 14h1v1h-1z"/></>,
    grapes:<><path d="M22 5V2l-5.89 5.89"/><circle cx="16.6" cy="15.89" r="3"/><circle cx="8.11" cy="7.4" r="3"/><circle cx="12.35" cy="11.65" r="3"/><circle cx="13.91" cy="5.85" r="3"/><circle cx="18.15" cy="10.09" r="3"/><circle cx="6.56" cy="13.2" r="3"/><circle cx="10.8" cy="17.44" r="3"/><circle cx="5" cy="19" r="3"/></>,
    message:<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    volume:<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>,
    phone:<><path d="M6.6 10.8a15.05 15.05 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1.02-.24 11.47 11.47 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.47 11.47 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02Z"/></>,
    zap:<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    users:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    externalLink:<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    star:<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    download:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

// ================================================================
// DATOS
// ================================================================
const REGIONES_ALOJAMIENTO = [
  { id:"todas", label:"Todas", icon:"globe" },
  { id:"costa-azul", label:"Costa Azul", icon:"waves" },
  { id:"alpes", label:"Alpes / Saboya", icon:"mountain" },
  { id:"corcega", label:"Córcega", icon:"island" },
  { id:"atlantica", label:"Costa Atlántica", icon:"waves" },
  { id:"pais-vasco", label:"País Vasco", icon:"wind" },
  { id:"provenza", label:"Provenza", icon:"sun" },
  { id:"borgona", label:"Borgoña / Ródano", icon:"wine" },
];
const REGIONES_CIUDAD = [
  { id:"todas", label:"Todas", icon:"globe" },
  { id:"paris", label:"París", icon:"eiffel" },
  { id:"lyon", label:"Lyon", icon:"city" },
  { id:"burdeos", label:"Burdeos", icon:"grapes" },
  { id:"toulouse", label:"Toulouse", icon:"building" },
  { id:"montpellier", label:"Montpellier", icon:"sun" },
  { id:"otras", label:"Otras", icon:"leaf" },
];

// Requisito de francés por oferta (se usa para matching)
const OFERTAS_ALOJAMIENTO = [
  { id:1, tipo:"alojamiento", region:"costa-azul", titulo:"Mesero de Desayunos", establecimiento:"Hôtel L'Escalet", ciudad:"Ramatuelle", salario:"2.600€ bruto", fechaPublicacion:"28 May", emailEmpleador:"direction@hotel-lescalet.com", horario:"40h · 2 días libres", descripcion:"El servicio de desayunos en L'Escalet combina precisión y el ritmo propio del Var en temporada alta. A pasos de las playas más exclusivas.", requisitos:["Inglés fluido","Disponibilidad abril–octubre","Experiencia en sala","Alojamiento incluido"], nivelFrancesReq:"b1", docReq:true },
  { id:2, tipo:"alojamiento", region:"alpes", titulo:"Jefe de Partida — Caliente", establecimiento:"Le petit Saint Bernard", ciudad:"Bourg-Saint-Maurice", salario:"A convenir", fechaPublicacion:"28 May", emailEmpleador:"restaurant.petit.saint.bernard@gmail.com", horario:"41h semanales", descripcion:"Cocina de montaña con carácter. Los Alpes como telón de fondo y un equipo que respeta el oficio.", requisitos:["Experiencia cocina caliente","Liderazgo","Temporada completa","Alojamiento incluido"], nivelFrancesReq:"b1", docReq:true },
  { id:3, tipo:"alojamiento", region:"alpes", titulo:"Mesero de Sala", establecimiento:"Le petit Saint Bernard", ciudad:"Bourg-Saint-Maurice", salario:"A convenir", fechaPublicacion:"28 May", emailEmpleador:"restaurant.petit.saint.bernard@gmail.com", horario:"41h semanales", descripcion:"El vínculo entre la cocina y la mesa en un entorno alpino auténtico.", requisitos:["Experiencia en sala","Trato excelente","Temporada completa","Alojamiento incluido"], nivelFrancesReq:"b1", docReq:true },
  { id:4, tipo:"alojamiento", region:"costa-azul", titulo:"Runner", establecimiento:"Les Baigneuses", ciudad:"Port-Grimaud", salario:"A convenir", fechaPublicacion:"28 May", emailEmpleador:"lesbaigneuses.info@gmail.com", horario:"Abril–octubre", descripcion:"Port-Grimaud, la Venecia provenzal. El Mediterráneo hasta los pies de las mesas.", requisitos:["Inglés conversacional","Experiencia en servicio","Alojamiento incluido"], nivelFrancesReq:"a2", docReq:true },
  { id:5, tipo:"alojamiento", region:"borgona", titulo:"Lavaplatos", establecimiento:"Le Duchet", ciudad:"Lamoura (Jura)", salario:"A convenir", fechaPublicacion:"28 May", emailEmpleador:"recrutement@le-duchet.com", horario:"35h · 2 días libres", descripcion:"Equipo cohesionado en el Jura. Primera puerta al mercado laboral francés, sin barreras de idioma.", requisitos:["Sin experiencia requerida","Puntualidad","Alojamiento incluido"], nivelFrancesReq:"ninguno", docReq:true },
  { id:6, tipo:"alojamiento", region:"alpes", titulo:"Chef de Cocina", establecimiento:"La Bessannaise", ciudad:"Bessans", salario:"2.500–2.550€ bruto", fechaPublicacion:"28 May", emailEmpleador:"resp-achats@labessannaise.com", horario:"35h semanales", descripcion:"Bessans, Saboya auténtica. Gestión de cocina colectiva con brigada consolidada.", requisitos:["5+ años de experiencia","HACCP","Cocina colectiva","Alojamiento incluido"], nivelFrancesReq:"b1", docReq:true },
  { id:7, tipo:"alojamiento", region:"corcega", titulo:"Jefe de Partida — Frío", establecimiento:"Le Royal Hôtel", ciudad:"Bonifacio", salario:"A convenir", fechaPublicacion:"28 May", emailEmpleador:"Queffurus.tom@gmail.com", horario:"1 día libre/semana", descripcion:"Bonifacio en temporada alta. Cocina fría de nivel en uno de los paisajes más icónicos del Mediterráneo.", requisitos:["Cocina fría sólida","Abril–octubre","Alojamiento incluido"], nivelFrancesReq:"b1", docReq:true },
  { id:8, tipo:"alojamiento", region:"alpes", titulo:"Crepero/a", establecimiento:"Le Ty Breiz", ciudad:"Les Contamines-Montjoie", salario:"A convenir", fechaPublicacion:"28 May", emailEmpleador:"fabtyb@gmail.com", horario:"Servicio de tarde", descripcion:"Crepería bretona al pie del Mont Blanc. Incorporación inmediata.", requisitos:["1 año con crepes","Disponibilidad inmediata","Alojamiento incluido"], nivelFrancesReq:"a2", docReq:true },
  { id:9, tipo:"alojamiento", region:"provenza", titulo:"Trabajador Agrícola", establecimiento:"Exploitation fruits", ciudad:"Vallée du Rhône", salario:"A convenir", fechaPublicacion:"28 May", emailEmpleador:"exploitationprentegarde@vergerpanier.com", horario:"Temporada 3 meses", descripcion:"Cosecha de albaricoques y melocotones en el Ródano. Trabajo al aire libre en explotación familiar.", requisitos:["Disponible desde abril","Condición física","Alojamiento incluido"], nivelFrancesReq:"a2", docReq:true },
];

const OFERTAS_CIUDAD = [
  { id:101, tipo:"ciudad", region:"paris", titulo:"Camarero/a de Sala", establecimiento:"Brasserie du Marais", ciudad:"París", salario:"1.800€ bruto", fechaPublicacion:"28 May", emailEmpleador:"contact@brasseriedumarais.fr", horario:"CDD 3 meses · 39h", descripcion:"Brasserie clásica en el corazón del Marais. Equipo internacional, ritmo intenso, ambiente inmejorable.", requisitos:["Francés B1","Experiencia en sala","Sin alojamiento"], nivelFrancesReq:"b1", docReq:true },
  { id:102, tipo:"ciudad", region:"lyon", titulo:"Ayudante de Cocina", establecimiento:"Paul Bocuse Group", ciudad:"Lyon", salario:"1.750€ bruto", fechaPublicacion:"28 May", emailEmpleador:"rh@bocuse.fr", horario:"CDD 2 meses · 35h", descripcion:"La capital gastronómica de Francia. Refuerzo de verano en grupo de restauración de referencia.", requisitos:["Cocina demostrable","Sin alojamiento"], nivelFrancesReq:"a2", docReq:true },
  { id:103, tipo:"ciudad", region:"burdeos", titulo:"Recepcionista", establecimiento:"Hôtel de Normandie", ciudad:"Burdeos", salario:"1.900€ bruto", fechaPublicacion:"28 May", emailEmpleador:"direction@hotel-normandie-bordeaux.com", horario:"CDD 3 meses", descripcion:"Hotel boutique en el centro histórico de Burdeos. Clientela internacional.", requisitos:["Francés B2 + inglés","Experiencia recepción","Sin alojamiento"], nivelFrancesReq:"b2", docReq:true },
  { id:104, tipo:"ciudad", region:"montpellier", titulo:"Mesero/a de Terraza", establecimiento:"Le Petit Jardin", ciudad:"Montpellier", salario:"1.800€ bruto", fechaPublicacion:"28 May", emailEmpleador:"contact@petitjardin-montpellier.fr", horario:"CDD 2 meses · 39h", descripcion:"Terraza en el casco antiguo de Montpellier. Temporada alta con clientela cosmopolita.", requisitos:["Francés funcional","Sin alojamiento"], nivelFrancesReq:"b1", docReq:true },
  { id:105, tipo:"ciudad", region:"toulouse", titulo:"Barman / Barmaid", establecimiento:"Le Bar Basque", ciudad:"Toulouse", salario:"1.850€ bruto", fechaPublicacion:"28 May", emailEmpleador:"contact@lebarbasque.fr", horario:"CDD 2 meses · 39h", descripcion:"Bar de referencia en Toulouse. Terraza concurrida, equipo joven, propinas altas.", requisitos:["Coctelería","Francés conversacional","Sin alojamiento"], nivelFrancesReq:"b1", docReq:true },
];

// ================================================================
// GRUPOS WHATSAPP POR LOCALIDAD
// ================================================================
const GRUPOS_WSP = [
  { id:"costa-azul", region:"Costa Azul", icon:"waves", lugares:["Saint-Tropez","Cannes","Niza","Antibes","Ramatuelle"], link:"https://chat.whatsapp.com/tu_link_costa_azul" },
  { id:"alpes", region:"Alpes / Saboya", icon:"mountain", lugares:["Courchevel","Méribel","Val Thorens","Chamonix","Les Arcs"], link:"https://chat.whatsapp.com/tu_link_alpes" },
  { id:"corcega", region:"Córcega", icon:"island", lugares:["Bonifacio","Porto-Vecchio","Ajaccio","Calvi"], link:"https://chat.whatsapp.com/tu_link_corcega" },
  { id:"paris", region:"París", icon:"eiffel", lugares:["Marais","Montmartre","La Défense","Saint-Germain"], link:"https://chat.whatsapp.com/tu_link_paris" },
  { id:"pais-vasco", region:"País Vasco", icon:"wind", lugares:["Biarritz","Bayonne","Saint-Jean-de-Luz"], link:"https://chat.whatsapp.com/tu_link_pais_vasco" },
  { id:"atlantica", region:"Costa Atlántica", icon:"waves", lugares:["Arcachon","La Rochelle","Île de Ré","Royan"], link:"https://chat.whatsapp.com/tu_link_atlantica" },
  { id:"provenza", region:"Provenza", icon:"sun", lugares:["Aix-en-Provence","Avignon","Arles","Cassis"], link:"https://chat.whatsapp.com/tu_link_provenza" },
  { id:"lyon", region:"Lyon", icon:"city", lugares:["Lyon centro","Villeurbanne","Vieux Lyon"], link:"https://chat.whatsapp.com/tu_link_lyon" },
];

// ================================================================
// AFILIADOS
// ================================================================
const AFILIADOS = {
  banco: { nombre:"Wise", desc:"Abrí tu cuenta bancaria digital antes de llegar. El IBAN que te dan es suficiente para cobrar tu sueldo en Francia. (¿Preferís Revolut? Escribinos y te pasamos el link.)", cta:"Abrir cuenta gratis", link:"https://wise.com/invite/ilpc/federiconicolasalbertia", icon:"bank" },
  esim: { nombre:"Airalo eSIM", desc:"Datos móviles desde el primer día. Activala desde tu país antes de subirte al avión.", cta:"Usar código FEDERI4313", link:null, codigo:"FEDERI4313", icon:"sim" },
  seguro: { nombre:"iati Seguros", desc:"Seguro de viaje y salud obligatorio para visa VVT. Cubrí tu temporada completa.", cta:"Cotizar seguro", link:"https://www.iatiseguros.com?r=89715432565643&utm_source=colaboradores&utm_medium=referral", icon:"shield" },
  workaway: { nombre:"Workaway", desc:"Entre temporadas o mientras esperás tu inicio, Workaway te da alojamiento y comida a cambio de algunas horas de trabajo.", cta:"Ver Workaway", link:"https://www.workaway.info/", icon:"leaf" },
  alojamiento: { nombre:"Hostelworld", desc:"Para los primeros días antes de que el empleador provea alojamiento.", cta:"Buscar alojamiento", link:"https://hostelworld.com/tu_link", icon:"building" },
};

const PUESTOS_FR = {
  "Mesero de Desayunos":"Serveur(se) de petit-déjeuner",
  "Jefe de Partida — Caliente":"Chef de partie chaud",
  "Jefe de Partida — Frío":"Chef de partie froid",
  "Mesero de Sala":"Serveur(se) de salle",
  "Runner":"Runner",
  "Lavaplatos":"Plongeur(se)",
  "Chef de Cocina":"Chef de cuisine",
  "Crepero/a":"Crêpier(ère)",
  "Camarero/a de Sala":"Serveur(se) de salle",
  "Ayudante de Cocina":"Commis de cuisine",
  "Recepcionista":"Réceptionniste",
  "Mesero/a de Terraza":"Serveur(se) en terrasse",
  "Barman / Barmaid":"Barman / Barmaid",
  "Trabajador Agrícola":"Ouvrier(ère) agricole",
  "Camarero/a de habitaciones":"Valet / Femme de chambre",
  "Asistente de gobierno de pisos":"Assistant(e) gouvernant(e)",
  "Equipier de habitaciones":"Équipier(ère) d'étage",
  "Terapeuta de spa":"Thérapeute spa",
  "Asistente de spa":"Assistant(e) spa",
  "Bartender":"Barman / Barmaid",
  "Ayudante de bartender":"Stagiaire bar",
  "Sommelier":"Sommelier(ière)",
  "Jefe/a de rango":"Chef de rang",
  "Mozo/a de salón":"Serveur(se) de restaurant",
  "Ayudante de cocina":"Commis de cuisine",
  "Cocinero/a de partida":"Chef de partie",
  "Cocinero/a de partida - Sushi":"Chef de partie sushi",
  "Pastelero/a de partida":"Chef de partie pâtisserie",
  "Ayudante de pastelería":"Commis pâtissier(ière)",
  "Pastelero/a":"Commis pâtissier(ière)",
  "Gobierno de pisos":"Gouvernant(e)",
  "Recepcionista nocturno":"Réceptionniste de nuit",
  "Mayordomo/a":"Majordome",
  "Mayordomo/a de chalet":"Majordome de chalet",
  "Valet / Portero":"Voiturier / Chasseur",
  "Conserje":"Concierge",
  "Agente de reservas":"Agent de réservation",
  "Asistente administrativo/a":"Assistant(e) administratif(ve)",
  "Técnico/a de mantenimiento":"Agent de maintenance",
  "Animador/a Kids Club":"Animateur(trice) Kids Club",
  "Sous-chef":"Sous-chef",
  "Cocinero/a jefe":"Chef de cuisine",
  "Responsable de desayunos":"Responsable petit-déjeuner",
  "Primer/a camarero/a de habitaciones":"Valet / Femme de chambre",
  "Equipier / Lencero/a":"Équipier(ère) / Personnel de lingerie",
  "Cocinero/a de partida / Lavaplatos":"Chef de partie / Plongeur(se)",
  "Recepcionista / Guest relation":"Réceptionniste / Guest relation",
};

function generarCarta(oferta, nombre, esPremium) {
  const fr = PUESTOS_FR[oferta.titulo] || oferta.titulo;
  const localidad = esPremium ? (oferta.localidad || "LOCALIDAD/CIUDAD") : "LOCALIDAD/CIUDAD";
const establecimiento = esPremium ? (oferta.nombre_establecimiento || "[NOMBRE DEL ESTABLECIMIENTO]") : "[NOMBRE DEL ESTABLECIMIENTO]";
  return `Madame, Monsieur,\n\nJe me permets de vous adresser ma candidature au poste de ${fr} au sein de votre établissement ${establecimiento}, situé à ${localidad}.\n\nPassionné(e) par le secteur du tourisme et de l'hôtellerie, je recherche une expérience saisonnière enrichissante en France. Je suis convaincu(e) que mes qualités — rigueur, sens du service et esprit d'équipe — correspondent pleinement aux valeurs de votre établissement.\n\nJe suis disponible immédiatement et dispose d'une grande flexibilité horaire. Je serais ravi(e) de vous rencontrer lors d'un entretien.\n\nDans l'attente de votre retour,\n\n${nombre||"[Tu nombre y apellido]"}`;
}

// ================================================================
// COMPONENTS
// ================================================================
function Toast({ msg, visible }) {
  return (
    <div style={{ position:"fixed", bottom:"5.5rem", left:"50%", transform:`translateX(-50%) translateY(${visible?"0":"1.5rem"})`, opacity:visible?1:0, transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)", background:BRAND.night, color:BRAND.bone, padding:"0.65rem 1.35rem", borderRadius:"2rem", fontSize:"0.82rem", fontWeight:500, zIndex:9999, pointerEvents:"none", whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(11,20,38,0.3)", fontFamily:"'Hanken Grotesk',sans-serif", border:`1px solid ${BRAND.nightSoft}` }}>
      <span style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}><Icon name="check" size={14} color={BRAND.cobalt} /> {msg}</span>
    </div>
  );
}

function MuroPago({ onCerrar }) {
  return (
    <div onClick={onCerrar} style={{ position:"fixed", inset:0, background:"rgba(11,20,38,0.85)", backdropFilter:"blur(12px)", zIndex:1100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:BRAND.night, borderRadius:"1.5rem 1.5rem 0 0", width:"100%", maxWidth:"480px", padding:"1.75rem 1.75rem 3rem", animation:"slideUp 0.38s cubic-bezier(0.34,1.56,0.64,1)", border:`1px solid ${BRAND.nightSoft}`, borderBottom:"none" }}>
        <div style={{ width:"2.5rem", height:"3px", background:BRAND.nightSoft, borderRadius:"2px", margin:"0 auto 1.75rem" }} />
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1.5rem" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"0.75rem", background:BRAND.cobalt, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Icon name="lock" size={20} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize:"1.1rem", fontWeight:700, color:BRAND.bone, margin:0, fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.02em" }}>Acceso Saison</p>
            <p style={{ fontSize:"0.78rem", color:BRAND.mutedLight, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>Para contactar empleadores y aplicar directamente</p>
          </div>
        </div>
        <div style={{ background:"rgba(10,58,242,0.12)", border:`1px solid rgba(10,58,242,0.3)`, borderRadius:"0.75rem", padding:"0.65rem 0.9rem", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <span style={{ fontSize:"1rem" }}>🎁</span>
          <p style={{ fontSize:"0.78rem", color:BRAND.bone, margin:0, fontWeight:600, fontFamily:"'Hanken Grotesk',sans-serif" }}>3 días gratis en cualquier plan — cancelá cuando quieras</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem", marginBottom:"1.5rem" }}>
          <div onClick={()=>window.open(STRIPE.trimestral,"_blank")} style={{ cursor:"pointer", position:"relative", background:BRAND.cobalt, borderRadius:"0.875rem", padding:"1.1rem 1.2rem 1rem", overflow:"visible" }}>
            <div style={{ position:"absolute", top:"-10px", left:"1.2rem", background:"#F5C842", color:BRAND.night, fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.04em", padding:"0.2rem 0.6rem", borderRadius:"2rem" }}>MÁS ELEGIDO · AHORRÁ 33%</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"0.3rem" }}>
              <div>
                <p style={{ fontSize:"0.92rem", fontWeight:700, color:"#fff", margin:"0 0 0.1rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Trimestral</p>
                <p style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.75)", margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>Toda la temporada cubierta</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:"1.3rem", fontWeight:800, color:"#fff", margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>€3.99<span style={{ fontSize:"0.68rem", fontWeight:500 }}>/mes</span></p>
                <p style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.6)", margin:"0.1rem 0 0", fontFamily:"'Hanken Grotesk',sans-serif" }}>€11.99 total</p>
              </div>
            </div>
          </div>
          <div onClick={()=>window.open(STRIPE.mensual,"_blank")} style={{ cursor:"pointer", background:BRAND.nightMid, border:`1px solid ${BRAND.nightSoft}`, borderRadius:"0.875rem", padding:"1rem 1.2rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ fontSize:"0.9rem", fontWeight:600, color:BRAND.bone, margin:"0 0 0.1rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Mensual</p>
              <p style={{ fontSize:"0.72rem", color:BRAND.mutedLight, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>Flexible, mes a mes</p>
            </div>
            <p style={{ fontSize:"1.05rem", fontWeight:700, color:BRAND.bone, margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>€5.99<span style={{ fontSize:"0.65rem", fontWeight:500, color:BRAND.mutedLight }}>/mes</span></p>
          </div>
        </div>
        <button onClick={()=>window.open(STRIPE.trimestral,"_blank")} style={{ width:"100%", background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.75rem", padding:"0.9rem", fontSize:"0.92rem", fontWeight:700, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", marginBottom:"1.25rem" }}>Empezar gratis hoy →</button>
        {["Contacto directo con empleadores","Carta de presentación en francés con IA","Conectá con otros saisonniers — no llegues solo","Descargá templates de CV y guías gratis","Alertas personalizadas por perfil","Francés laboral de supervivencia"].map((f,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.35rem" }}>
            <Icon name="check" size={13} color={BRAND.cobalt} strokeWidth={2.5} />
            <span style={{ fontSize:"0.76rem", color:BRAND.mutedLight, fontFamily:"'Hanken Grotesk',sans-serif" }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Badge de match para tarjetas
function MatchBadge({ match }) {
  if (!match) return null;
  if (match.estado === "match") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"0.25rem", background:"#E8F5EE", border:"1px solid #A8D5B5", borderRadius:"2rem", padding:"0.15rem 0.55rem" }}>
        <Icon name="star" size={10} color={BRAND.success} strokeWidth={2.5} />
        <span style={{ fontSize:"0.58rem", fontWeight:700, color:BRAND.success, fontFamily:"'Hanken Grotesk',sans-serif" }}>Match</span>
      </div>
    );
  }
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.25rem", background:BRAND.warnBg, border:`1px solid ${BRAND.warnBorder}`, borderRadius:"2rem", padding:"0.15rem 0.55rem" }}>
      <Icon name="info" size={10} color={BRAND.warn} strokeWidth={2.5} />
      <span style={{ fontSize:"0.58rem", fontWeight:700, color:BRAND.warn, fontFamily:"'Hanken Grotesk',sans-serif" }}>{match.problemas.length} requisito{match.problemas.length>1?"s":""}</span>
    </div>
  );
}

function ModalOferta({ oferta, onCerrar, onToast, esPremium, nombreUsuario, perfil }) {
  const [muroPago, setMuroPago] = useState(false);
  if (!oferta) return null;
  const match = calcularMatch(oferta, perfil);
   const copiar = () => navigator.clipboard.writeText(generarCarta(oferta, nombreUsuario, esPremium)).then(()=>onToast("Carta copiada"));
const intentarAplicar = () => { if (!esPremium) { setMuroPago(true); return; } if (oferta.email_empleador) { const carta = generarCarta(oferta, nombreUsuario, esPremium); if (oferta.email_empleador.includes('@')) { window.location.href = `mailto:${oferta.email_empleador}?subject=Candidature - ${PUESTOS_FR[oferta.titulo] || oferta.titulo}&body=${encodeURIComponent(carta)}`; } else { window.open(oferta.email_empleador.startsWith('http') ? oferta.email_empleador : `https://${oferta.email_empleador}`, '_blank'); } } };
  const esCiudad = oferta.tipo==="ciudad" || false;
  return (
    <>
      <div onClick={onCerrar} style={{ position:"fixed", inset:0, background:"rgba(11,20,38,0.7)", backdropFilter:"blur(8px)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#ffffff", borderRadius:"1.5rem 1.5rem 0 0", width:"100%", maxWidth:"480px", maxHeight:"90vh", overflowY:"auto", padding:"1.75rem 1.75rem 3rem", animation:"slideUp 0.38s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <div style={{ width:"2.5rem", height:"3px", background:BRAND.boneDeep, borderRadius:"2px", margin:"0 auto 1.5rem" }} />
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"1rem", marginBottom:"1.25rem" }}>
            <div style={{ flex:1 }}>
              <h2 style={{ fontSize:"1.25rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.25rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.02em", lineHeight:1.2 }}>{oferta.titulo}</h2>
              <p style={{ fontSize:"0.84rem", color:BRAND.muted, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>{oferta.establecimiento} · {oferta.ciudad}</p>
            </div>
            <span style={{ background:esCiudad?BRAND.boneDeep:BRAND.night, color:esCiudad?BRAND.muted:BRAND.bone, fontSize:"0.62rem", fontWeight:700, padding:"0.28rem 0.75rem", borderRadius:"2rem", whiteSpace:"nowrap", flexShrink:0, letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:"'Hanken Grotesk',sans-serif" }}>
              {esCiudad?"Sin aloj.":"Aloj. ✓"}
            </span>
          </div>

          {/* Match info */}
          {match && (
            <div style={{ marginBottom:"1.25rem", background:match.estado==="match"?"#E8F5EE":BRAND.warnBg, border:`1px solid ${match.estado==="match"?"#A8D5B5":BRAND.warnBorder}`, borderRadius:"0.875rem", padding:"0.875rem 1rem" }}>
              {match.estado==="match" ? (
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <Icon name="check" size={14} color={BRAND.success} strokeWidth={2.5} />
                  <span style={{ fontSize:"0.78rem", fontWeight:600, color:BRAND.success, fontFamily:"'Hanken Grotesk',sans-serif" }}>Tu perfil coincide con esta oferta</span>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.5rem" }}>
                    <Icon name="info" size={14} color={BRAND.warn} />
                    <span style={{ fontSize:"0.78rem", fontWeight:600, color:BRAND.warn, fontFamily:"'Hanken Grotesk',sans-serif" }}>Podés aplicar, pero tené en cuenta:</span>
                  </div>
                  {match.problemas.map((p,i)=>(
                    <div key={i} style={{ display:"flex", gap:"0.4rem", alignItems:"flex-start", marginBottom:"0.25rem" }}>
                      <span style={{ fontSize:"0.72rem", color:BRAND.warn, fontFamily:"'Hanken Grotesk',sans-serif" }}>· {p.msg}</span>
                    </div>
                  ))}
                  {match.problemas.some(p=>p.tipo==="frances") && (
                    <p style={{ fontSize:"0.68rem", color:BRAND.warn, margin:"0.4rem 0 0", fontFamily:"'Hanken Grotesk',sans-serif" }}>💡 Mejorá tu francés con nuestro curso orientado al trabajo de temporada.</p>
                  )}
                </>
              )}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem", marginBottom:"1.25rem" }}>
            {[{l:"Salario",v:oferta.salario},{l:"Horario",v:oferta.horario}].map(i=>(
              <div key={i.l} style={{ background:BRAND.boneDeep, borderRadius:"0.75rem", padding:"0.8rem 1rem" }}>
                <p style={{ fontSize:"0.62rem", color:BRAND.muted, margin:"0 0 0.2rem", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, fontFamily:"'Hanken Grotesk',sans-serif" }}>{i.l}</p>
                <p style={{ fontSize:"0.88rem", fontWeight:700, color:BRAND.night, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>{i.v}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize:"0.88rem", color:"#2D3A50", lineHeight:1.75, margin:"0 0 1.25rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>{oferta.descripcion}</p>
          <div style={{ marginBottom:"1.75rem" }}>
            {(oferta.requisitos||[]).map((r,i)=>(
              <div key={i} style={{ display:"flex", gap:"0.55rem", marginBottom:"0.4rem", alignItems:"flex-start" }}>
                <span style={{ flexShrink:0, marginTop:"3px" }}><Icon name="check" size={12} color={BRAND.cobalt} strokeWidth={2.5} /></span>
                <span style={{ fontSize:"0.86rem", color:"#2D3A50", lineHeight:1.55, fontFamily:"'Hanken Grotesk',sans-serif" }}>{r}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
            <button onClick={copiar} style={S.btnCobalt} onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"} onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"} onMouseEnter={e=>{e.currentTarget.style.opacity="0.9"}} onMouseLeave={e=>{e.currentTarget.style.opacity="1"}}>
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}><Icon name="copy" size={15} color="#fff" /> Copiar carta en francés</span>
            </button>
            <p style={{ fontSize:"0.67rem", color:BRAND.muted, margin:"-0.1rem 0 0", textAlign:"center", fontFamily:"'Hanken Grotesk',sans-serif" }}>Revisá y personalizá antes de enviar</p>
            <button onClick={intentarAplicar} style={S.btnOutline} onMouseEnter={e=>e.currentTarget.style.background=BRAND.cobaltDim} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}>
                {!esPremium && <Icon name="lock" size={14} color={BRAND.cobalt} />}
                <Icon name="mail" size={14} color={BRAND.cobalt} /> Aplicar con contacto directo
              </span>
            </button>
            {!esPremium && <p style={{ fontSize:"0.68rem", color:BRAND.warn, textAlign:"center", margin:"-0.2rem 0 0", fontWeight:600, fontFamily:"'Hanken Grotesk',sans-serif" }}>Requiere membresía · desde €5.99/mes</p>}
          </div>
        </div>
      </div>
      {muroPago && <MuroPago onCerrar={()=>setMuroPago(false)} />}
    </>
  );
}

function ChipsRegion({ regiones, activa, onChange, dark=true }) {
  return (
    <div style={{ display:"flex", gap:"0.4rem", overflowX:"auto", paddingBottom:"0.2rem", scrollbarWidth:"none" }}>
      {regiones.map(r=>{
        const isActive = activa===r.id;
        return (
          <button key={r.id} onClick={()=>onChange(r.id)} style={{ display:"flex", alignItems:"center", gap:"0.3rem", background:isActive?(dark?BRAND.bone:BRAND.night):"transparent", color:isActive?(dark?BRAND.night:BRAND.bone):(dark?"rgba(255,255,255,0.6)":"rgba(11,20,38,0.5)"), border:`1px solid ${isActive?(dark?BRAND.bone:BRAND.night):(dark?"rgba(255,255,255,0.15)":"rgba(11,20,38,0.15)")}`, borderRadius:"2rem", padding:"0.35rem 0.75rem 0.35rem 0.6rem", fontSize:"0.73rem", fontWeight:600, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s" }}>
            <Icon name={r.icon} size={12} color={isActive?(dark?BRAND.cobalt:BRAND.bone):(dark?"rgba(255,255,255,0.5)":"rgba(11,20,38,0.4)")} strokeWidth={2} />{r.label}
          </button>
        );
      })}
    </div>
  );
}

function TarjetaOferta({ oferta, onClick, perfil, guardada, onToggleGuardar }){
  const esCiudad = oferta.tipo === "ciudad";
  const match = calcularMatch(oferta, perfil);
  const idxSlash = oferta.titulo.indexOf("/a");
  const tituloAntes = idxSlash>=0 ? oferta.titulo.slice(0,idxSlash) : oferta.titulo;
  const tituloDespues = idxSlash>=0 ? oferta.titulo.slice(idxSlash+2) : "";

  return (
    <div
      onClick={()=>onClick(oferta)}
      style={{ position:"relative", background:"#fff", border:`1.5px solid ${match?.estado==="match"?"#A8D5B5":BRAND.boneDeep}`, borderRadius:"14px", overflow:"hidden", cursor:"pointer", userSelect:"none", transition:"box-shadow 0.18s, border-color 0.18s" }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 24px rgba(11,20,38,0.08)";e.currentTarget.style.borderColor=BRAND.cobalt+"44"}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=match?.estado==="match"?"#A8D5B5":BRAND.boneDeep}}>

      <div style={{ padding:"1.1rem 1.25rem 0.875rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.875rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:BRAND.cobalt }} />
            <span style={{ fontSize:"10.5px", fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", color:BRAND.cobalt, fontFamily:"'DM Mono',monospace" }}>Búsqueda activa</span>
          </div>
          <button
            onClick={(e)=>{ e.stopPropagation(); onToggleGuardar && onToggleGuardar(oferta.id); }}
            style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex" }}
          >
            <Icon name="star" size={18} color={guardada ? BRAND.cobalt : "rgba(11,20,38,0.25)"} strokeWidth={1.7} />
          </button>
        </div>

        {match && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"11.5px", padding:"5px 10px", borderRadius:"6px", marginBottom:"0.875rem", background: match.estado==="match" ? "#EAF3DE" : "#FFF8E0", color: match.estado==="match" ? "#3B6D11" : "#7A5500", fontWeight:600 }}>
            {match.estado==="match" ? "✓ Coincide con tu perfil" : `⚠ ${match.problemas[0]?.msg}`}
          </div>
        )}

        <h3 style={{ fontSize:"22px", fontWeight:800, color:BRAND.night, margin:"0 0 4px", lineHeight:1.1, fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.02em" }}>
          {tituloAntes}{idxSlash>=0 && <span style={{ color:BRAND.cobalt }}>/a</span>}{tituloDespues}
        </h3>
        <p style={{ fontSize:"13px", color:"rgba(11,20,38,0.5)", margin:0, fontWeight:500 }}>
          {oferta.localidad && `${oferta.localidad} · `}{oferta.region || "Francia"}
        </p>
        {oferta.descripcion && (
          <p style={{ fontSize:"12.5px", color:"rgba(11,20,38,0.55)", margin:"0.6rem 0 0", lineHeight:1.55 }}>
            {oferta.descripcion.length > 110 ? oferta.descripcion.slice(0,110)+"…" : oferta.descripcion}
          </p>
        )}
      </div>

      <div style={{ display:"flex", borderTop:`1px solid #F0EEE6` }}>
        {[
          { label:"Contrato", value: oferta.contrato },
          { label:"Alojamiento", value: esCiudad ? "No incluido" : "Incluido", accent: !esCiudad },
          { label:"Salario", value: oferta.salario },
        ].map((row,i,arr)=>(
          <div key={i} style={{ flex:1, padding:"0.75rem 1rem", borderRight: i<arr.length-1 ? `1px solid #F0EEE6` : "none" }}>
            <p style={{ margin:"0 0 3px", fontSize:"9px", letterSpacing:"0.06em", textTransform:"uppercase", color:"rgba(11,20,38,0.32)", fontFamily:"'DM Mono',monospace" }}>{row.label}</p>
            <p style={{ margin:0, fontSize:"12.5px", fontWeight:600, color: row.accent ? BRAND.cobalt : BRAND.night }}>{row.value}</p>
          </div>
        ))}
      </div>

      <div style={{ padding:"0.875rem 1.25rem", borderTop:`1px solid #F0EEE6`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:"0.88rem", color:BRAND.night }}>Ver detalle y postular</span>
        <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:BRAND.night, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon name="arrowRight" size={14} color={BRAND.bone} strokeWidth={2.3} />
        </div>
      </div>
    </div>
  );
}

function BannerPerfil({ perfil, onCompletar }) {
  const campos = ["nombre","pais","puesto","frances","disponibilidad","documentacion"];
  const pct = Math.round((campos.filter(c=>perfil[c]).length/campos.length)*100);
  return (
    <div onClick={onCompletar} style={{ margin:"0.875rem 1.25rem 0", background:BRAND.nightMid, border:`1px solid ${BRAND.nightSoft}`, borderRadius:"0.875rem", padding:"0.875rem 1.1rem", cursor:"pointer", display:"flex", alignItems:"center", gap:"0.875rem" }}>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:"0.72rem", fontWeight:600, color:BRAND.bone, margin:"0 0 0.3rem", fontFamily:"'Inter',sans-serif" }}>{pct===100 ? "Matching activado · editar perfil" : "Completá tu perfil"} — <span style={{ color:BRAND.cobalt }}>{pct}%</span></p>
        <div style={{ background:BRAND.nightSoft, borderRadius:"2rem", height:"3px", overflow:"hidden" }}>
          <div style={{ height:"100%", background:BRAND.cobalt, borderRadius:"2rem", width:`${pct}%`, transition:"width 0.5s" }} />
        </div>
        <p style={{ fontSize:"0.65rem", color:BRAND.mutedLight, margin:"0.25rem 0 0", fontFamily:"'DM Mono',monospace" }}>Activá el matching con ofertas personalizadas →</p>
      </div>
      <Icon name="arrowRight" size={16} color={BRAND.mutedLight} />
    </div>
  );
}

const PASOS_PERFIL_OPCIONES = {
  pais: {opts:[
    {v:"Argentina", flag:"🇦🇷"},{v:"Chile", flag:"🇨🇱"},{v:"Uruguay", flag:"🇺🇾"},
    {v:"Perú", flag:"🇵🇪"},{v:"Colombia", flag:"🇨🇴"},{v:"Ecuador", flag:"🇪🇨"},
    {v:"México", flag:"🇲🇽"},{v:"Venezuela", flag:"🇻🇪"},{v:"España", flag:"🇪🇸"},{v:"Otro", flag:"🌍"},
  ]},
  puesto: {opts:[
    {v:"Servicio de sala / Restaurante", icon:"wine"},
    {v:"Housekeeping / Limpieza", icon:"building"},
    {v:"Cocina / Ayudante / Lavaplatos", icon:"briefcase"}, // TODO: sin ícono específico, ajustar cuando sumes uno de cocina
    {v:"Recepción / Atención al cliente", icon:"phone"},
    {v:"Voiturier", icon:"briefcase"}, // TODO: sin ícono específico, ajustar cuando sumes uno de auto/llaves
    {v:"Barman", icon:"grapes"},
    {v:"Animación", icon:"zap"},
    {v:"Mantenimiento", icon:"tools"},
  ]},
  documentacion: {opts:[
    {v:"Ciudadano/a europeo/a (UE)", icon:"globe"},
    {v:"Titre de Séjour / Permiso de residencia", icon:"filetext"},
    {v:"Visa VVT aprobada y vigente", icon:"shield"},
    {v:"Visa VVT en trámite", icon:"calendar"},
    {v:"Sin documentación actualmente", icon:"warning"},
  ]},
  frances: {opts:[
    {v:"A1 — solo saludos básicos", icon:"volume"},
    {v:"A2 — entiendo instrucciones simples", icon:"volume"},
    {v:"B1 — me defiendo en el trabajo", icon:"volume"},
    {v:"B2 — me comunico con fluidez", icon:"volume"},
    {v:"C1/C2 — nivel avanzado", icon:"volume"},
  ]},
  disponibilidad: {opts:[
    {v:"Verano (abril–octubre)", icon:"sun"},
    {v:"Invierno (diciembre–abril)", icon:"mountain"},
    {v:"Ambas temporadas", icon:"calendar"},
  ]},
};

const CODIGOS_PAIS_PERFIL = [
  {pais:"Argentina", dial:"+54"},{pais:"Chile", dial:"+56"},{pais:"Uruguay", dial:"+598"},
  {pais:"Perú", dial:"+51"},{pais:"Colombia", dial:"+57"},{pais:"Ecuador", dial:"+593"},
  {pais:"México", dial:"+52"},{pais:"Venezuela", dial:"+58"},{pais:"España", dial:"+34"},
  {pais:"Italia", dial:"+39"},{pais:"Alemania", dial:"+49"},{pais:"Francia", dial:"+33"},
  {pais:"Portugal", dial:"+351"},{pais:"Suiza", dial:"+41"},{pais:"Reino Unido", dial:"+44"},
];

const PASOS_PERFIL_TOTAL = 8;

function SplashScreen() {
  return (
    <div style={{ position:"fixed", inset:0, background:BRAND.night, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:2000 }}>
      <svg width="34" height="34" viewBox="0 0 28 28" fill="none" style={{ marginBottom:"1rem", animation:"scaleIn 0.4s ease" }}>
        <rect x="0" y="0" width="13" height="13" rx="2.5" fill="#0A3AF2"/><rect x="15" y="0" width="13" height="13" rx="2.5" fill="#0A3AF2" opacity="0.55"/><rect x="0" y="15" width="13" height="13" rx="2.5" fill="#0A3AF2" opacity="0.3"/><rect x="15" y="15" width="13" height="13" rx="2.5" fill="#0A3AF2" opacity="0.12"/>
      </svg>
      <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:"1.1rem", color:BRAND.bone, letterSpacing:"-0.025em" }}>Saison</span>
    </div>
  );
}
function ModalPerfil({ perfil, onGuardar, onCerrar, forzado }) {
  const [form, setForm] = useState(perfil||{});
  const [paso, setPaso] = useState(0);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const irSiguiente = () => setPaso(p=>Math.min(p+1, PASOS_PERFIL_TOTAL-1));
  const irAtras = () => paso===0 ? (forzado ? null : onCerrar()) : setPaso(p=>p-1);

  const puedeAvanzar = () => {
    if (paso===0) return (form.nombre||"").trim().length>1;
    if (paso===1) return !!form.pais;
    if (paso===2) return !!form.puesto;
    if (paso===3) return !!form.documentacion;
    if (paso===4) return !!form.frances;
    if (paso===5) return !!form.disponibilidad;
    if (paso===6) return !!form.whatsappCodigo && (form.whatsappNumero||"").trim().length>3;
    return true;
  };

  const guardarFinal = () => {
    if (!form.whatsappCodigo || !form.whatsappNumero) { alert("Ingresá tu WhatsApp para poder guardar el perfil."); setPaso(6); return; }
    onGuardar({...form, whatsapp:`${form.whatsappCodigo} ${form.whatsappNumero}`});
  };

  const OpcionGrande = ({icon, titulo, campo, valor}) => (
    <div onClick={()=>set(campo,valor)} style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.875rem 0.95rem", border:`1.5px solid ${form[campo]===valor?BRAND.cobalt:BRAND.boneDeep}`, background:form[campo]===valor?BRAND.cobalt+"10":"#fff", borderRadius:"10px", cursor:"pointer", marginBottom:"0.55rem", transition:"all 0.15s" }}>
      <div style={{ width:"34px", height:"34px", borderRadius:"8px", background:form[campo]===valor?BRAND.cobalt:BRAND.boneDeep, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon name={icon} size={16} color={form[campo]===valor?"#fff":BRAND.night} strokeWidth={1.7} />
      </div>
      <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:"0.85rem", color:BRAND.night, flex:1 }}>{titulo}</span>
      <div style={{ width:"18px", height:"18px", borderRadius:"50%", border:`1.5px solid ${form[campo]===valor?BRAND.cobalt:BRAND.boneDeep}`, background:form[campo]===valor?BRAND.cobalt:"transparent", flexShrink:0 }} />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(11,20,38,0.7)", backdropFilter:"blur(8px)", zIndex:800, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:BRAND.bone, borderRadius:"1.5rem 1.5rem 0 0", width:"100%", maxWidth:"480px", maxHeight:"92vh", display:"flex", flexDirection:"column", animation:"slideUp 0.38s cubic-bezier(0.34,1.56,0.64,1)" }}>

        <div style={{ padding:"1rem 1.75rem 0" }}>
          <div style={{ width:"2.5rem", height:"3px", background:BRAND.boneDeep, borderRadius:"2px", margin:"0 auto 1rem" }} />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"0.75rem" }}>
            {(!forzado || paso>0) && (
              <div onClick={irAtras} style={{ width:"30px", height:"30px", borderRadius:"8px", border:`1.3px solid ${BRAND.boneDeep}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Icon name="arrowRight" size={13} color={BRAND.night} strokeWidth={2.3} style={{transform:"rotate(180deg)"}} />
              </div>
            )}
            {forzado && paso===0 && <div />}
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:BRAND.muted }}>{paso+1} / {PASOS_PERFIL_TOTAL}</span>
          </div>
          <div style={{ background:BRAND.boneDeep, borderRadius:"2rem", height:"3px", marginBottom:"1.25rem", overflow:"hidden" }}>
            <div style={{ height:"100%", background:BRAND.cobalt, borderRadius:"2rem", width:`${((paso+1)/PASOS_PERFIL_TOTAL)*100}%`, transition:"width 0.3s" }} />
          </div>
        </div>

        <div style={{ padding:"0 1.75rem 1.5rem", overflowY:"auto", flex:1 }}>

          {paso===0 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Empecemos</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 0.4rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>¿Cómo te llamás?</h2>
            <p style={{ fontSize:"0.8rem", color:BRAND.muted, margin:"0 0 1.25rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Así te van a ver otros saisonniers y los empleadores.</p>
            <input type="text" value={form.nombre||""} onChange={e=>set("nombre",e.target.value)} placeholder="Ej: Valentina García" style={S.input} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
          </>)}

          {paso===1 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Tu perfil</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 1.25rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>¿De dónde sos?</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
              {PASOS_PERFIL_OPCIONES.pais.opts.map(o=>(
                <div key={o.v} onClick={()=>set("pais",o.v)} style={{ display:"flex", alignItems:"center", gap:"0.5rem", padding:"0.7rem 0.75rem", border:`1.5px solid ${form.pais===o.v?BRAND.cobalt:BRAND.boneDeep}`, background:form.pais===o.v?BRAND.cobalt+"10":"#fff", borderRadius:"9px", cursor:"pointer" }}>
                  <span>{o.flag}</span>
                  <span style={{ fontSize:"0.78rem", fontWeight:600, color:BRAND.night }}>{o.v}</span>
                </div>
              ))}
            </div>
          </>)}

          {paso===2 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Tu perfil</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 1.25rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>¿En qué querés trabajar?</h2>
            {PASOS_PERFIL_OPCIONES.puesto.opts.map(o=><OpcionGrande key={o.v} icon={o.icon} titulo={o.v} campo="puesto" valor={o.v} />)}
          </>)}

          {paso===3 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Documentación</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 1.25rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>¿Podés trabajar en Francia?</h2>
            {PASOS_PERFIL_OPCIONES.documentacion.opts.map(o=><OpcionGrande key={o.v} icon={o.icon} titulo={o.v} campo="documentacion" valor={o.v} />)}
          </>)}

          {paso===4 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Idioma</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 1.25rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>¿Cuánto francés hablás?</h2>
            {PASOS_PERFIL_OPCIONES.frances.opts.map(o=><OpcionGrande key={o.v} icon={o.icon} titulo={o.v} campo="frances" valor={o.v} />)}
          </>)}

          {paso===5 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Disponibilidad</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 1.25rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>¿Cuándo podés viajar?</h2>
            {PASOS_PERFIL_OPCIONES.disponibilidad.opts.map(o=><OpcionGrande key={o.v} icon={o.icon} titulo={o.v} campo="disponibilidad" valor={o.v} />)}
          </>)}

          {paso===6 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Contacto</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 0.4rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>Dejanos tu WhatsApp</h2>
            <p style={{ fontSize:"0.8rem", color:BRAND.muted, margin:"0 0 1.25rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Para conectar con empleadores y otros saisonniers que van a tu mismo destino.</p>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <select value={form.whatsappCodigo||""} onChange={e=>set("whatsappCodigo",e.target.value)} style={{ ...S.input, appearance:"none", cursor:"pointer", flex:"0 0 115px" }} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep}>
                <option value="">Código</option>
                {CODIGOS_PAIS_PERFIL.map(c=><option key={c.dial} value={c.dial}>{c.dial} {c.pais}</option>)}
              </select>
              <input type="tel" value={form.whatsappNumero||""} onChange={e=>set("whatsappNumero",e.target.value)} placeholder="9 11 1234 5678" style={{ ...S.input, flex:1 }} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
            </div>
          </>)}

          {paso===7 && (<>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.6rem", color:BRAND.cobalt, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 0.5rem" }}>Último paso</p>
            <h2 style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, margin:"0 0 0.4rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>Contanos de tu viaje</h2>
            <p style={{ fontSize:"0.8rem", color:BRAND.muted, margin:"0 0 1.25rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Esto es opcional, pero ayuda a que otros saisonniers te encuentren.</p>
            <label style={S.label}>Región de destino</label>
            <select value={form.region_destino||""} onChange={e=>set("region_destino",e.target.value)} style={{ ...S.input, appearance:"none", cursor:"pointer", marginBottom:"0.875rem" }} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep}>
              <option value="">Seleccioná...</option>
              <option>Costa Azul / Var / Córcega</option>
              <option>País Vasco / Costa Atlántica</option>
              <option>Alpes / Saboya / Pirineos</option>
              <option>Provenza / Interior Sur</option>
              <option>Grandes Ciudades</option>
            </select>
            <label style={S.label}>Fecha de viaje</label>
            <input type="text" value={form.fecha_viaje||""} onChange={e=>set("fecha_viaje",e.target.value)} placeholder="Ej: Diciembre 2026" style={{ ...S.input, marginBottom:"0.875rem" }} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
            <label style={S.label}>Sobre vos</label>
            <input type="text" value={form.bio_viajero||""} onChange={e=>set("bio_viajero",e.target.value.slice(0,100))} placeholder="Ej: Busco gente para jugar al fútbol" style={S.input} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
            <p style={{ fontSize:"0.68rem", color:BRAND.mutedLight, margin:"0.25rem 0 0" }}>{(form.bio_viajero||"").length}/100</p>
          </>)}

        </div>

        <div style={{ padding:"0 1.75rem 1.75rem" }}>
          {paso < PASOS_PERFIL_TOTAL-1 ? (
            <button onClick={irSiguiente} disabled={!puedeAvanzar()} style={{ ...S.btnCobalt, opacity:puedeAvanzar()?1:0.35, cursor:puedeAvanzar()?"pointer":"default" }}>Siguiente →</button>
          ) : (
            <>
              <button onClick={guardarFinal} style={S.btnCobalt}>Terminar →</button>
              <p onClick={guardarFinal} style={{ textAlign:"center", fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:BRAND.mutedLight, margin:"0.6rem 0 0", cursor:"pointer" }}>Completar esto después</p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ================================================================
// TAB OFERTAS
// ================================================================
function TabOfertas({ usuario, onToast, esPremium, onCompletarPerfil, onToggleGuardar, ofertaExterna, onCerrarExterna }) {
 const [modo, setModo] = useState("alojamiento");
  const [ofertasDB, setOfertasDB] = useState([]);

  useEffect(() => {
    const fetchOfertas = async () => {
      const { data, error } = await supabase
        .from('ofertas')
  
        .select('*')
        .eq('activa', true);
      console.log('Supabase response:', data, error);
if (!error && data) setOfertasDB(data);
    };
    fetchOfertas();
  }, []);
  const [q, setQ] = useState("");
  const [regionAloj, setRegionAloj] = useState("todas");
  const [regionCiudad, setRegionCiudad] = useState("todas");
  const [sel, setSel] = useState(null);
  useEffect(() => {
    if (ofertaExterna) setSel(ofertaExterna);
  }, [ofertaExterna]);
  const perfil = usuario?.perfil || {};
  const esAloj = modo==="alojamiento";
  const ofertas = ofertasDB.length > 0 ? ofertasDB : (esAloj ? OFERTAS_ALOJAMIENTO : OFERTAS_CIUDAD);
  const regionActiva = esAloj ? regionAloj : regionCiudad;
  const setRegion = esAloj ? setRegionAloj : setRegionCiudad;
  const regiones = esAloj ? REGIONES_ALOJAMIENTO : REGIONES_CIUDAD;

  const filtradas = ofertas.filter(o=>{
  const mq = !q||[o.titulo,o.localidad,o.descripcion,o.puesto].some(s=>s?.toLowerCase().includes(q.toLowerCase()));
 const REGION_MAP = {
  'costa-azul': 'Costa Azul',
  'alpes': 'Alpes / Saboya',
  'corcega': 'Córcega',
  'atlantica': 'Costa Atlántica',
  'pais-vasco': 'País Vasco',
  'provenza': 'Provenza',
  'borgona': 'Borgoña / Ródano'
};
const mr = regionActiva==="todas"||o.region===(REGION_MAP[regionActiva]||regionActiva);
  const ma = ofertasDB.length > 0 ? (esAloj ? o.alojamiento===true : o.alojamiento===false) : true;
  return mq&&mr&&ma;
});

  // Ordenar: matches primero
  const ordenadas = [...filtradas].sort((a,b)=>{
    const ma = calcularMatch(a, perfil);
    const mb = calcularMatch(b, perfil);
    if (ma?.estado==="match" && mb?.estado!=="match") return -1;
    if (mb?.estado==="match" && ma?.estado!=="match") return 1;
    return 0;
  });

  const matchCount = filtradas.filter(o=>calcularMatch(o,perfil)?.estado==="match").length;
  const perfilCompleto = ["nombre","pais","puesto","frances","disponibilidad","documentacion"].filter(c=>perfil[c]).length;

  return (
    <div style={{ background:BRAND.bone, minHeight:"100dvh", paddingBottom:"7rem" }}>
      <header style={{ background:BRAND.night, padding:"1rem 1rem 0", position:"sticky", top:0, zIndex:100, borderBottom:`2px solid ${BRAND.cobalt}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <div>
            <SaisonLogo dark={false} size="md" />
            <p style={{ fontSize:"0.72rem", color:BRAND.mutedLight, margin:"0.2rem 0 0", fontFamily:"'Hanken Grotesk',sans-serif" }}>Hola, <span style={{ color:BRAND.bone, fontWeight:500 }}>{usuario?.perfil?.nombre||usuario?.nombre}</span></p>
          </div>
          <button style={{ background:"transparent", border:`1px solid ${BRAND.nightSoft}`, borderRadius:"0.75rem", width:"38px", height:"38px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            <Icon name="bell" size={16} color={BRAND.mutedLight} />
            <span style={{ position:"absolute", top:"8px", right:"8px", width:"5px", height:"5px", background:BRAND.cobalt, borderRadius:"50%", border:`1.5px solid ${BRAND.night}` }} />
          </button>
        </div>
        <div style={{ display:"flex", background:BRAND.nightMid, borderRadius:"0.75rem", padding:"0.18rem", marginBottom:"0.875rem", border:`1px solid ${BRAND.nightSoft}` }}>
          {[["alojamiento","Con alojamiento"],["ciudad","Sin alojamiento"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setModo(m);setQ("");}} style={{ flex:1, background:modo===m?BRAND.cobalt:"transparent", border:"none", borderRadius:"0.6rem", padding:"0.5rem 0.4rem", fontSize:"0.76rem", fontWeight:600, color:modo===m?"#fff":BRAND.mutedLight, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", transition:"all 0.18s" }}>{l}</button>
          ))}
        </div>
        <div style={{ paddingBottom:"1rem" }}><ChipsRegion regiones={regiones} activa={regionActiva} onChange={setRegion} dark={true} /></div>
      </header>

      <BannerPerfil perfil={perfil} onCompletar={onCompletarPerfil} />

      {/* Banner matching activo */}
      {perfilCompleto >= 3 && matchCount > 0 && (
        <div style={{ margin:"0.875rem 1.25rem 0", background:"#E8F5EE", border:"1px solid #A8D5B5", borderRadius:"0.875rem", padding:"0.6rem 0.9rem", display:"flex", alignItems:"center", gap:"0.45rem" }}>
          <Icon name="star" size={13} color={BRAND.success} />
          <span style={{ fontSize:"0.73rem", color:BRAND.success, fontWeight:600, flex:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>{matchCount} oferta{matchCount!==1?"s":""} coinciden con tu perfil — aparecen primero</span>
        </div>
      )}

      {!esPremium && (
        <div style={{ margin:"0.875rem 1.25rem 0", background:BRAND.warnBg, border:`1px solid ${BRAND.warnBorder}`, borderRadius:"0.875rem", padding:"0.6rem 0.9rem", display:"flex", alignItems:"center", gap:"0.45rem" }}>
          <Icon name="lock" size={13} color={BRAND.warn} />
          <span style={{ fontSize:"0.73rem", color:BRAND.warn, fontWeight:600, flex:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>Podés ver las ofertas — activá membresía para aplicar directamente</span>
        </div>
      )}
      <div style={{ padding:"0.875rem 1.25rem 0.4rem" }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:"0.85rem", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}><Icon name="search" size={14} color={BRAND.muted} /></span>
          <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar puesto, ciudad o establecimiento…" style={{ ...S.input, paddingLeft:"2.3rem", fontSize:"0.84rem" }} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
        </div>
      </div>
      <div style={{ padding:"0.2rem 1.25rem 0.3rem" }}>
        <p style={{ fontSize:"0.68rem", color:BRAND.muted, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>{filtradas.length} oferta{filtradas.length!==1?"s":""} {regionActiva!=="todas"?`· ${regiones.find(r=>r.id===regionActiva)?.label}`:"· Francia"}</p>
      </div>
      <div style={{ padding:"0.3rem 1.25rem 7rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
        {ordenadas.length>0 ? ordenadas.map(o=><TarjetaOferta key={o.id} oferta={o} onClick={setSel} perfil={perfil} guardada={(usuario?.perfil?.ofertas_guardadas||[]).includes(o.id)} onToggleGuardar={onToggleGuardar} />) : (
          <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
            <p style={{ fontSize:"0.9rem", color:BRAND.muted, fontWeight:600, margin:"0 0 0.25rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>Sin resultados</p>
            <p style={{ fontSize:"0.76rem", color:BRAND.mutedLight, fontFamily:"'Hanken Grotesk',sans-serif" }}>Probá con otra zona o borrá el texto</p>
          </div>
        )}
      </div>
      <ModalOferta oferta={sel} onCerrar={()=>{ setSel(null); onCerrarExterna && onCerrarExterna(); }} onToast={onToast} esPremium={esPremium} nombreUsuario={usuario?.perfil?.nombre || usuario?.nombre} perfil={perfil} />
    </div>
  );
}

// ================================================================
// HERRAMIENTAS
// ================================================================
const CALENDARIO = [
  { region:"Costa Azul / Var / Córcega", temporada:"Verano (abril–octubre)", meses:"Enero → Marzo", urgencia:"alta", icon:"waves", detalle:"Las mejores posiciones en hoteles de lujo se cierran en febrero. En marzo quedan puestos pero con menos selección.", ventanaInicio:1, ventanaFin:3, temporadaInicio:4, temporadaFin:10 },
  { region:"País Vasco / Costa Atlántica", temporada:"Verano (abril–octubre)", meses:"Febrero → Abril", urgencia:"alta", icon:"wind", detalle:"Biarritz, Arcachon e Île de Ré tienen pico en marzo. Más flexible que la Costa Azul pero no conviene esperar.", ventanaInicio:2, ventanaFin:4, temporadaInicio:4, temporadaFin:10 },
  { region:"Alpes / Saboya / Pirineos", temporada:"Invierno (diciembre–abril)", meses:"Agosto → Octubre", urgencia:"alta", icon:"mountain", detalle:"Los grandes hoteles de esquí cierran sus equipos en septiembre. Anticipación crítica.", ventanaInicio:8, ventanaFin:10, temporadaInicio:12, temporadaFin:4 },
  { region:"Provenza / Interior Sur", temporada:"Verano (abril–octubre)", meses:"Febrero → Mayo", urgencia:"media", icon:"sun", detalle:"Más margen. Muchos restaurantes contratan hasta mayo. Agricultura tiene calendario propio.", ventanaInicio:2, ventanaFin:5, temporadaInicio:4, temporadaFin:10 },
  { region:"Grandes Ciudades", temporada:"Todo el año", meses:"Según necesidad", urgencia:"baja", icon:"city", detalle:"Rotación constante. Verano concentra más CDD pero se puede aplicar en cualquier momento.", ventanaInicio:null, ventanaFin:null, temporadaInicio:null, temporadaFin:null },
];
function calcularEstadoVentana(item) {
  if (!item.ventanaInicio) {
    return { urgencia:"baja", label:"Flexible", mensaje:"Podés aplicar en cualquier momento del año." };
  }
  const mesActual = new Date().getMonth() + 1;
  const { ventanaInicio, ventanaFin, temporadaInicio, temporadaFin } = item;
  const enVentana = mesActual >= ventanaInicio && mesActual <= ventanaFin;
  const enTemporada = temporadaInicio <= temporadaFin
    ? (mesActual >= temporadaInicio && mesActual <= temporadaFin)
    : (mesActual >= temporadaInicio || mesActual <= temporadaFin);

  if (enVentana) {
    return { urgencia:"alta", label:"¡Es el momento! Aplicá ahora", mensaje:"La ventana ideal de postulación está abierta ahora mismo. Los mejores puestos se cierran en las próximas semanas." };
  }
  if (mesActual < ventanaInicio) {
    const faltan = ventanaInicio - mesActual;
    return { urgencia:"baja", label:`Ventana abre en ${faltan} mes${faltan!==1?"es":""}`, mensaje:"Todavía no arrancó la temporada de postulaciones para esta región. Guardá la fecha." };
  }
  if (enTemporada) {
    const restantes = temporadaInicio <= temporadaFin
      ? temporadaFin - mesActual
      : (mesActual <= temporadaFin ? temporadaFin - mesActual : (12 - mesActual) + temporadaFin);
    if (restantes <= 2) {
      return { urgencia:"alta", label:"Temporada terminando — quedan pocas ofertas", mensaje:"La ventana ideal ya pasó y la temporada está por cerrar. Quedan las últimas vacantes de reemplazo, pero la selección es limitada." };
    }
    return { urgencia:"media", label:"Ventana cerrada, temporada en curso", mensaje:"Los mejores puestos ya se cerraron, pero todavía surgen vacantes de reemplazo durante la temporada." };
  }
  return { urgencia:"baja", label:"Fuera de temporada", mensaje:"Esta región no tiene contrataciones activas ahora. La próxima ventana se acerca." };
}
const GUIA_PUESTOS = [
  { puesto:"Plongeur (Lavaplatos)", nivel:"Ninguno", exp:"Sin experiencia", dificultad:1, tip:"Puerta de entrada táctica. Sin barreras de idioma. Alta demanda en toda Francia." },
  { puesto:"Polyvalent (Polivalente)", nivel:"A2 básico", exp:"Mínima", dificultad:1, tip:"El más fácil de contratar. Versátil entre sala, cocina y limpieza. Muy buscado." },
  { puesto:"Femme/Valet de Chambre", nivel:"A2 básico", exp:"Mínima", dificultad:2, tip:"Estable, mínima interacción con clientes. Ideal primer trabajo en Francia." },
  { puesto:"Commis de Cuisine", nivel:"A2 básico", exp:"Media", dificultad:2, tip:"Escalón ideal para aprender el oficio francés con alta demanda estacional." },
  { puesto:"Voiturier", nivel:"A2 básico", exp:"Requiere carné de conducir (manual)", dificultad:2, tip:"El carné con caja manual es más valorado que el idioma. Trato breve con el cliente, ideal si el francés todavía es limitado." },
  { puesto:"Mantenimiento / Técnico", nivel:"A1–A2", exp:"Valorada (electricidad, plomería, oficios)", dificultad:2, tip:"Baja barrera de idioma. Si tenés experiencia previa en un oficio, es una vía de entrada subestimada con buena demanda." },
  { puesto:"Commis de Salle", nivel:"B1 intermedio", exp:"Media", dificultad:3, tip:"Contacto directo con el cliente. Francés funcional imprescindible." },
  { puesto:"Chef de Rang / Mesero", nivel:"B1–B2", exp:"Sólida", dificultad:3, tip:"Salario sobre el SMIC en el convenio HCR. Alta competencia en temporada alta." },
  { puesto:"Bartender / Barman", nivel:"B1–B2", exp:"Técnica", dificultad:3, tip:"Conocimiento técnico de coctelería requerido. Propinas altas en zonas turísticas." },
  { puesto:"Réceptionniste", nivel:"B2 + inglés", exp:"Sólida", dificultad:4, tip:"Perfil muy competitivo. Excelente remuneración en hoteles 4–5 estrellas." },
  { puesto:"Animación", nivel:"B1–B2", exp:"Deseable, no excluyente", dificultad:4, tip:"El puesto con más exigencia de francés e interacción social. Buena paga en clubes y resorts, pero la selección es más dura." },
];

const CONTRATO_ITEMS = [
  { id:"tipo", t:"El contrato es CDD Saisonnier", d:"Art. L1242-2 3° del Código del Trabajo francés.", tipo:"ok" },
  { id:"nivel", t:"Tiene Niveau y Échelon especificados", d:"Sin estos datos el empleador puede fijar el salario arbitrariamente por debajo de la grille HCR.", tipo:"flag" },
  { id:"promesse", t:"Recibiste Promesse d'embauche antes de llegar", d:"El único documento que vincula legalmente al empleador antes de firmar.", tipo:"flag" },
  { id:"descanso", t:"Especifica mínimo 11h de descanso entre jornadas", d:"Derecho absoluto. 11 horas consecutivas entre jornadas.", tipo:"ok" },
  { id:"diaLibre", t:"Contempla al menos 1 día libre semanal", d:"24 horas de descanso semanal obligatorio por ley.", tipo:"ok" },
  { id:"alojamiento", t:"El alojamiento y su descuento están detallados", d:"El monto descontado debe figurar en el contrato y no exceder los topes del convenio HCR.", tipo:"ok" },
  { id:"cobros", t:"No te pidieron dinero por ningún trámite", d:"Cualquier cobro por gestión de contrato es una estafa.", tipo:"flag" },
];

const DOCS_CIERRE = [
  { id:"cert", icon:"filetext", titulo:"Certificat de Travail", desc:"Prueba oficial de posición, empleador y duración.", uso:"Para futuras búsquedas en Francia y como respaldo migratorio." },
  { id:"solde", icon:"euro", titulo:"Solde de Tout Compte", desc:"Liquidación final: sueldo, horas extras e indemnización de vacaciones (10% del bruto si no tomaste días).", uso:"Verificá que incluya el 10%. Si tomaste días libres, se reduce proporcionalmente." },
  { id:"paie", icon:"calculator", titulo:"Último Bulletin de Paie", desc:"El recibo definitivo que valida tus aportes a la Sécurité Sociale.", uso:"Para declarar ingresos y acreditar experiencia laboral en Francia." },
];

const CL_ITEMS = [
  { id:"sim", icon:"sim", t:"Comprar SIM local", d:"LycaMobile — prepago ~€10 en cualquier Tabac. Sin domicilio ni contrato.", afiliado: null },
  { id:"banco", icon:"bank", t:"Abrir cuenta bancaria digital", d:"Revolut o Wise. Sin cita. El RIB generado es tu cuenta para cobrar el sueldo.", afiliado: "banco" },
  { id:"fr", icon:"graduation", t:"Aprender lo básico en francés", d:"Tenemos un curso orientado al trabajo de temporada en Francia.", cta:true },
  { id:"docs", icon:"folder", t:"Digitalizar todos tus documentos", d:"Pasaporte, CV, carta y contrato en Google Drive o iCloud." },
  { id:"seguro", icon:"shield", t:"Contratar seguro de viaje/salud", d:"Obligatorio para visa VVT. Opciones: Chapka o iati Seguros.", badge:"Solo visa VVT", afiliado:"seguro" },
];

const CATEGORIAS_FRASES = [
  { id:"llegada", label:"Primer día", icon:"zap", frases:[
    { es:"Buenos días, soy el/la nuevo/a", fr:"Bonjour, je suis le/la nouveau/nouvelle", pron:"Bon-zhur, zhuh swee luh/la noo-VOH/VEL" },
    { es:"¿A qué hora empieza el servicio?", fr:"À quelle heure commence le service ?", pron:"Ah kel ur ko-MONCE luh ser-VEES?" },
    { es:"¿Dónde me cambio de ropa?", fr:"Où est le vestiaire ?", pron:"Oo eh luh ves-TYAIR?" },
    { es:"¿Quién es el/la responsable?", fr:"Qui est le/la responsable ?", pron:"Kee eh luh/la res-pon-SABL?" },
    { es:"No entiendo, ¿puede repetir?", fr:"Je ne comprends pas, vous pouvez répéter ?", pron:"Zhuh nuh con-PRON pa, voo poo-VEH re-pe-TEH?" },
  ]},
  { id:"cocina", label:"En cocina", icon:"tools", frases:[
    { es:"¿Qué hago ahora?", fr:"Qu'est-ce que je fais maintenant ?", pron:"Kes-kuh zhuh FEH men-ten-NON?" },
    { es:"Ya terminé", fr:"J'ai terminé", pron:"Zheh ter-mee-NEH" },
    { es:"Necesito más hielo / sal / aceite", fr:"J'ai besoin de plus de glace / sel / huile", pron:"Zheh buh-ZWAN duh plu duh GLAS / SEL / WEEL" },
    { es:"¡Atención, plato caliente!", fr:"Attention, c'est chaud !", pron:"Ah-ton-SYON, seh SHO!" },
    { es:"¿Cuántas personas en la mesa?", fr:"Combien de couverts à la table ?", pron:"Com-BYAN duh koo-VAIR ah la TABL?" },
  ]},
  { id:"sala", label:"En sala", icon:"message", frases:[
    { es:"Buenos días / buenas tardes", fr:"Bonjour / Bonsoir", pron:"Bon-ZHUR / Bon-SWAR" },
    { es:"¿Ya eligieron?", fr:"Vous avez choisi ?", pron:"Voo za-VEH shwa-ZEE?" },
    { es:"Enseguida se lo traigo", fr:"Je vous l'apporte tout de suite", pron:"Zhuh voo la-PORT too duh SWEET" },
    { es:"¿Todo estuvo bien?", fr:"Tout s'est bien passé ?", pron:"Too seh byan pa-SEH?" },
    { es:"La cuenta — ¿cómo van a pagar?", fr:"L'addition, vous payez comment ?", pron:"La-dee-SYON, voo peh-YEH ko-MON?" },
  ]},
  { id:"telefono", label:"Por teléfono", icon:"phone", frases:[
    { es:"Hola, habla [tu nombre]", fr:"Allô, c'est [prénom] à l'appareil", pron:"A-LO, seh [nombre] ah la-pa-REY" },
    { es:"¿De parte de quién?", fr:"C'est de la part de qui ?", pron:"Seh duh la PAR duh KEE?" },
    { es:"Un momento por favor", fr:"Un instant s'il vous plaît", pron:"Un ins-TON seel voo PLEH" },
    { es:"No está disponible ahora", fr:"Il/Elle n'est pas disponible pour le moment", pron:"Eel/El neh pa dees-po-NEEBL poor luh mo-MON" },
    { es:"¿Puede llamar más tarde?", fr:"Pouvez-vous rappeler plus tard ?", pron:"Poo-VEH voo ra-puh-LEH plu TAR?" },
  ]},
  { id:"urgencias", label:"Urgencias", icon:"warning", frases:[
    { es:"Hay un problema", fr:"Il y a un problème", pron:"Eel ya un pro-BLEM" },
    { es:"Necesito ayuda", fr:"J'ai besoin d'aide", pron:"Zheh buh-ZWAN DED" },
    { es:"No me siento bien", fr:"Je ne me sens pas bien", pron:"Zhuh nuh muh SON pa byan" },
    { es:"¿Dónde está el hospital más cercano?", fr:"Où est l'hôpital le plus proche ?", pron:"Oo eh lo-pee-TAL luh plu PROSH?" },
    { es:"Llame a la policía / ambulancia", fr:"Appelez la police / une ambulance", pron:"A-puh-LEH la po-LEES / un om-bu-LONSE" },
  ]},
];

function Section({ icon, title, children, badge }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${BRAND.boneDeep}`, borderRadius:"0.125rem", padding:"1.25rem 1.3rem", boxShadow:"none", marginBottom:"0.5rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.75rem" }}>
        <div style={{ width:"30px", height:"30px", borderRadius:"0.375rem", background:BRAND.boneDeep, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon name={icon} size={15} color={BRAND.cobalt} />
        </div>
        <div style={{ flex:1 }}>
          <h3 style={{ fontSize:"0.88rem", fontWeight:700, color:BRAND.night, margin:0, fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.015em" }}>{title}</h3>
        </div>
        {badge && <span style={{ fontSize:"0.6rem", fontWeight:500, color:BRAND.cobalt, background:BRAND.cobaltDim, border:`1px solid ${BRAND.cobaltSoft}`, borderRadius:"2rem", padding:"0.12rem 0.55rem", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em" }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}
// ================================================================
// CALCULADORA CORREGIDA
// ================================================================
function Calculadora() {
  const [bruto, setBruto] = useState("");
  const [meses, setMeses] = useState("");
  const neto = bruto ? Math.round(parseFloat(bruto)*0.782) : null;
  const vacMes = bruto ? Math.round(parseFloat(bruto)*0.1) : null;
  const vacTotal = (vacMes && meses) ? Math.round(vacMes * parseFloat(meses)) : null;

  return (
    <Section icon="calculator" title="Calculadora de Sueldo Neto">
      <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 1rem", lineHeight:1.55, fontFamily:"'Hanken Grotesk',sans-serif" }}>SMIC 2026: <strong style={{ color:BRAND.cobalt }}>€12,31/hora</strong> · €1.867,02 bruto · €1.477,93 neto (35h/mes)</p>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", marginBottom:"0.875rem" }}>
        <div>
          <label style={S.label}>Sueldo bruto mensual (€)</label>
          <input type="number" value={bruto} onChange={e=>setBruto(e.target.value)} placeholder="Ej: 2600" style={S.input} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
        </div>
        <div>
          <label style={S.label}>Duración del contrato (meses) — opcional</label>
          <input type="number" value={meses} onChange={e=>setMeses(e.target.value)} placeholder="Ej: 5" style={S.input} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
        </div>
      </div>
      {neto!==null && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
          <div style={{ background:BRAND.night, borderRadius:"0.875rem", padding:"1.1rem", textAlign:"center" }}>
            <p style={{ fontSize:"0.65rem", color:BRAND.mutedLight, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 0.3rem", fontWeight:600, fontFamily:"'Hanken Grotesk',sans-serif" }}>Sueldo neto estimado</p>
            <p style={{ fontSize:"2rem", fontWeight:700, color:BRAND.bone, margin:"0 0 0.1rem", letterSpacing:"-0.03em", fontFamily:"'Bricolage Grotesque',sans-serif" }}>€{neto.toLocaleString()}</p>
            <p style={{ fontSize:"0.7rem", color:BRAND.mutedLight, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>aprox. en mano / mes</p>
          </div>
          <div style={{ background:"#E8F5EE", border:"1px solid #A8D5B5", borderRadius:"0.75rem", padding:"0.875rem 1rem" }}>
            <p style={{ fontSize:"0.68rem", color:BRAND.success, fontWeight:700, margin:"0 0 0.4rem", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:"'Hanken Grotesk',sans-serif" }}>+ Indemnización de vacaciones (10% del bruto)</p>
            <div style={{ display:"flex", gap:"0.6rem", alignItems:"stretch", flexWrap:"wrap" }}>
              <div style={{ flex:1, background:"rgba(255,255,255,0.6)", borderRadius:"0.5rem", padding:"0.5rem 0.75rem", minWidth:"110px" }}>
                <p style={{ fontSize:"0.6rem", color:BRAND.success, fontWeight:600, margin:"0 0 0.15rem", textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'Hanken Grotesk',sans-serif" }}>Por mes trabajado</p>
                <p style={{ fontSize:"1.05rem", fontWeight:700, color:BRAND.success, margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>€{vacMes.toLocaleString()}</p>
              </div>
              {vacTotal && (
                <div style={{ flex:1, background:"rgba(255,255,255,0.6)", borderRadius:"0.5rem", padding:"0.5rem 0.75rem", minWidth:"110px" }}>
                  <p style={{ fontSize:"0.6rem", color:BRAND.success, fontWeight:600, margin:"0 0 0.15rem", textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'Hanken Grotesk',sans-serif" }}>Total por {meses} meses</p>
                  <p style={{ fontSize:"1.05rem", fontWeight:700, color:BRAND.success, margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>€{vacTotal.toLocaleString()}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize:"0.7rem", color:"#3A8A50", margin:"0.5rem 0 0", lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>Se acumula mes a mes y se cobra al finalizar el contrato. Solo aplica íntegro si no tomaste días de vacaciones durante la temporada.</p>
          </div>
          <div style={{ background:BRAND.warnBg, border:`1px solid ${BRAND.warnBorder}`, borderRadius:"0.75rem", padding:"0.75rem 1rem" }}>
            <p style={{ fontSize:"0.7rem", color:BRAND.warn, lineHeight:1.5, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>💡 El SMIC es el <strong>piso</strong>. Puestos con experiencia cobran más según la grille HCR.</p>
          </div>
        </div>
      )}
    </Section>
  );
}

function CuandoAplicar() {
  const [abierto, setAbierto] = useState(null);
  const urgColor = { alta:BRAND.red, media:"#C07000", baja:BRAND.cobalt };
  return (
    <Section icon="calendar" title="¿Cuándo aplicar?">
      <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 0.875rem", lineHeight:1.55, fontFamily:"'Hanken Grotesk',sans-serif" }}>La anticipación es el diferenciador real. Los mejores puestos se cierran meses antes del inicio de temporada.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
        {CALENDARIO.map((item,i)=>{
          const estado = calcularEstadoVentana(item);
          return (
          <div key={i} style={{ borderRadius:"0.75rem", border:`1px solid ${BRAND.boneDeep}`, overflow:"hidden" }}>
            <div onClick={()=>setAbierto(abierto===i?null:i)} style={{ display:"flex", alignItems:"center", gap:"0.7rem", padding:"0.8rem 0.9rem", cursor:"pointer" }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"0.5rem", background:BRAND.boneDeep, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon name={item.icon} size={15} color={BRAND.cobalt} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:"0.83rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.12rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{item.region}</p>
                <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                  <span style={{ fontSize:"0.7rem", color:BRAND.cobalt, fontWeight:600, fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.meses}</span>
                  <span style={{ background:urgColor[estado.urgencia]+"18", color:urgColor[estado.urgencia], fontSize:"0.58rem", fontWeight:700, padding:"0.1rem 0.45rem", borderRadius:"2rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>{estado.label}</span>
                </div>
              </div>
            </div>
            {abierto===i && (
              <div style={{ padding:"0 0.9rem 0.8rem", borderTop:`1px solid ${BRAND.boneDeep}` }}>
                <p style={{ fontSize:"0.78rem", color:urgColor[estado.urgencia], fontWeight:600, margin:"0.55rem 0 0.35rem", lineHeight:1.6, fontFamily:"'Hanken Grotesk',sans-serif" }}>{estado.mensaje}</p>
                <p style={{ fontSize:"0.78rem", color:BRAND.muted, margin:"0 0 0.25rem", lineHeight:1.6, fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.detalle}</p>
                <p style={{ fontSize:"0.7rem", color:BRAND.mutedLight, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.temporada}</p>
              </div>
            )}
          </div>
        )})}
      </div>
    </Section>
  );
}

function GuiaPuestos() {
  const [sel, setSel] = useState(null);
  const difColor = ["#22c55e","#22c55e","#5e9af0","#5e9af0","#f0a040","#f0a040","#e05555"];
  return (
    <Section icon="briefcase" title="Guía de Puestos">
      <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 0.875rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Tocá un puesto para ver requisitos de idioma y qué esperar.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.45rem" }}>
        {GUIA_PUESTOS.map((p,i)=>(
          <div key={i} style={{ borderRadius:"0.75rem", border:`1px solid ${sel===i?BRAND.cobalt:BRAND.boneDeep}`, background:sel===i?BRAND.boneDeep:BRAND.bone, overflow:"hidden", transition:"border-color 0.15s" }}>
            <div onClick={()=>setSel(sel===i?null:i)} style={{ display:"flex", alignItems:"center", gap:"0.7rem", padding:"0.75rem 0.875rem", cursor:"pointer" }}>
              <div style={{ display:"flex", gap:"2px", flexShrink:0 }}>
                {[1,2,3,4].map(n=>(
                  <div key={n} style={{ width:"5px", height:"16px", borderRadius:"2px", background:n<=p.dificultad?difColor[p.dificultad-1]:BRAND.boneDeep }} />
                ))}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:"0.85rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.1rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{p.puesto}</p>
                <p style={{ fontSize:"0.69rem", color:BRAND.muted, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>Francés: <span style={{ color:BRAND.cobalt, fontWeight:600 }}>{p.nivel}</span> · Exp: {p.exp}</p>
              </div>
            </div>
            {sel===i && (
              <div style={{ padding:"0 0.875rem 0.8rem", borderTop:`1px solid ${BRAND.boneDeep}` }}>
                <p style={{ fontSize:"0.78rem", color:BRAND.muted, margin:"0.5rem 0 0", lineHeight:1.6, fontFamily:"'Hanken Grotesk',sans-serif" }}>{p.tip}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function FrasesSup() {
  const [cat, setCat] = useState("llegada");
  const [pron, setPron] = useState({});
  const categoria = CATEGORIAS_FRASES.find(c=>c.id===cat);
  return (
    <Section icon="volume" title="Francés de Supervivencia">
      <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 0.875rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Las frases que necesitás el día 1 en el trabajo.</p>
      <div style={{ display:"flex", gap:"0.35rem", overflowX:"auto", paddingBottom:"0.2rem", marginBottom:"0.875rem", scrollbarWidth:"none" }}>
        {CATEGORIAS_FRASES.map(c=>(
          <button key={c.id} onClick={()=>setCat(c.id)} style={{ display:"flex", alignItems:"center", gap:"0.3rem", background:cat===c.id?BRAND.night:BRAND.boneDeep, color:cat===c.id?BRAND.bone:BRAND.muted, border:"none", borderRadius:"2rem", padding:"0.32rem 0.7rem", fontSize:"0.71rem", fontWeight:600, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s" }}>
            <Icon name={c.icon} size={11} color={cat===c.id?BRAND.bone:BRAND.muted} strokeWidth={2} />{c.label}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.45rem" }}>
        {categoria.frases.map((f,i)=>(
          <div key={i} style={{ borderRadius:"0.75rem", border:`1px solid ${BRAND.boneDeep}`, padding:"0.75rem 0.9rem" }}>
            <p style={{ fontSize:"0.68rem", color:BRAND.mutedLight, margin:"0 0 0.2rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'Hanken Grotesk',sans-serif" }}>{f.es}</p>
            <p style={{ fontSize:"0.92rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.25rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{f.fr}</p>
            <button onClick={()=>setPron(p=>({...p,[i]:!p[i]}))} style={{ background:"none", border:"none", padding:0, cursor:"pointer", fontSize:"0.67rem", color:BRAND.mutedLight, fontFamily:"'Hanken Grotesk',sans-serif", display:"flex", alignItems:"center", gap:"0.2rem" }}>
              <Icon name="volume" size={11} color={BRAND.mutedLight} /> {pron[i]?"Ocultar":"Ver pronunciación"}
            </button>
            {pron[i] && (
              <div style={{ marginTop:"0.35rem", background:BRAND.boneDeep, borderRadius:"0.5rem", padding:"0.38rem 0.6rem" }}>
                <p style={{ fontSize:"0.74rem", color:BRAND.cobalt, margin:0, fontStyle:"italic", fontFamily:"'Hanken Grotesk',sans-serif" }}>{f.pron}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ================================================================
// TAB VIAJEROS
// ================================================================


function TabViajeros({ esPremium, onUpgrade, usuario, onEnviarSolicitud, onResponderSolicitud, onCambioSolicitudes, onToast }) {
  const [perfiles, setPerfiles] = useState([]);
  const [conexiones, setConexiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const destinos = ["todos", "Costa Azul / Var / Córcega", "País Vasco / Costa Atlántica", "Alpes / Saboya / Pirineos", "Provenza / Interior Sur", "Grandes Ciudades"];
  const tieneWhatsapp = !!usuario?.perfil?.whatsapp;

  const cargarDatos = async () => {
    setCargando(true);
    const { data: perfilesData } = await supabase
      .from('Perfiles')
      .select('email, nombre, pais, puesto, disponibilidad, whatsapp, region_destino, fecha_viaje, bio_viajero')
      .not('whatsapp', 'is', null)
      .not('nombre', 'is', null)
      .neq('email', usuario?.email);
    if (perfilesData) setPerfiles(perfilesData);

    const { data: conexionesData } = await supabase
      .from('Conexiones')
      .select('*')
      .or(`email_solicitante.eq.${usuario?.email},email_receptor.eq.${usuario?.email}`);
    if (conexionesData) setConexiones(conexionesData);

    setCargando(false);
  };

  useEffect(() => { if (usuario?.email) cargarDatos(); }, [usuario?.email]);

  const filtrados = perfiles.filter(v => filtro === "todos" || v.region_destino === filtro);

  const banderaPorPais = {
    Argentina:"🇦🇷", Chile:"🇨🇱", Uruguay:"🇺🇾", Perú:"🇵🇪", Colombia:"🇨🇴",
    Ecuador:"🇪🇨", México:"🇲🇽", Venezuela:"🇻🇪", España:"🇪🇸", Italia:"🇮🇹",
    Alemania:"🇩🇪", Francia:"🇫🇷", Portugal:"🇵🇹", Suiza:"🇨🇭", "Reino Unido":"🇬🇧",
  };

  const conexionCon = (emailOtro) => conexiones.find(c =>
    (c.email_solicitante === usuario?.email && c.email_receptor === emailOtro) ||
    (c.email_receptor === usuario?.email && c.email_solicitante === emailOtro)
  );

  const solicitar = async (emailOtro) => {
    if (!esPremium) {
      onToast && onToast("Esta función es para miembros Saison — suscribite para acceder a la red de saisonniers.");
      onUpgrade();
      return;
    }
    const { error } = await onEnviarSolicitud(emailOtro);
    if (error) {
      alert("No se pudo enviar la solicitud: " + error.message);
      return;
    }
    onToast && onToast("¡Solicitud enviada!");
    cargarDatos();
  };

  const responder = async (id, nuevoEstado) => {
    await onResponderSolicitud(id, nuevoEstado);
    cargarDatos();
    onCambioSolicitudes && onCambioSolicitudes();
  };

  const contactar = (whatsapp) => {
    const numero = whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${numero}`, "_blank", "noopener");
  };

  return (
  <div style={{ background:BRAND.bone, minHeight:"100dvh", paddingBottom:"7rem" }}>
    <div style={{ background:BRAND.night, padding:"1.25rem 1.25rem 1rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.4rem" }}>
          <div>
            <h2 style={{ fontSize:"1.3rem", fontWeight:800, color:BRAND.bone, margin:0, fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>Conectá con saisonniers</h2>
            <p style={{ fontSize:"0.76rem", color:"rgba(245,243,236,0.6)", margin:"0.3rem 0 0", fontFamily:"'Hanken Grotesk',sans-serif", lineHeight:1.5 }}>Mismo destino, mismas fechas.</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", background:"rgba(10,58,242,0.2)", border:"1px solid rgba(10,58,242,0.35)", borderRadius:"2rem", padding:"0.25rem 0.7rem", flexShrink:0, marginLeft:"0.75rem" }}>
            <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:BRAND.cobalt }} />
            <span style={{ fontSize:"0.58rem", fontWeight:500, letterSpacing:"0.1em", textTransform:"uppercase", color:BRAND.cobalt, fontFamily:"'DM Mono',monospace" }}>{perfiles.length} activos</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.35rem", overflowX:"auto", paddingTop:"0.75rem", paddingBottom:"0.25rem", scrollbarWidth:"none" }}>
          {destinos.map(d => (
            <button key={d} onClick={() => setFiltro(d)} style={{ background:filtro===d?BRAND.bone:"transparent", color:filtro===d?BRAND.night:"rgba(255,255,255,0.55)", border:`1px solid ${filtro===d?BRAND.bone:"rgba(255,255,255,0.15)"}`, borderRadius:"2rem", padding:"0.35rem 0.75rem", fontSize:"0.71rem", fontWeight:600, cursor:"pointer", fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s", letterSpacing:"0.02em" }}>
              {d === "todos" ? "Todos" : d}
            </button>
          ))}
        </div>
      </div>

      {esPremium && !tieneWhatsapp && (
        <div style={{ margin:"0.875rem 1.25rem 0", background:"rgba(10,58,242,0.05)", border:`1px solid rgba(10,58,242,0.15)`, borderRadius:"10px", padding:"0.875rem 1.1rem", display:"flex", alignItems:"flex-start", gap:"0.75rem" }}>
          <Icon name="info" size={15} color={BRAND.cobalt} strokeWidth={2} />
          <div>
            <p style={{ fontSize:"0.75rem", fontWeight:600, color:BRAND.night, margin:"0 0 0.2rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Agregá tu WhatsApp para conectar</p>
            <p style={{ fontSize:"0.7rem", color:BRAND.muted, margin:0, fontFamily:"'Hanken Grotesk',sans-serif", lineHeight:1.5 }}>Para que otros saisonniers puedan contactarte, agregá tu número en el perfil.</p>
          </div>
        </div>
      )}

      <div style={{ margin:"0.875rem 1.25rem 7rem", display:"flex", flexDirection:"column", gap:"0.6rem" }}>
        {cargando ? (
          <p style={{ textAlign:"center", padding:"2rem 1rem", fontSize:"0.8rem", color:BRAND.muted, fontFamily:"'Hanken Grotesk',sans-serif" }}>Cargando saisonniers…</p>
        ) : filtrados.length === 0 ? (
          <p style={{ textAlign:"center", padding:"2rem 1rem", fontSize:"0.8rem", color:BRAND.muted, fontFamily:"'Hanken Grotesk',sans-serif" }}>Todavía no hay saisonniers con destino confirmado en esta región. Sé de los primeros — completá tu perfil.</p>
        ) : filtrados.map((v, i) => {

          const conexion = conexionCon(v.email);
          const soyReceptor = conexion?.email_receptor === usuario?.email;
          return (
            <div key={v.email} style={{ background:"#fff", border:`1.5px solid ${conexion?.estado==="aceptada"?BRAND.cobalt:BRAND.boneDeep}`, borderRadius:"10px", padding:"0.95rem 1rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"0.75rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", flex:1, minWidth:0 }}>
                  <div style={{ width:"38px", height:"38px", borderRadius:"8px", background:BRAND.boneDeep, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>
                    {banderaPorPais[v.pais] || "🌍"}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ margin:"0 0 2px", fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:"0.94rem", color:BRAND.night, letterSpacing:"-0.01em" }}>{v.nombre}</p>
                    <p style={{ margin:0, fontSize:"0.78rem", color:BRAND.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {v.pais}{v.region_destino && ` · ${v.region_destino}`}{v.fecha_viaje && ` · ${v.fecha_viaje}`}
                    </p>
                  </div>
                </div>
              </div>
              {v.bio_viajero && (
                <p style={{ margin:"0.55rem 0 0", paddingLeft:"calc(38px + 0.75rem)", fontSize:"0.78rem", color:BRAND.mutedLight, fontStyle:"italic", lineHeight:1.5 }}>"{v.bio_viajero}"</p>
              )}
              <div style={{ marginTop:"0.65rem", paddingLeft:"calc(38px + 0.75rem)", display:"flex", justifyContent:"flex-end", gap:"0.9rem" }}>
                {!conexion && (
                  <button onClick={() => solicitar(v.email)} style={{ background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.5rem", padding:"0.4rem 0.9rem", fontFamily:"'DM Mono',monospace", fontSize:"0.71rem", fontWeight:600, cursor:"pointer" }}>
                    Quiero conectar →
                  </button>
                )}
                {conexion?.estado === "pendiente" && !soyReceptor && (
                  <span style={{ fontSize:"0.71rem", color:BRAND.muted, fontFamily:"'DM Mono',monospace" }}>Solicitud enviada</span>
                )}
                {conexion?.estado === "pendiente" && soyReceptor && (
                  <>
                    <button onClick={() => responder(conexion.id, "rechazada")} style={{ background:"none", border:"none", color:BRAND.muted, fontFamily:"'DM Mono',monospace", fontSize:"0.71rem", fontWeight:600, cursor:"pointer", padding:0 }}>Ignorar</button>
                    <button onClick={() => responder(conexion.id, "aceptada")} style={{ background:"none", border:"none", color:BRAND.cobalt, fontFamily:"'DM Mono',monospace", fontSize:"0.71rem", fontWeight:700, cursor:"pointer", padding:0 }}>Aceptar →</button>
                  </>
                )}
                {conexion?.estado === "aceptada" && (
                  <button onClick={() => contactar(v.whatsapp)} style={{ background:"none", border:"none", color:BRAND.cobalt, fontFamily:"'DM Mono',monospace", fontSize:"0.71rem", fontWeight:700, cursor:"pointer", padding:0 }}>
                    Contactar por WhatsApp →
                  </button>
                )}
                {conexion?.estado === "rechazada" && (
                  <span style={{ fontSize:"0.71rem", color:BRAND.mutedLight, fontFamily:"'DM Mono',monospace" }}>No conectaron</span>
                )}
              </div>
            </div>
          );
        })}

        {!esPremium && filtrados.length > 0 && (
          <div style={{ background:"#fff", border:`1.5px solid ${BRAND.boneDeep}`, borderRadius:"10px", padding:"1.25rem 1.1rem", textAlign:"center" }}>
            <p style={{ fontSize:"0.78rem", color:BRAND.night, fontWeight:600, margin:"0 0 0.3rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>¿Querés conocer alguno de estos saisonniers?</p>
            <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 0.75rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Con Premium podés mandarles una solicitud para conectar</p>
            <button onClick={onUpgrade} style={{ background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.5rem", padding:"0.6rem 1.5rem", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Activar — €5,99/mes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ESTADOS_APLICACION = [
  { v:"enviada", label:"Postulación enviada", color:BRAND.cobalt },
  { v:"respuesta", label:"Respuesta recibida", color:BRAND.warn },
  { v:"oferta", label:"Oferta recibida", color:BRAND.success },
  { v:"rechazada", label:"Rechazada", color:BRAND.muted },
];

function OfertasGuardadas({ perfil, esPremium, onUpgrade, onAbrirOferta, onSetEstadoAplicacion }) {
  const idsGuardados = perfil?.ofertas_guardadas || [];
  const estados = perfil?.estados_aplicacion || {};
  const [ofertasDB, setOfertasDB] = useState([]);
  useEffect(() => {
    const fetchGuardadas = async () => {
      const { data } = await supabase.from('ofertas').select('*').in('id', idsGuardados);
      if (data) setOfertasDB(data);
    };
    if (idsGuardados.length > 0) fetchGuardadas();
    else setOfertasDB([]);
  }, [JSON.stringify(idsGuardados)]);
  const guardadas = ofertasDB;

  if (!esPremium) {
    return (
      <div style={{ background:BRAND.warnBg, border:`1px solid ${BRAND.warnBorder}`, borderRadius:"1rem", padding:"1.25rem 1.3rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.6rem" }}>
          <div style={{ width:"34px", height:"34px", borderRadius:"0.6rem", background:BRAND.warnBorder+"44", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="star" size={17} color={BRAND.warn} /></div>
          <div>
            <h3 style={{ fontSize:"0.96rem", fontWeight:700, color:BRAND.night, margin:0, fontFamily:"'Bricolage Grotesque',sans-serif" }}>Ofertas Guardadas</h3>
            <p style={{ fontSize:"0.68rem", color:BRAND.warn, margin:0, fontWeight:600, fontFamily:"'Inter',sans-serif" }}>Requiere membresía Saison</p>
          </div>
        </div>
        <p style={{ fontSize:"0.77rem", color:BRAND.muted, lineHeight:1.6, margin:"0 0 0.875rem", fontFamily:"'Inter',sans-serif" }}>Guardá las ofertas que te interesan y encontralas todas juntas acá.</p>
        <button onClick={onUpgrade} style={S.btnCobalt}>Activar membresía — €5.99/mes</button>
      </div>
    );
  }

  return (
    <Section icon="star" title="Ofertas Guardadas" badge={`${guardadas.length}`}>
      {guardadas.length === 0 ? (
        <p style={{ fontSize:"0.77rem", color:BRAND.muted, lineHeight:1.6, margin:0, fontFamily:"'Inter',sans-serif" }}>Todavía no guardaste ninguna oferta. Tocá la estrella en cualquier oferta de la pestaña principal para guardarla acá.</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
          {guardadas.map(o=>{
            const estadoActual = estados[o.id];
            const infoEstado = ESTADOS_APLICACION.find(e=>e.v===estadoActual);
            return (
            <div key={o.id} style={{ background:"#fff", border:`1.5px solid ${infoEstado?infoEstado.color:BRAND.boneDeep}`, borderRadius:"10px", padding:"0.9rem 1rem" }}>
              <div onClick={()=>onAbrirOferta && onAbrirOferta(o)} style={{ cursor:"pointer" }}>
                <p style={{ fontSize:"0.86rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.15rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{o.titulo}</p>
                <p style={{ fontSize:"0.71rem", color:BRAND.muted, margin:0, fontFamily:"'Inter',sans-serif" }}>{o.localidad && `${o.localidad} · `}{o.region || "Francia"} · {o.contrato}</p>
                <p style={{ fontSize:"0.71rem", color:BRAND.cobalt, fontWeight:600, margin:"0.15rem 0 0", fontFamily:"'Inter',sans-serif" }}>{o.salario}</p>
              </div>
              <div style={{ marginTop:"0.65rem", display:"flex", alignItems:"center", gap:"7px" }}>
                {infoEstado && <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:infoEstado.color, flexShrink:0 }} />}
                <select
                  value={estadoActual||""}
                  onChange={e=>onSetEstadoAplicacion && onSetEstadoAplicacion(o.id, e.target.value)}
                  style={{ flex:1, border:`1.3px solid ${infoEstado?infoEstado.color:BRAND.boneDeep}`, borderRadius:"7px", padding:"0.4rem 0.6rem", fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", fontWeight:600, color:infoEstado?infoEstado.color:BRAND.muted, background:"#fff", cursor:"pointer", appearance:"none" }}
                >
                  <option value="">Sin aplicar todavía</option>
                  {ESTADOS_APLICACION.map(e=><option key={e.v} value={e.v}>{e.label}</option>)}
                </select>
              </div>
            </div>
          )})}
        </div>
      )}
    </Section>
  );
}

function ChecklistContrato() {
  const [checks, setChecks] = useState({});
  const toggle = id => setChecks(c=>({...c,[id]:!c[id]}));
  const hechos = Object.values(checks).filter(Boolean).length;
  return (
    <Section icon="filetext" title="Antes de firmar" badge={`${hechos}/${CONTRATO_ITEMS.length}`}>
      <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 0.875rem", lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>Verificá estos puntos antes de firmar cualquier contrato en Francia.</p>
      <div style={{ background:BRAND.boneDeep, borderRadius:"2rem", height:"4px", marginBottom:"0.875rem", overflow:"hidden" }}>
        <div style={{ height:"100%", background:hechos===CONTRATO_ITEMS.length?BRAND.success:BRAND.cobalt, borderRadius:"2rem", width:`${(hechos/CONTRATO_ITEMS.length)*100}%`, transition:"width 0.3s" }} />
      </div>
      {CONTRATO_ITEMS.map(item=>(
        <div key={item.id} onClick={()=>toggle(item.id)} style={{ borderRadius:"0.75rem", background:checks[item.id]?BRAND.boneDeep:item.tipo==="flag"?BRAND.warnBg:BRAND.bone, border:`1px solid ${checks[item.id]?BRAND.boneDeep:item.tipo==="flag"?BRAND.warnBorder:BRAND.boneDeep}`, padding:"0.7rem 0.875rem", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:"0.7rem", marginBottom:"0.45rem" }}>
          <div style={{ width:"18px", height:"18px", borderRadius:"5px", flexShrink:0, marginTop:"1px", background:checks[item.id]?BRAND.cobalt:"#fff", border:`2px solid ${checks[item.id]?BRAND.cobalt:BRAND.boneDeep}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
            {checks[item.id] && <Icon name="check" size={11} color="#fff" strokeWidth={2.5} />}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.35rem", marginBottom:"0.15rem" }}>
              {item.tipo==="flag" && <Icon name="warning" size={11} color={BRAND.warn} />}
              <p style={{ fontSize:"0.83rem", fontWeight:600, color:checks[item.id]?BRAND.muted:BRAND.night, margin:0, textDecoration:checks[item.id]?"line-through":"none", fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.t}</p>
            </div>
            <p style={{ fontSize:"0.7rem", color:BRAND.mutedLight, margin:0, lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.d}</p>
          </div>
        </div>
      ))}
    </Section>
  );
}

function DocumentosCierre() {
  const [checks, setChecks] = useState({});
  const toggle = id => setChecks(c=>({...c,[id]:!c[id]}));
  const hechos = Object.values(checks).filter(Boolean).length;
  return (
    <Section icon="folder" title="Al terminar tu temporada" badge={`${hechos}/${DOCS_CIERRE.length}`}>
      <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 0.875rem", lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>El empleador está obligado a entregarte estos 3 documentos. No te vayas sin ellos.</p>
      {DOCS_CIERRE.map(doc=>(
        <div key={doc.id} style={{ borderRadius:"0.875rem", border:`1.5px solid ${checks[doc.id]?BRAND.cobalt:BRAND.boneDeep}`, background:checks[doc.id]?BRAND.boneDeep:BRAND.bone, marginBottom:"0.6rem", overflow:"hidden", transition:"all 0.2s" }}>
          <div onClick={()=>toggle(doc.id)} style={{ display:"flex", alignItems:"center", gap:"0.7rem", padding:"0.875rem 1rem", cursor:"pointer" }}>
            <div style={{ width:"34px", height:"34px", borderRadius:"0.6rem", background:checks[doc.id]?BRAND.cobalt:BRAND.boneDeep, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.2s" }}>
              <Icon name={doc.icon} size={17} color={checks[doc.id]?"#fff":BRAND.cobalt} />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:"0.87rem", fontWeight:700, color:checks[doc.id]?BRAND.cobalt:BRAND.night, margin:"0 0 0.15rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{doc.titulo}</p>
              <p style={{ fontSize:"0.7rem", color:BRAND.muted, margin:0, lineHeight:1.4, fontFamily:"'Hanken Grotesk',sans-serif" }}>{doc.desc}</p>
            </div>
            <div style={{ width:"20px", height:"20px", borderRadius:"50%", border:`2px solid ${checks[doc.id]?BRAND.cobalt:BRAND.boneDeep}`, background:checks[doc.id]?BRAND.cobalt:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
              {checks[doc.id] && <Icon name="check" size={11} color="#fff" strokeWidth={2.5} />}
            </div>
          </div>
          <div style={{ padding:"0 1rem 0.875rem", borderTop:`1px solid ${BRAND.boneDeep}`, background:BRAND.boneDeep+"80" }}>
            <p style={{ fontSize:"0.7rem", color:BRAND.muted, margin:"0.45rem 0 0", lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}><span style={{ color:BRAND.cobalt, fontWeight:600 }}>Para qué sirve:</span> {doc.uso}</p>
          </div>
        </div>
      ))}
    </Section>
  );
}

function Checklist({ onToast, perfil, onToggleChecklist }) {
  const checks = perfil?.checklist_llegada || [];
  const toggle = id => onToggleChecklist && onToggleChecklist(id);
  const hechos = checks.length;
  return (
    <Section icon="checklist" title="Checklist de Llegada" badge={`${hechos}/${CL_ITEMS.length}`}>
      <div style={{ background:BRAND.boneDeep, borderRadius:"2rem", height:"4px", marginBottom:"1rem", overflow:"hidden" }}>
        <div style={{ height:"100%", background:hechos===CL_ITEMS.length?BRAND.success:BRAND.cobalt, borderRadius:"2rem", width:`${(hechos/CL_ITEMS.length)*100}%`, transition:"width 0.3s" }} />
      </div>
      {CL_ITEMS.map(item=>{
        const marcado = checks.includes(item.id);
        return (
        <div key={item.id} style={{ borderRadius:"0.75rem", background:marcado?BRAND.boneDeep:BRAND.bone, border:`1px solid ${marcado?BRAND.cobalt+"44":BRAND.boneDeep}`, marginBottom:"0.45rem", overflow:"hidden" }}>
          <div onClick={()=>toggle(item.id)} style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem", padding:"0.75rem 0.875rem", cursor:"pointer" }}>
            <div style={{ width:"18px", height:"18px", borderRadius:"5px", flexShrink:0, marginTop:"1px", background:marcado?BRAND.cobalt:"#fff", border:`2px solid ${marcado?BRAND.cobalt:BRAND.boneDeep}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
              {marcado && <Icon name="check" size={11} color="#fff" strokeWidth={2.5} />}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", flexWrap:"wrap", marginBottom:"0.15rem" }}>
                <p style={{ fontSize:"0.84rem", fontWeight:600, color:marcado?BRAND.muted:BRAND.night, margin:0, textDecoration:marcado?"line-through":"none", fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.t}</p>
                {item.badge && <span style={{ background:BRAND.boneDeep, color:BRAND.muted, fontSize:"0.56rem", fontWeight:700, padding:"0.1rem 0.4rem", borderRadius:"2rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.badge}</span>}
              </div>
              <p style={{ fontSize:"0.71rem", color:BRAND.mutedLight, margin:0, lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>{item.d}</p>
            </div>
          </div>
          {item.afiliado && AFILIADOS[item.afiliado] && (
            <div style={{ borderTop:`1px solid ${BRAND.boneDeep}`, padding:"0.5rem 0.875rem 0.6rem", background:BRAND.cobaltDim, display:"flex", alignItems:"center", gap:"0.4rem" }}>
              <span style={{ fontSize:"0.71rem", color:BRAND.cobalt, fontWeight:600, flex:1, fontFamily:"'Hanken Grotesk',sans-serif" }}>{AFILIADOS[item.afiliado].cta}</span>
              {AFILIADOS[item.afiliado].link ? (
                <button onClick={()=>window.open(AFILIADOS[item.afiliado].link,"_blank","noopener")} style={{ background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.4rem", padding:"0.25rem 0.65rem", fontSize:"0.68rem", fontWeight:700, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", display:"flex", alignItems:"center", gap:"0.3rem" }}>
                  <Icon name="externalLink" size={11} color="#fff" /> Ir
                </button>
              ) : (
                <button onClick={()=>{navigator.clipboard.writeText(AFILIADOS[item.afiliado].codigo); onToast("Código copiado: "+AFILIADOS[item.afiliado].codigo);}} style={{ background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.4rem", padding:"0.25rem 0.65rem", fontSize:"0.68rem", fontWeight:700, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif" }}>
                  Copiar código
                </button>
              )}
            </div>
          )}
          {item.cta && (
            <div style={{ borderTop:`1px solid ${BRAND.boneDeep}`, padding:"0.5rem 0.875rem 0.6rem", background:BRAND.cobaltDim, display:"flex", alignItems:"center", gap:"0.4rem" }}>
              <Icon name="info" size={12} color={BRAND.cobalt} />
              <span style={{ fontSize:"0.71rem", color:BRAND.cobalt, fontWeight:600, fontFamily:"'Hanken Grotesk',sans-serif" }}>¿Te interesa el curso de francés?</span>
              <button onClick={()=>onToast("¡Escribinos por WhatsApp!")} style={{ marginLeft:"auto", background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.4rem", padding:"0.25rem 0.65rem", fontSize:"0.68rem", fontWeight:700, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif" }}>Más info</button>
            </div>
          )}
        </div>
      )})}

      <div style={{ marginTop:"1rem", background:BRAND.boneDeep, borderRadius:"0.875rem", padding:"0.875rem 1rem" }}>
        <p style={{ fontSize:"0.68rem", fontWeight:700, color:BRAND.muted, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 0.5rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>¿Todavía sin trabajo confirmado?</p>
        {[AFILIADOS.workaway, AFILIADOS.alojamiento].map(af=>(
          <div key={af.nombre} style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.4rem" }}>
            <Icon name={af.icon} size={13} color={BRAND.muted} />
            <div style={{ flex:1 }}>
              <p style={{ fontSize:"0.76rem", fontWeight:600, color:BRAND.night, margin:"0 0 0.08rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>{af.nombre}</p>
              <p style={{ fontSize:"0.67rem", color:BRAND.muted, margin:0, fontFamily:"'Hanken Grotesk',sans-serif" }}>{af.desc}</p>
            </div>
            <button onClick={()=>window.open(af.link,"_blank","noopener")} style={{ background:BRAND.night, color:BRAND.bone, border:"none", borderRadius:"0.4rem", padding:"0.25rem 0.6rem", fontSize:"0.67rem", fontWeight:600, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", flexShrink:0 }}>Ver</button>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ================================================================
// ANTES DE PARTIR (afiliados contextuales)
// ================================================================
function AntesDepartir() {
  return (
    <Section icon="zap" title="Antes de partir">
      <p style={{ fontSize:"0.73rem", color:BRAND.muted, margin:"0 0 0.875rem", lineHeight:1.55, fontFamily:"'Hanken Grotesk',sans-serif" }}>Lo que necesitás resolver antes de subirte al avión.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
        {[AFILIADOS.esim, AFILIADOS.banco, AFILIADOS.seguro].map(af=>(
          <div key={af.nombre} style={{ borderRadius:"0.875rem", border:`1px solid ${BRAND.boneDeep}`, padding:"0.875rem 1rem", display:"flex", alignItems:"center", gap:"0.875rem" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"0.6rem", background:BRAND.boneDeep, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon name={af.icon} size={16} color={BRAND.cobalt} />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:"0.86rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.2rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>{af.nombre}</p>
              <p style={{ fontSize:"0.7rem", color:BRAND.muted, margin:0, lineHeight:1.4, fontFamily:"'Hanken Grotesk',sans-serif" }}>{af.desc}</p>
            </div>
           {af.link ? (
  <button onClick={()=>window.open(af.link,"_blank","noopener")} style={{ background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.6rem", padding:"0.4rem 0.75rem", fontSize:"0.72rem", fontWeight:600, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", flexShrink:0, whiteSpace:"nowrap" }}>{af.cta.split(" ").slice(0,2).join(" ")}</button>
) : (
  <button onClick={()=>{navigator.clipboard.writeText(af.codigo); alert("Código copiado: "+af.codigo);}} style={{ background:BRAND.cobalt, color:"#fff", border:"none", borderRadius:"0.6rem", padding:"0.4rem 0.75rem", fontSize:"0.72rem", fontWeight:600, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", flexShrink:0, whiteSpace:"nowrap" }}>Copiar código</button>
)}
          </div>
        ))}
      </div>
    </Section>
  );
}

const SECCIONES = [
  { id:"calculadora", label:"Calculadora", icon:"calculator", libre:true },
  { id:"cuando", label:"¿Cuándo aplicar?", icon:"calendar", libre:true },
  { id:"puestos", label:"Puestos", icon:"briefcase", libre:true },
  { id:"frances", label:"Francés", icon:"volume", libre:true },
  { id:"partir", label:"Antes de partir", icon:"zap", libre:true },
  { id:"guardadas", label:"Guardadas", icon:"star", libre:false },
  { id:"contrato", label:"Contrato", icon:"filetext", libre:false },
  { id:"cierre", label:"Al terminar", icon:"folder", libre:false },
  { id:"arribo", label:"Checklist", icon:"checklist", libre:false },
  { id:"descargas", label:"Guía + CV", icon:"download", libre:false },
];

const CV_TEMPLATES = [
  { id:"recepcion", titulo:"Recepcionista / Front Office", desc:"Optimizado para hoteles 4–5★. Incluye sección de idiomas y experiencia HCR.", emoji:"🏨", link:"https://www.canva.com/templates/placeholder-recepcion" },
  { id:"sala", titulo:"Servicio de sala / Restaurante", desc:"Para mesero, chef de rang y commis de salle. Énfasis en ritmo de trabajo y idiomas.", emoji:"🍽️", link:"https://www.canva.com/templates/placeholder-sala" },
  { id:"cocina", titulo:"Cocina / Commis / Plongeur", desc:"Para todos los niveles. Sin foto obligatoria. Funciona aunque no hables francés.", emoji:"👨‍🍳", link:"https://www.canva.com/templates/placeholder-cocina" },
  { id:"housekeeping", titulo:"Housekeeping / Femme de chambre", desc:"Diseño limpio. Destaca disponibilidad y experiencia en establecimientos HCR.", emoji:"🛏️", link:"https://www.canva.com/templates/placeholder-housekeeping" },
];

function RecursosDescargables() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
      {/* Guía */}
      <div style={{ background:"#fff", border:`1px solid ${BRAND.boneDeep}`, borderRadius:"0.125rem", overflow:"hidden" }}>
        <div style={{ background:BRAND.night, padding:"1.1rem 1.25rem", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:BRAND.cobalt }} />
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"0.75rem" }}>
            <div>
              <span style={{ fontSize:"0.58rem", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:BRAND.cobalt, fontFamily:"'DM Mono',monospace" }}>Guía Saison 2026</span>
              <h3 style={{ fontSize:"1.2rem", fontWeight:800, color:BRAND.bone, margin:"0.3rem 0 0.4rem", lineHeight:1.1, fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em" }}>Tu primera temporada en Francia</h3>
              <p style={{ fontSize:"0.76rem", color:BRAND.mutedLight, margin:0, lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>Toda la información que nos hubiera gustado tener antes de llegar. Lo que nadie te da junto en un solo lugar.</p>
            </div>
          </div>
        </div>
        <div style={{ padding:"1rem 1.25rem" }}>
          {["Cómo funciona el convenio HCR","Qué dice un contrato y qué no debe decir","Tus derechos desde el primer día","Cómo cobrar la indemnización de vacaciones","Documentos que debés pedir al salir"].map((item,i)=>(
            <div key={i} style={{ display:"flex", gap:"0.5rem", marginBottom:"0.35rem", alignItems:"flex-start" }}>
              <span style={{ flexShrink:0, marginTop:"3px" }}><Icon name="check" size={11} color={BRAND.cobalt} strokeWidth={2.5} /></span>
              <span style={{ fontSize:"0.78rem", color:BRAND.muted, lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>{item}</span>
            </div>
          ))}
          <button onClick={()=>window.open("https://drive.google.com/placeholder-guia","_blank","noopener")} style={{ ...S.btnCobalt, marginTop:"0.875rem" }}>
            <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}><Icon name="download" size={14} color="#fff" /> Descargar guía PDF</span>
          </button>
        </div>
      </div>

      {/* Templates CV */}
      <div>
        <p style={{ fontSize:"0.62rem", fontWeight:700, color:BRAND.muted, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 0.6rem", fontFamily:"'DM Mono',monospace" }}>04 — Templates de CV</p>
        <p style={{ fontSize:"0.76rem", color:BRAND.muted, lineHeight:1.55, margin:"0 0 0.875rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Abrís en Canva, completás tus datos y tenés un CV competitivo en 5 minutos. Sin saber de diseño.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {CV_TEMPLATES.map(cv=>(
            <div key={cv.id} style={{ background:"#fff", border:`1px solid ${BRAND.boneDeep}`, borderRadius:"0.125rem", padding:"0.875rem 1rem", display:"flex", alignItems:"center", gap:"0.875rem", transition:"border-color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=BRAND.cobalt+"44"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=BRAND.boneDeep}>
              <div style={{ width:"40px", height:"40px", borderRadius:"0.625rem", background:BRAND.cobaltDim, border:`1px solid ${BRAND.cobaltSoft}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"1.2rem" }}>{cv.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:"0.84rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.15rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>{cv.titulo}</p>
                <p style={{ fontSize:"0.68rem", color:BRAND.muted, margin:0, lineHeight:1.4, fontFamily:"'Hanken Grotesk',sans-serif" }}>{cv.desc}</p>
              </div>
              <button onClick={()=>window.open(cv.link,"_blank","noopener")} style={{ background:BRAND.night, color:BRAND.bone, border:"none", borderRadius:"0.375rem", padding:"0.45rem 0.875rem", fontSize:"0.68rem", fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", flexShrink:0, whiteSpace:"nowrap" }}>Abrir →</button>
            </div>
          ))}
        </div>
        <p style={{ fontSize:"0.65rem", color:BRAND.mutedLight, marginTop:"0.75rem", lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif", textAlign:"center" }}>Los templates se abren en Canva. Hacé una copia y editá con tus datos.</p>
      </div>
    </div>
  );
}


function TabHerramientas({ onToast, esPremium, usuario, onUpgrade, onAbrirOferta, onSetEstadoAplicacion, onToggleChecklist }) {
  const [seccion, setSeccion] = useState("calculadora");
  const sec = SECCIONES.find(s=>s.id===seccion);
  const bloqueada = !sec?.libre && !esPremium;
  return (
    <div style={{ background:BRAND.bone, minHeight:"100vh" }}>
      <div style={{ background:BRAND.night, padding:"1rem 1.4rem 0" }}>
        <h2 style={{ fontSize:"1.1rem", fontWeight:700, color:BRAND.bone, margin:"0 0 0.875rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.02em" }}>Recursos</h2>
        <div style={{ display:"flex", gap:"0.35rem", overflowX:"auto", paddingBottom:"0.875rem", scrollbarWidth:"none" }}>
          {SECCIONES.map(s=>{
            const activa = seccion===s.id;
            const bloq = !s.libre && !esPremium;
            return (
              <button key={s.id} onClick={()=>setSeccion(s.id)} style={{ display:"flex", alignItems:"center", gap:"0.3rem", background:activa?BRAND.bone:"transparent", color:activa?BRAND.night:BRAND.mutedLight, border:`1px solid ${activa?BRAND.bone:"rgba(255,255,255,0.12)"}`, borderRadius:"2rem", padding:"0.35rem 0.7rem 0.35rem 0.6rem", fontSize:"0.71rem", fontWeight:600, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s", opacity:bloq?0.6:1 }}>
                <Icon name={s.icon} size={11} color={activa?BRAND.cobalt:BRAND.mutedLight} strokeWidth={2} />
                {s.label}
                {bloq && <Icon name="lock" size={9} color={activa?BRAND.cobalt:"rgba(255,255,255,0.4)"} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding:"1rem 1.25rem 7rem" }}>
        {bloqueada ? (
          <div style={{ background:BRAND.bone, border:`1px solid ${BRAND.boneDeep}`, borderRadius:"1rem", padding:"2.5rem 1.5rem", textAlign:"center", boxShadow:"0 2px 12px rgba(11,20,38,0.06)" }}>
            <div style={{ width:"46px", height:"46px", borderRadius:"0.875rem", background:BRAND.night, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1rem" }}>
              <Icon name="lock" size={20} color={BRAND.cobalt} />
            </div>
            <h3 style={{ fontSize:"1.05rem", fontWeight:700, color:BRAND.night, margin:"0 0 0.5rem", fontFamily:"'Bricolage Grotesque',sans-serif" }}>Herramienta Saison</h3>
            <p style={{ fontSize:"0.81rem", color:BRAND.muted, lineHeight:1.65, margin:"0 0 1.25rem", maxWidth:"240px", marginLeft:"auto", marginRight:"auto", fontFamily:"'Hanken Grotesk',sans-serif" }}>Disponible con membresía. Acceso completo desde €5.99/mes.</p>
            <button onClick={onUpgrade} style={{ ...S.btnCobalt, maxWidth:"260px" }}>Activar membresía</button>
          </div>
        ) : (
          <>
            {seccion==="calculadora" && <Calculadora />}
            {seccion==="cuando" && <CuandoAplicar />}
            {seccion==="puestos" && <GuiaPuestos />}
            {seccion==="frances" && <FrasesSup />}
            {seccion==="partir" && <AntesDepartir />}
            {seccion==="guardadas" && <OfertasGuardadas perfil={usuario?.perfil} esPremium={esPremium} onUpgrade={onUpgrade} onAbrirOferta={onAbrirOferta} onSetEstadoAplicacion={onSetEstadoAplicacion} />}
            {seccion==="contrato" && <ChecklistContrato />}
            {seccion==="cierre" && <DocumentosCierre />}
            {seccion==="arribo" && <Checklist onToast={onToast} perfil={usuario?.perfil} onToggleChecklist={onToggleChecklist} />}
            {seccion==="descargas" && <RecursosDescargables />}
          </>
        )}
      </div>
    </div>
  );
}

// ================================================================
// TAB SERVICIOS
// ================================================================
function TabServicios() {
  return (
    <div style={{ background:BRAND.bone, minHeight:"100dvh", paddingBottom:"7rem" }}>
      {/* Header */}
      <div style={{ background:BRAND.night, padding:"1.75rem 1.5rem", borderBottom:`2px solid ${BRAND.cobalt}` }}>
        <SaisonLogo dark={false} size="md" />
        <h2 style={{ fontSize:"1.5rem", fontWeight:800, color:BRAND.bone, margin:"1rem 0 0.5rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.035em", lineHeight:1.05 }}>¿Querés más<br/>acompañamiento?</h2>
        <p style={{ fontSize:"0.82rem", color:"rgba(245,243,236,0.5)", margin:0, lineHeight:1.65, fontFamily:"'Hanken Grotesk',sans-serif" }}>Más allá de la plataforma, hay dos formas de ir más lejos.</p>
      </div>

      <div style={{ padding:"1.25rem 1.25rem 0" }}>

        {/* Asesoría */}
        <div style={{ background:"#fff", border:`1px solid ${BRAND.boneDeep}`, marginBottom:"0.75rem", overflow:"hidden" }}>
          <div style={{ padding:"1.25rem 1.25rem 0" }}>
            <p style={{ fontSize:"0.6rem", fontWeight:500, color:BRAND.cobalt, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 0.75rem", fontFamily:"'DM Mono',monospace" }}>Asesoría personal</p>
            <h3 style={{ fontSize:"1.2rem", fontWeight:800, color:BRAND.night, margin:"0 0 0.5rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em", lineHeight:1.1 }}>Asesoría Personalizada.</h3>
            <p style={{ fontSize:"0.8rem", color:BRAND.muted, lineHeight:1.65, margin:"0 0 1rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>Nuestro equipo tiene más de 4 años de temporadas en Francia, Suiza e Italia. Sabe exactamente qué buscan los empleadores y cómo posicionarte. Estrategia de búsqueda, revisión de perfil — todo lo que necesitás para llegar bien.</p>

            {/* Incluye Premium */}
            <div style={{ background:"rgba(10,58,242,0.05)", borderLeft:`2px solid ${BRAND.cobalt}`, padding:"0.7rem 0.875rem", marginBottom:"1rem" }}>
              <p style={{ fontSize:"0.75rem", color:BRAND.night, margin:0, fontFamily:"'Hanken Grotesk',sans-serif", lineHeight:1.5 }}>Incluye 1 mes de acceso a Saison Premium.</p>
            </div>

            {/* Precio */}
            <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem", marginBottom:"1.25rem" }}>
              <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:"2.5rem", color:BRAND.night, letterSpacing:"-0.04em", lineHeight:1 }}>€55</span>
              <span style={{ fontSize:"0.75rem", color:BRAND.muted, fontFamily:"'Hanken Grotesk',sans-serif" }}>la sesión · 45 minutos</span>
            </div>
          </div>
          <button onClick={()=>window.open("https://cal.com/saison-federico-alberti/asesoria-personalizada","_blank","noopener")} style={{ ...S.btnCobalt, borderRadius:0, marginTop:0 }}>Reservar asesoría →</button>
        </div>

        {/* Curso de francés */}
        <div style={{ background:BRAND.night, marginBottom:"1.5rem", overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:BRAND.cobalt }} />
          <div style={{ padding:"1.25rem 1.25rem 0" }}>
            <p style={{ fontSize:"0.6rem", fontWeight:500, color:BRAND.cobalt, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 0.75rem", fontFamily:"'DM Mono',monospace" }}>Curso de francés</p>
            <h3 style={{ fontSize:"1.2rem", fontWeight:800, color:BRAND.bone, margin:"0 0 0.5rem", fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.025em", lineHeight:1.1 }}>Mientras más hablés,<br/>mejor la vas a pasar.</h3>
            <p style={{ fontSize:"0.8rem", color:"rgba(245,243,236,0.5)", lineHeight:1.65, margin:"0 0 1rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>3 meses con una profesora nativa, orientado al mundo de la hospitalidad. 12 clases de 1 hora por semana por Google Meet. Grupos de máximo 8 alumnos — para que realmente aprendas.</p>

            {/* Precio */}
            <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem", marginBottom:"0.4rem" }}>
              <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:"2.5rem", color:BRAND.bone, letterSpacing:"-0.04em", lineHeight:1 }}>€96</span>
              <span style={{ fontSize:"0.75rem", color:"rgba(245,243,236,0.4)", fontFamily:"'Hanken Grotesk',sans-serif" }}>los 3 meses · 12 clases</span>
            </div>
            <p style={{ fontSize:"0.68rem", color:"rgba(245,243,236,0.3)", margin:"0 0 1.25rem", fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" }}>Máx. 8 alumnos · Google Meet · 1h/semana</p>
          </div>
          <button onClick={()=>onToast ? onToast("Muy pronto vas a poder inscribirte acá") : alert("Muy pronto vas a poder inscribirte acá")} style={{ ...S.btnCobalt, borderRadius:0, marginTop:0, opacity:0.6 }}>Muy pronto →</button>
        </div>

        {/* Redes */}
        <p style={{ fontSize:"0.6rem", fontWeight:500, color:BRAND.muted, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 0.75rem", fontFamily:"'DM Mono',monospace" }}>Seguinos</p>
        <div style={{ display:"flex", justifyContent:"center", gap:"0.75rem" }}>
          {[
            { label:"Instagram", icon:"instagram", url:"https://instagram.com/saisonfr" },
            { label:"Facebook", icon:"facebook", url:"https://facebook.com/saisonfr" },
            { label:"WhatsApp", icon:"whatsapp", url:"https://wa.me/saisonfr" },
          ].map(r=>(
            <button key={r.label} onClick={()=>window.open(r.url,"_blank","noopener")} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.35rem", background:"#fff", border:`1px solid ${BRAND.boneDeep}`, padding:"0.875rem 1rem", cursor:"pointer", minWidth:"72px" }}>
              <Icon name={r.icon} size={20} color={BRAND.cobalt} />
              <span style={{ fontSize:"0.6rem", fontWeight:500, color:BRAND.muted, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>{r.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

// ================================================================
// AUTH
// ================================================================
function PantallaAuth({ onLogin, onIniciarLogin }) {
  const [modo, setModo] = useState("registro");
  const [form, setForm] = useState({ nombre:"", email:"", password:"" });
  const [error, setError] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
const handleSubmit = async () => {
  if (modo==="registro"&&!form.nombre.trim()) { setError("Ingresá tu nombre"); return; }
  if (!form.email.includes("@")) { setError("Email inválido"); return; }
  if (form.password.length<6) { setError("Mínimo 6 caracteres"); return; }
  setError("");

  if (modo === "registro") {
  const { data, error } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: { data: { nombre: form.nombre } }
  });
  if (error) { setError(error.message); return; }
  
  const { data: perfilExistente } = await supabase.from('Perfiles').select('*').eq('email', form.email).single();
  
  if (!perfilExistente) {
    await supabase.from('Perfiles').insert({ 
      email: form.email, 
      nombre: form.nombre, 
      es_premium: false 
    });
  }
  
  onIniciarLogin && onIniciarLogin();
  onLogin({ nombre: form.nombre, email: form.email, esPremium: perfilExistente?.es_premium || false, id: data.user.id, perfil: { nombre: perfilExistente?.nombre || form.nombre, pais: perfilExistente?.pais, puesto: perfilExistente?.puesto, frances: perfilExistente?.frances, disponibilidad: perfilExistente?.disponibilidad, documentacion: perfilExistente?.documentacion, whatsapp: perfilExistente?.whatsapp, region_destino: perfilExistente?.region_destino, fecha_viaje: perfilExistente?.fecha_viaje, bio_viajero: perfilExistente?.bio_viajero, checklist_llegada: perfilExistente?.checklist_llegada || [], estados_aplicacion: perfilExistente?.estados_aplicacion || {}, ofertas_guardadas: perfilExistente?.ofertas_guardadas || [] } });
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });
    if (error) { setError("Email o contraseña incorrectos"); return; }
      const u = data.user;
  const { data: perfilLogin } = await supabase.from('Perfiles').select('*').eq('email', u.email).single();
console.log('perfil login:', perfilLogin);
onIniciarLogin && onIniciarLogin();
onLogin({ nombre: perfilLogin?.nombre || u.user_metadata?.nombre || u.email.split("@")[0], email: u.email, esPremium: perfilLogin?.es_premium || false, id: u.id, perfil: { nombre: perfilLogin?.nombre, pais: perfilLogin?.pais, puesto: perfilLogin?.puesto, frances: perfilLogin?.frances, disponibilidad: perfilLogin?.disponibilidad, documentacion: perfilLogin?.documentacion, whatsapp: perfilLogin?.whatsapp, region_destino: perfilLogin?.region_destino, fecha_viaje: perfilLogin?.fecha_viaje, bio_viajero: perfilLogin?.bio_viajero, checklist_llegada: perfilLogin?.checklist_llegada || [], estados_aplicacion: perfilLogin?.estados_aplicacion || {}, ofertas_guardadas: perfilLogin?.ofertas_guardadas || [] } });
  }
};
  return (
    <div style={{ minHeight:"100vh", background:BRAND.bone, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"2rem 1.75rem" }}>
      <div style={{ marginBottom:"2rem", textAlign:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", justifyContent:"center", marginBottom:"0.5rem" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="0" y="0" width="13" height="13" rx="2.5" fill="#0A3AF2"/>
            <rect x="15" y="0" width="13" height="13" rx="2.5" fill="#0A3AF2" opacity="0.55"/>
            <rect x="0" y="15" width="13" height="13" rx="2.5" fill="#0A3AF2" opacity="0.3"/>
            <rect x="15" y="15" width="13" height="13" rx="2.5" fill="#0A3AF2" opacity="0.12"/>
          </svg>
          <span style={{ fontSize:"1.4rem", fontWeight:800, color:BRAND.night, fontFamily:"'Bricolage Grotesque',sans-serif", letterSpacing:"-0.03em" }}>Saison</span>
        </div>
        <p style={{ fontSize:"0.84rem", color:BRAND.muted, margin:"0.5rem auto 0", lineHeight:1.65, maxWidth:"260px", fontFamily:"'Hanken Grotesk',sans-serif" }}>Trabajos de temporada en Francia, en español. Filtrá por alojamiento incluido y encontrá lo que buscás.</p>
      </div>
      {/* Stats bar */}
      <div style={{ width:"100%", maxWidth:"320px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1px", background:BRAND.boneDeep, border:`1px solid ${BRAND.boneDeep}`, borderRadius:"0.875rem", overflow:"hidden", marginBottom:"1.5rem" }}>
        {[
          { num:"+1.000", lbl:"Candidatos en comunidad" },
          { num:"+400.000", lbl:"Puestos de trabajo por año" },
          { num:"~€1.700", lbl:"Salario promedio neto/mes" },
          { num:"~€1.000", lbl:"Ahorro estimado con aloj." },
        ].map(({ num, lbl }) => (
          <div key={lbl} style={{ background:"#fff", padding:"0.875rem 1rem" }}>
            <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:"1.1rem", color:BRAND.cobalt, letterSpacing:"-0.03em", lineHeight:1 }}>{num}</div>
            <div style={{ fontSize:"0.6rem", color:BRAND.muted, marginTop:"0.3rem", lineHeight:1.4, fontFamily:"'Hanken Grotesk',sans-serif", textTransform:"uppercase", letterSpacing:"0.06em" }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", background:BRAND.boneDeep, border:`1px solid ${BRAND.boneDeep}`, borderRadius:"0.75rem", padding:"0.18rem", marginBottom:"1.35rem", width:"100%", maxWidth:"320px" }}>
        {[["registro","Crear cuenta"],["login","Iniciar sesión"]].map(([m,l])=>(
          <button key={m} onClick={()=>{setModo(m);setError("");}} style={{ flex:1, background:modo===m?BRAND.night:"transparent", border:"none", borderRadius:"0.6rem", padding:"0.52rem", fontSize:"0.79rem", fontWeight:600, color:modo===m?BRAND.bone:BRAND.muted, cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", transition:"all 0.18s" }}>{l}</button>
        ))}
      </div>
      <div style={{ width:"100%", maxWidth:"320px" }}>
        {modo==="registro" && (
          <div style={{ marginBottom:"0.875rem" }}>
            <label style={{ ...S.label }}>Nombre y Apellido</label>
            <input type="text" value={form.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="Ej: Valentina García" style={S.input} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
          </div>
        )}
        <div style={{ marginBottom:"0.875rem" }}>
          <label style={{ ...S.label }}>Correo electrónico</label>
          <input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="tu@email.com" style={S.input} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
        </div>
        <div style={{ marginBottom:"0.875rem" }}>
          <label style={{ ...S.label }}>Contraseña</label>
          <input type="password" value={form.password} onChange={e=>set("password",e.target.value)} placeholder={modo==="registro"?"Mínimo 6 caracteres":"Tu contraseña"} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={S.input} onFocus={e=>e.target.style.borderColor=BRAND.cobalt} onBlur={e=>e.target.style.borderColor=BRAND.boneDeep} />
        </div>
        {error && <p style={{ fontSize:"0.75rem", color:BRAND.red, margin:"0 0 0.65rem", fontFamily:"'Hanken Grotesk',sans-serif" }}>{error}</p>}
        <button onClick={handleSubmit} style={S.btnCobalt} onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"} onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"} onMouseEnter={e=>{e.currentTarget.style.opacity="0.9"}} onMouseLeave={e=>{e.currentTarget.style.opacity="1"}}>
          {modo==="registro"?"Crear cuenta gratis →":"Entrar →"}
        </button>
        {modo==="registro" && <p style={{ textAlign:"center", fontSize:"0.69rem", color:BRAND.muted, marginTop:"0.875rem", lineHeight:1.5, fontFamily:"'Hanken Grotesk',sans-serif" }}>Explorá las ofertas gratis. Para aplicar directamente, activá la membresía desde €5.99/mes.</p>}
      </div>
    </div>
  );
}

// ================================================================
// APP PRINCIPAL
// ================================================================
const TABS = [
  { id:"ofertas", icon:"search", label:"Ofertas" },
  { id:"herramientas", icon:"tools", label:"Recursos" },
  { id:"viajeros", icon:"globe", label:"Saisonniers" },
  { id:"premium", icon:"diamond", label:"Servicios" },
];

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [tab, setTab] = useState("ofertas");
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarMuroPago, setMostrarMuroPago] = useState(false);
  const timer = useRef(null);

  function toast(msg) {
    setToastMsg(msg); setToastOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(()=>setToastOn(false), 2800);
  }

  function handleLogin(u) {
    setUsuario(u);
    setTimeout(()=>setMostrarSplash(false), 500);
  }

  async function guardarPerfil(perfil) {
    // Calcular score automático
    let score = 0;
    
    // Documentación 25%
    if (perfil.documentacion) {
      const doc = perfil.documentacion.toLowerCase();
      if (doc.includes("europeo")) score += 25;
      else if (doc.includes("vvt aprobada")) score += 20;
      else if (doc.includes("vvt en tramite")) score += 10;
    }
    
    // Puesto 20%
    if (perfil.puesto) score += 20;
    
    // Experiencia — usamos disponibilidad como proxy 20%
    if (perfil.disponibilidad) {
      const d = perfil.disponibilidad.toLowerCase();
      if (d.includes("inmediata") || d.includes("flexible")) score += 20;
      else if (d.includes("2026")) score += 15;
      else score += 10;
    }
    
    // Francés 20%
    if (perfil.frances) {
      const f = perfil.frances.toLowerCase();
      if (f.includes("c1") || f.includes("c2") || f.includes("nativo")) score += 20;
      else if (f.includes("b2")) score += 18;
      else if (f.includes("b1")) score += 14;
      else if (f.includes("a2")) score += 10;
      else if (f.includes("a1")) score += 5;
    }
    
    // Flexibilidad de zona 15%
    if (perfil.pais) score += 15;

    const semaforo = score >= 85 ? "verde" : score >= 65 ? "amarillo" : "rojo";

    const { error } = await supabase.from('Perfiles').update({
      nombre: perfil.nombre,
      pais: perfil.pais,
      puesto: perfil.puesto,
      frances: perfil.frances,
      disponibilidad: perfil.disponibilidad,
      documentacion: perfil.documentacion,
      whatsapp: perfil.whatsapp,
      region_destino: perfil.region_destino,
      fecha_viaje: perfil.fecha_viaje,
      bio_viajero: perfil.bio_viajero,
      score,
      semaforo,
    }).eq('email', usuario.email);

    if (error) {
      alert("Error al guardar: " + error.message);
      return;
    }

    setUsuario(u=>({...u, perfil:{...u.perfil, ...perfil}}));
    setMostrarPerfil(false);
    toast("Perfil actualizado · matching activado");
  }

  const esPremium = usuario?.esPremium || false;
  const perfilObligatorioCompleto = !!(usuario?.perfil?.nombre && usuario?.perfil?.pais && usuario?.perfil?.puesto && usuario?.perfil?.documentacion && usuario?.perfil?.frances && usuario?.perfil?.disponibilidad && usuario?.perfil?.whatsapp);
  const [ofertaAbierta, setOfertaAbierta] = useState(null);
  const [mostrarSplash, setMostrarSplash] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);

  async function refrescarSolicitudes() {
    if (!usuario?.email) return;
    const { count } = await supabase
      .from('Conexiones')
      .select('*', { count: 'exact', head: true })
      .eq('email_receptor', usuario.email)
      .eq('estado', 'pendiente');
    setSolicitudesPendientes(count || 0);
  }

  useEffect(() => { refrescarSolicitudes(); }, [usuario?.email]);

  async function toggleOfertaGuardada(ofertaId) {
    const actuales = usuario?.perfil?.ofertas_guardadas || [];
    const yaEsta = actuales.includes(ofertaId);
    const nuevaLista = yaEsta ? actuales.filter(id=>id!==ofertaId) : [...actuales, ofertaId];
    await supabase.from('Perfiles').update({ ofertas_guardadas: nuevaLista }).eq('email', usuario.email);
    setUsuario(u=>({...u, perfil:{...u.perfil, ofertas_guardadas: nuevaLista}}));
  }

  async function setEstadoAplicacion(ofertaId, estado) {
    const actuales = usuario?.perfil?.estados_aplicacion || {};
    const nuevos = {...actuales, [ofertaId]: estado};
    await supabase.from('Perfiles').update({ estados_aplicacion: nuevos }).eq('email', usuario.email);
    setUsuario(u=>({...u, perfil:{...u.perfil, estados_aplicacion: nuevos}}));
  }
  async function toggleChecklistItem(itemId) {
    const actuales = usuario?.perfil?.checklist_llegada || [];
    const yaEsta = actuales.includes(itemId);
    const nuevaLista = yaEsta ? actuales.filter(id=>id!==itemId) : [...actuales, itemId];
    await supabase.from('Perfiles').update({ checklist_llegada: nuevaLista }).eq('email', usuario.email);
    setUsuario(u=>({...u, perfil:{...u.perfil, checklist_llegada: nuevaLista}}));
  }
  async function enviarSolicitud(emailReceptor) {
    const { error } = await supabase.from('Conexiones').insert({
      email_solicitante: usuario.email,
      email_receptor: emailReceptor,
      estado: 'pendiente',
    });
    return { error };
  }

  async function responderSolicitud(id, nuevoEstado) {
    await supabase.from('Conexiones').update({ estado: nuevoEstado }).eq('id', id);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Mono:wght@400;500&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
       body { margin:0; font-family:'Hanken Grotesk',sans-serif; background:${BRAND.bone}; -webkit-font-smoothing:antialiased; overflow-x:hidden; max-width:100vw; }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes slideDown { from{transform:translateY(0);opacity:1} to{transform:translateY(100%);opacity:0} }
@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes scaleIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        input::placeholder { color:${BRAND.mutedLight}; }
      `}</style>
      {mostrarSplash && <SplashScreen />}
      {!usuario ? (
        <PantallaAuth onLogin={handleLogin} onIniciarLogin={()=>setMostrarSplash(true)} />
      ) : !perfilObligatorioCompleto ? (
        <ModalPerfil perfil={usuario?.perfil||{}} onGuardar={guardarPerfil} onCerrar={()=>{}} forzado={true} />
      ) : (
        <div style={{ minHeight:"100vh", background:BRAND.bone }}>
         <div style={{ display:tab==="ofertas"?"block":"none" }}>
  <TabOfertas usuario={usuario} onToast={toast} esPremium={esPremium} onCompletarPerfil={()=>setMostrarPerfil(true)} onToggleGuardar={toggleOfertaGuardada} ofertaExterna={ofertaAbierta} onCerrarExterna={()=>setOfertaAbierta(null)} />
</div>
<div style={{ display:tab==="herramientas"?"block":"none" }}>
  <TabHerramientas onToast={toast} esPremium={esPremium} usuario={usuario} onUpgrade={()=>setMostrarMuroPago(true)} onAbrirOferta={(o)=>{setOfertaAbierta(o); setTab("ofertas");}} onSetEstadoAplicacion={setEstadoAplicacion} onToggleChecklist={toggleChecklistItem} />
</div>
<div style={{ display:tab==="viajeros"?"block":"none" }}>
  <TabViajeros esPremium={esPremium} onUpgrade={()=>setMostrarMuroPago(true)} usuario={usuario} onEnviarSolicitud={enviarSolicitud} onResponderSolicitud={responderSolicitud} onCambioSolicitudes={refrescarSolicitudes} onToast={toast} />
</div>
<div style={{ display:tab==="premium"?"block":"none" }}>
  <TabServicios />
</div>
          <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200, background:BRAND.night, borderTop:`1px solid ${BRAND.nightSoft}`, display:"flex", justifyContent:"center", padding:"0.6rem 1rem calc(1rem + env(safe-area-inset-bottom))", gap:"0.35rem" }}>
           {TABS.map(t=>{
              const active = tab===t.id;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{ flex:1, maxWidth:"110px", display:"flex", flexDirection:"column", alignItems:"center", gap:"0.25rem", background:active?BRAND.cobalt:"transparent", border:"none", borderRadius:"10px", padding:"0.6rem 0.4rem 0.5rem", cursor:"pointer", fontFamily:"'Hanken Grotesk',sans-serif", transition:"all 0.18s ease", position:"relative" }}
                  onMouseDown={e=>e.currentTarget.style.transform="scale(0.94)"}
                  onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
                  onTouchStart={e=>e.currentTarget.style.transform="scale(0.94)"}
                  onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
                  <div style={{ position:"relative" }}>
                    <Icon name={t.icon} size={19} color={active?"#fff":BRAND.mutedLight} />
                    {t.id === "viajeros" && solicitudesPendientes > 0 && (
                      <span style={{ position:"absolute", top:"-3px", right:"-5px", width:"8px", height:"8px", borderRadius:"50%", background:BRAND.red, border:`1.5px solid ${BRAND.night}` }} />
                    )}
                  </div>
                  <span style={{ fontSize:"0.65rem", fontWeight:600, color:active?"#fff":BRAND.mutedLight, letterSpacing:"0.01em" }}>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
      {mostrarPerfil && <ModalPerfil perfil={usuario?.perfil||{}} onGuardar={guardarPerfil} onCerrar={()=>setMostrarPerfil(false)} />}
      {mostrarMuroPago && <MuroPago onCerrar={()=>setMostrarMuroPago(false)} />}
      <Toast msg={toastMsg} visible={toastOn} />
    </>
  );
}
