import { useState, useEffect, useRef } from "react";
import MoteurExecution from "@/screens/MoteurExecution";
import SeanceScreen from "@/screens/SeanceScreen";
import RechercheSeances from "@/pages/RechercheSeances";
import Programmes from "@/pages/Programmes";
import { genererEtapesDepuisStructure } from "@/utils/genererEtapes";
import ConnexionInscription from "./pages/ConnexionInscription";
import AuthSuccess from "./pages/AuthSuccess";
import Profil from "./pages/Profil";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Accueil from "./pages/Accueil";
import DynamicTitle from "./components/DynamicTitle";
import SeanceService from "./services/seanceService";
import AjouterExercice from "./pages/AjouterExercice";
import AdminExercices from "./pages/AdminExercices";
import CreerProgramme from "./pages/CreerProgramme";
import ProgrammeDetail from "./pages/ProgrammeDetail";
import ProgrammeSeancesGestion from "./pages/ProgrammeSeancesGestion";
import CreerSeance from "./pages/CreerSeance";
import SupprimerSeance from "./pages/SupprimerSeance";
import GererStructureSeance from "./pages/GererStructureSeance";

export default function App() {
  const [selectedStructure, setSelectedStructure] = useState([]);
  const [metaSeance, setMetaSeance] = useState(null);
  const [etapes, setEtapes] = useState([]);
  const [started, setStarted] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const wakeLockRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

	const location = useLocation();
  const estDansRoutine =
    started ||
    (selectedStructure.length > 0 && metaSeance) ||
    location.pathname !== "/" &&
    location.pathname !== "/login" &&
    location.pathname !== "/profil";

  useEffect(() => {
    if ('wakeLock' in navigator) {
      const requestWakeLock = async () => {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err) {
          console.warn("Wake lock error:", err);
        }
      };
      requestWakeLock();
      return () => {if (wakeLockRef.current) wakeLockRef.current.release();};
    }
  }, []);

  const handleLoadSeance = (structure, meta, exercices) => {
    setSelectedStructure(structure);
    setMetaSeance(meta);
	console.log("🔍 Structure =", JSON.stringify(exercices, null, 2));
    const etapesGenerees = genererEtapesDepuisStructure(structure, exercices);
	console.log("🔍 Etapes =", JSON.stringify(etapesGenerees, null, 2));
    setEtapes(etapesGenerees);
  };

  const resetToAccueil = () => {
    setSelectedStructure([]);
    setMetaSeance(null);
    setEtapes([]);
    setStarted(false);
    setCurrentSession(null);
    navigate('/');
  };

  const startRoutine = async (seance) => {
    if (seance) {
      try {
        // Récupérer les exercices de la séance
        const exercices = await SeanceService.getExercicesSeance(seance.id);
        console.log("🔍 Exercices récupérés:", exercices);
        
        // Utiliser les données de la base de données
        setSelectedStructure(seance.structure);
        setMetaSeance(seance);
        const etapesGenerees = genererEtapesDepuisStructure(seance.structure, exercices);
        console.log("🔍 Étapes générées:", etapesGenerees);
        setEtapes(etapesGenerees);
        setCurrentSession(seance);
      } catch (error) {
        console.error("Erreur lors du chargement des exercices:", error);
        // Fallback : utiliser la structure sans exercices détaillés
        setSelectedStructure(seance.structure);
        setMetaSeance(seance);
        const etapesGenerees = genererEtapesDepuisStructure(seance.structure, []);
        setEtapes(etapesGenerees);
        setCurrentSession(seance);
      }
    }
    setStarted(true);
  };

  const handleSeanceStart = (seance) => {
    startRoutine(seance);
  };

  const handleSeanceReturn = () => {
    resetToAccueil();
  };

  // Pendant l'exécution d'une séance, pas de navigation
  if (started && etapes.length > 0) {
    return (
      <>
        <DynamicTitle />
        <Layout showBottomNav={false}>
          <MoteurExecution 
            etapes={etapes} 
            onFinish={() => setStarted(false)} 
            resetToAccueil={resetToAccueil} 
            intervalRef={intervalRef}
            currentSession={currentSession}
          />
        </Layout>
      </>
    );
  }

  return (
    <>
      <DynamicTitle />
      <Layout>
        <Routes>
          <Route path="/profil" element={
            <PrivateRoute>
              <Profil />
            </PrivateRoute>
          } />
          <Route path="/auth-success" element={<AuthSuccess />} />
          <Route path="/login" element={<ConnexionInscription />} />
          <Route path="/" element={<Accueil />} />
          <Route path="/seance/:id" element={
            <SeanceScreen 
              onStart={handleSeanceStart} 
              onReturn={handleSeanceReturn}
            />
          } />
          <Route path="/seances/creer" element={<CreerSeance />} />
          <Route path="/recherche" element={<RechercheSeances />} />
          <Route path="/programmes" element={<Programmes />} />
          <Route path="/programmes/creer" element={<CreerProgramme />} />
          <Route path="/programmes/:id" element={<ProgrammeDetail />} />
          <Route path="/programmes/:id/seances" element={<ProgrammeSeancesGestion />} />
          <Route path="/ajouter-exercice" element={
            <PrivateRoute>
              <AjouterExercice />
            </PrivateRoute>
          } />
          <Route path="/admin-exercices" element={
            <PrivateRoute>
              <AdminExercices />
            </PrivateRoute>
          } />
          
          <Route path="/seances/:id/modifier" element={
            <PrivateRoute>
              <CreerSeance mode="edit" />
            </PrivateRoute>
          } />
          <Route path="/seances/:id/supprimer" element={
            <PrivateRoute>
              <SupprimerSeance />
            </PrivateRoute>
          } />
          <Route path="/seances/:id/exercices" element={
            <PrivateRoute>
              <GererStructureSeance />
            </PrivateRoute>
          } />
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Layout>
    </>
  );
}