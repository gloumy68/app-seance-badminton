import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function App() {
  const [selectedPath, setSelectedPath] = useState(null);
  const [exercices, setExercices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [transition, setTransition] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [transitionLeft, setTransitionLeft] = useState(30);
  const transitionTime = 30;
  const synthRef = useRef(null);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const [availableSeances, setAvailableSeances] = useState({});
  const [selectedFolder, setSelectedFolder] = useState(null);

  useEffect(() => {
    const context = import.meta.glob("./seances/**/*.js");
    const entries = Object.entries(context);
    const grouped = {};
    for (const [path, loader] of entries) {
      const cleanPath = path.replace("./seances/", "").replace(".js", "");
      const [folder, name] = cleanPath.split("/");
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push({ name, path, loader });
    }
    setAvailableSeances(grouped);
  }, []);

  const loadSeance = async (path) => {
    setLoading(true);
    try {
      const file = availableSeances[selectedFolder].find(f => f.path === path);
      const module = await file.loader();
      setExercices(module.default);
      setSelectedPath(path);
      setLoading(false);
    } catch (err) {
      console.error("Erreur de chargement :", err);
      alert("Erreur : fichier non trouvé ou mal formaté");
      setLoading(false);
    }
  };

  const resetToAccueil = () => {
    setSelectedPath(null);
    setStarted(false);
    setStep(-1);
    setFinished(false);
    setExercices([]);
    setStartTime(null);
  };

  const startRoutine = () => {
    setStarted(true);
    setStartTime(Date.now());
    const first = 0;
    setStep(first);
    setTransition(true);
    speakIntro(exercices[first]);
  };

  const clearAllTimers = () => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    if (synthRef.current) synthRef.current.cancel();
  };

  const speak = (text) => {
    if (synthRef.current) synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synthRef.current = speechSynthesis;
    synthRef.current.speak(utterance);
  };

  const speakIntro = (exo) => {
    const intro = `Prochain exercice : ${exo.name}. ${exo.description} Position de départ : ${exo.position}.`;
    speak(intro);
  };

  useEffect(() => {
    if (!transition || !exercices.length) return;
    setTransitionLeft(transitionTime);
    intervalRef.current = setInterval(() => {
      setTransitionLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimeLeft(exercices[step].duration);
          setIsActive(true);
          setTransition(false);
          speak("Début de l'exercice. " + exercices[step].erreurs);
          return 0;
        }
        if (prev <= 4 && prev > 0) speak(`${prev - 1}`);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [transition]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    if (timeLeft === Math.floor(exercices[step].duration / 2)) speak("Moitié du temps");
    if (timeLeft <= 5 && timeLeft > 0) speak(`${timeLeft}`);
    if (timeLeft === 1) {
      setTimeout(() => {
        setIsActive(false);
        if (step + 1 >= exercices.length) {
          setFinished(true);
          speak("Bravo, c'est terminé !");
          return;
        }
        const next = step + 1;
        setStep(next);
        setTransition(true);
        speakIntro(exercices[next]);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [isActive, timeLeft]);

  const totalDuration = exercices.reduce((sum, e) => sum + e.duration + transitionTime, 0);
  const elapsedSteps = step >= 0 ? exercices.slice(0, step).reduce((sum, e) => sum + e.duration + transitionTime, 0) : 0;
  const globalProgress = Math.min((elapsedSteps / totalDuration) * 100, 100);

  const exo = exercices[step] || {};

  if (!selectedPath && !started) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardContent className="space-y-4">
            <h1 className="text-xl font-bold">Choisis une séance :</h1>
            {!selectedFolder ? (
              Object.keys(availableSeances).map((folder, idx) => (
                <Button key={idx} onClick={() => setSelectedFolder(folder)} className="w-full">
                  {folder}
                </Button>
              ))
            ) : (
              <>
                <Button onClick={() => setSelectedFolder(null)} className="mb-4">← Retour</Button>
                {availableSeances[selectedFolder].map((file, idx) => (
                  <Button key={idx} onClick={() => loadSeance(file.path)} className="w-full">
                    {file.name}
                  </Button>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedPath && !started && !loading && exercices.length > 0) {
    const minutes = Math.ceil(totalDuration / 60);
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card>
          <CardContent className="space-y-4">
            <Button onClick={resetToAccueil} className="mb-4">← Retour aux séances</Button>
            <h1 className="text-2xl font-bold text-blue-900">Séance sélectionnée</h1>
            <p><strong>Durée estimée :</strong> ~{minutes} min</p>
            <ul className="list-disc pl-5">
              {exercices.map((exo, idx) => (
                <li key={idx}><strong>{exo.name}</strong> ({exo.duration}s)</li>
              ))}
            </ul>
            <Button className="mt-4 w-full" onClick={startRoutine}>Démarrer la séance</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (finished) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card className="bg-green-50 shadow-xl">
          <CardContent className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-green-800">Séance terminée !</h1>
            <p>Bravo pour votre engagement. 🎉</p>
            <p>Temps total : {minutes} min {seconds} sec</p>
            <Button onClick={resetToAccueil}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card className="bg-blue-50 shadow-xl">
        <CardContent className="space-y-4">
          <h2 className="text-2xl font-bold text-blue-800">{exo.name}</h2>
          <Progress value={globalProgress} max={100} className="h-1 mb-2" />
          <p><strong>Description :</strong> {exo.description}</p>
          <p><strong>Position de départ :</strong> {exo.position}</p>
          <p><strong>Erreurs fréquentes :</strong> {exo.erreurs}</p>
          <p><strong>Temps restant :</strong> {timeLeft} sec</p>
          <Progress value={(exo.duration - timeLeft) * 100 / exo.duration} max={100} className="h-2 bg-blue-200" />
        </CardContent>
      </Card>
    </div>
  );
}
