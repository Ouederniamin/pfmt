"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TestType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUploadThing } from "@/lib/uploadthing";
import {
  Upload,
  FileText,
  Sparkles,
  Trash2,
  Plus,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  ClipboardCheck,
  Video,
  Info,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
type SommaireEntry = { titre: string; page: number };
type OptionDraft = { id: string; texte: string; correct: boolean; justification: string };
type QuestionDraft = {
  ordre: number;
  enonce: string;
  contexte?: string;
  options: OptionDraft[];
};
type TestDraft = {
  id?: string;
  titre: string;
  type: TestType;
  dansLeCours: boolean;
  questions: QuestionDraft[];
};

type TestPlacement = "avant" | "apres";
type ChapitreInitial = {
  id?: string;
  numero: number;
  titre: string;
  description?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  sommaire?: SommaireEntry[] | null;
  videoUrl?: string | null;
  conclusion?: string | null;
  conclusionFileUrl?: string | null;
  conclusionFileName?: string | null;
  ficheResume?: string | null;
  ficheResumeFileUrl?: string | null;
  ficheResumeFileName?: string | null;
  rappelCoursFileUrl?: string | null;
  rappelCoursFileName?: string | null;
  tests: TestDraft[];
};

/* ─── Helpers ─── */
const emptyQuestion = (): QuestionDraft => ({
  ordre: 1,
  enonce: "",
  contexte: "",
  options: [
    { id: "a", texte: "", correct: false, justification: "" },
    { id: "b", texte: "", correct: false, justification: "" },
    { id: "c", texte: "", correct: false, justification: "" },
    { id: "d", texte: "", correct: false, justification: "" },
    { id: "e", texte: "", correct: false, justification: "" },
  ],
});

const TEST_TYPE_LABELS: Record<TestType, string> = {
  QCM: "QCM",
  CAS_CLINIQUE: "Cas clinique",
  VRAI_FAUX: "Vrai / Faux",
};

const STEPS = [
  { id: 1, label: "Document", icon: Upload },
  { id: 2, label: "Contenu", icon: BookOpen },
  { id: 3, label: "Tests", icon: ClipboardCheck },
  { id: 4, label: "Finaliser", icon: Eye },
] as const;

/* ─── Status banner ─── */
function StatusBanner({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error" | "loading";
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        type === "success" && "border-green-200 bg-green-50 text-green-800",
        type === "error" && "border-red-200 bg-red-50 text-red-800",
        type === "loading" && "border-primary/15 bg-primary/5 text-primary"
      )}
    >
      {type === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
      {type === "success" && <CheckCircle2 className="h-4 w-4" />}
      {type === "error" && <AlertCircle className="h-4 w-4" />}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN WIZARD FORM
   ═══════════════════════════════════════════════ */
export function AdminChapitreForm({ initial }: { initial?: ChapitreInitial }) {
  const [step, setStep] = useState(1);

  /* ─── Form state ─── */
  const [numero, setNumero] = useState(initial?.numero ?? 0);
  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? "");
  const [fileName, setFileName] = useState(initial?.fileName ?? "");
  const [sommaire, setSommaire] = useState<SommaireEntry[]>(initial?.sommaire ?? []);
  const [rawText, setRawText] = useState("");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [conclusion, setConclusion] = useState(initial?.conclusion ?? "");
  const [conclusionFileUrl, setConclusionFileUrl] = useState(initial?.conclusionFileUrl ?? "");
  const [conclusionFileName, setConclusionFileName] = useState(initial?.conclusionFileName ?? "");
  const [ficheResume, setFicheResume] = useState(initial?.ficheResume ?? "");
  const [ficheResumeFileUrl, setFicheResumeFileUrl] = useState(initial?.ficheResumeFileUrl ?? "");
  const [ficheResumeFileName, setFicheResumeFileName] = useState(initial?.ficheResumeFileName ?? "");
  const [rappelCoursFileUrl, setRappelCoursFileUrl] = useState(initial?.rappelCoursFileUrl ?? "");
  const [rappelCoursFileName, setRappelCoursFileName] = useState(initial?.rappelCoursFileName ?? "");
  const [tests, setTests] = useState<TestDraft[]>(initial?.tests?.length ? initial.tests : []);

  /* ─── UI state ─── */
  const [saving, setSaving] = useState(false);

  // Auto-fetch next numero for new chapitres
  useEffect(() => {
    if (!initial) {
      fetch("/api/chapitres")
        .then((r) => r.json())
        .then((chapitres: { numero: number }[]) => {
          const max = chapitres.reduce((m, c) => Math.max(m, c.numero), 0);
          setNumero(max + 1);
        })
        .catch(() => setNumero(1));
    }
  }, [initial]);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [testPlacement, setTestPlacement] = useState<TestPlacement>("apres");
  const [sectionUploading, setSectionUploading] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chapitreId = initial?.id;

  /* ─── UploadThing hooks ─── */
  const { startUpload } = useUploadThing("courseDocument");
  const { startUpload: startSectionUpload } = useUploadThing("sectionDocument");

  /* ─── Convert Word to PDF, then upload PDF to UploadThing ─── */
  const convertAndUploadSection = useCallback(
    async (
      file: File,
      label: string,
      setUrl: (u: string) => void,
      setName: (n: string) => void,
    ) => {
      setSectionUploading(label);
      setStatus({ type: "loading", message: `Traitement du fichier "${file.name}"...` });
      try {
        const isWord = /\.(docx?|doc)$/i.test(file.name);

        if (isWord) {
          // Upload Word to UploadThing first (bypasses Vercel body limit)
          setStatus({ type: "loading", message: `Upload de "${file.name}"...` });
          const tempRes = await startUpload([file]);
          const tempUrl = tempRes?.[0]?.ufsUrl;
          if (!tempUrl) throw new Error("Échec de l'upload.");

          // Convert + upload PDF server-side (returns URL directly, no blob roundtrip)
          setStatus({ type: "loading", message: `Conversion Word → PDF...` });
          const convertRes = await fetch("/api/convert-to-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: tempUrl, fileName: file.name }),
          });
          if (!convertRes.ok) throw new Error("Conversion Word → PDF échouée.");
          const data = await convertRes.json();
          setUrl(data.url);
          setName(data.name);
          setStatus({ type: "success", message: `"${data.name}" uploadé (${label}).` });
        } else {
          // PDF: upload directly
          setStatus({ type: "loading", message: `Upload du PDF...` });
          const uploadRes = await startSectionUpload([file]);
          if (uploadRes?.[0]) {
            setUrl(uploadRes[0].ufsUrl);
            setName(uploadRes[0].name);
            setStatus({ type: "success", message: `"${uploadRes[0].name}" uploadé (${label}).` });
          }
        }
      } catch (e: any) {
        setStatus({ type: "error", message: e.message || `Erreur upload ${label}.` });
      } finally {
        setSectionUploading(null);
      }
    },
    [startUpload, startSectionUpload]
  );

  /* Extracted text for AI */
  const extractedText = rawText;

  /* ─── Upload + Extract handler ─── */
  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploading(true);
      setStatus({ type: "loading", message: `Traitement de "${file.name}"...` });

      const isWord = /\.(docx?|doc)$/i.test(file.name);

      try {
        // 1) Upload original file to UploadThing (bypasses Vercel 4.5MB body limit)
        setStatus({ type: "loading", message: `Upload de "${file.name}"...` });
        const tempRes = await startUpload([file]);
        const tempUrl = tempRes?.[0]?.ufsUrl;
        if (!tempUrl) throw new Error("Échec de l'upload.");

        // 2) If Word, convert to PDF and upload the PDF as the stored file
        // For Word: run conversion + extraction IN PARALLEL (both use tempUrl)
        if (isWord) {
          setStatus({ type: "loading", message: `Conversion et extraction en cours...` });

          const [convertResult, extractResult] = await Promise.all([
            // A) Convert to PDF + upload server-side (returns URL directly)
            fetch("/api/convert-to-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: tempUrl, fileName: file.name }),
            }).then(async (r) => {
              if (!r.ok) throw new Error("Conversion Word → PDF échouée.");
              return r.json() as Promise<{ url: string; name: string }>;
            }),
            // B) Extract text + sommaire
            fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: tempUrl, fileName: file.name }),
            }).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.error || "Extraction échouée.");
              }
              return r.json();
            }),
          ]);

          setFileUrl(convertResult.url);
          setFileName(convertResult.name);
          setSommaire(extractResult.sommaire || []);
          setRawText(extractResult.rawText || "");
          const wordCount = (extractResult.rawText ?? "").split(/\s+/).filter(Boolean).length;
          setStatus({
            type: "success",
            message: `Contenu extrait (${wordCount} mots) · ${extractResult.sommaire?.length ?? 0} titres · ${extractResult.totalPages ?? 0} pages`,
          });
        } else {
          // PDF: the upload IS the final file — just extract text
          setFileUrl(tempUrl);
          setFileName(tempRes[0].name);

          setExtracting(true);
          setStatus({ type: "loading", message: `Extraction du contenu...` });
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: tempUrl, fileName: file.name }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Extraction échouée.");
          }
          const data = await res.json();
          setSommaire(data.sommaire || []);
          setRawText(data.rawText || "");
          const wordCount = (data.rawText ?? "").split(/\s+/).filter(Boolean).length;
          setStatus({
            type: "success",
            message: `Contenu extrait (${wordCount} mots) · ${data.sommaire?.length ?? 0} titres · ${data.totalPages ?? 0} pages`,
          });
        }
      } catch (e: any) {
        setStatus({ type: "error", message: e.message || "Erreur lors du traitement." });
      } finally {
        setUploading(false);
        setExtracting(false);
      }
    },
    [startUpload]
  );

  /* ─── AI test extraction from file ─── */
  const extractTestsFromFile = useCallback(
    async (file: File) => {
      setGenerating("file");
      setStatus({ type: "loading", message: `Upload de "${file.name}"...` });

      try {
        // 1) Upload to UploadThing first (bypasses Vercel body limit)
        const uploadRes = await startUpload([file]);
        const fileUrl = uploadRes?.[0]?.ufsUrl;
        if (!fileUrl) throw new Error("Échec de l'upload.");

        // 2) Extract text from URL
        setStatus({ type: "loading", message: `Extraction du texte...` });
        const extractRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fileUrl, fileName: file.name }),
        });
        if (!extractRes.ok) {
          const err = await extractRes.json().catch(() => ({}));
          throw new Error(err.error || "Extraction du texte échouée.");
        }
        const extractData = await extractRes.json();
        const text = extractData.rawText;

        if (!text?.trim()) {
          throw new Error("Aucun texte trouvé dans le fichier.");
        }

        // 3) Send to AI for auto-detection + structuring
        setStatus({ type: "loading", message: `Analyse IA en cours...` });
        const aiRes = await fetch("/api/ai/extract-qcm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseText: text }),
        });
        if (!aiRes.ok) throw new Error("Extraction IA échouée.");
        const aiData = await aiRes.json();

        const newTests: TestDraft[] = (aiData.tests || []).map((t: any) => ({
          titre: t.titre ?? "Test",
          type: t.type ?? "QCM",
          dansLeCours: testPlacement === "avant",
          questions: (t.questions || []).map((q: any, i: number) => ({
            ordre: q.ordre ?? i + 1,
            enonce: q.enonce ?? "",
            contexte: q.contexte ?? "",
            options: (q.options ?? []).map((o: any) => ({
              id: o.id ?? "",
              texte: o.texte ?? "",
              correct: !!o.correct,
              justification: o.justification ?? "",
            })),
          })),
        }));

        if (newTests.length === 0) {
          setStatus({ type: "error", message: "Aucun QCM trouvé dans le document." });
          return;
        }

        setTests((prev) => [...prev, ...newTests]);
        const totalQ = newTests.reduce((a, t) => a + t.questions.length, 0);
        setStatus({
          type: "success",
          message: `${newTests.length} test(s) extraits · ${totalQ} questions · Types : ${[...new Set(newTests.map(t => TEST_TYPE_LABELS[t.type]))].join(", ")}`,
        });
      } catch (e: any) {
        setStatus({ type: "error", message: e.message });
      } finally {
        setGenerating(null);
      }
    },
    [startUpload, testPlacement]
  );

  /* ─── Save ─── */
  const save = useCallback(async () => {
    if (!titre.trim()) {
      setStatus({ type: "error", message: "Le titre est requis." });
      return;
    }
    setSaving(true);
    setStatus({ type: "loading", message: "Enregistrement..." });
    try {
      const payload = {
        numero, titre, description, fileUrl, fileName, sommaire, videoUrl,
        conclusion, conclusionFileUrl, conclusionFileName,
        ficheResume, ficheResumeFileUrl, ficheResumeFileName,
        rappelCoursFileUrl, rappelCoursFileName,
        tests,
      };
      const res = await fetch(chapitreId ? `/api/chapitres/${chapitreId}` : "/api/chapitres", {
        method: chapitreId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erreur serveur");
      }
      setStatus({ type: "success", message: "Chapitre enregistré !" });
    } catch (e: any) {
      setStatus({ type: "error", message: e?.message || "Erreur lors de l'enregistrement." });
    } finally {
      setSaving(false);
    }
  }, [numero, titre, description, fileUrl, fileName, sommaire, videoUrl, conclusion, conclusionFileUrl, conclusionFileName, ficheResume, ficheResumeFileUrl, ficheResumeFileName, rappelCoursFileUrl, rappelCoursFileName, tests, chapitreId]);

  /* ─── Sommaire helpers ─── */
  const addSommaireEntry = () => setSommaire((prev) => [...prev, { titre: `Nouveau titre`, page: 1 }]);
  const removeSommaireEntry = (i: number) => setSommaire((prev) => prev.filter((_, idx) => idx !== i));
  const updateSommaireEntry = (i: number, patch: Partial<SommaireEntry>) => setSommaire((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  /* ─── Test helpers ─── */
  const updateTest = (i: number, patch: Partial<TestDraft>) => setTests((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeTest = (i: number) => setTests((prev) => prev.filter((_, idx) => idx !== i));
  const updateQuestion = (ti: number, qi: number, patch: Partial<QuestionDraft>) =>
    setTests((prev) => prev.map((t, i) => (i !== ti ? t : { ...t, questions: t.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) })));
  const updateOption = (ti: number, qi: number, oi: number, patch: Partial<OptionDraft>) =>
    setTests((prev) =>
      prev.map((t, i) => {
        if (i !== ti) return t;
        const questions = [...t.questions];
        const options = [...questions[qi].options];
        options[oi] = { ...options[oi], ...patch };
        questions[qi] = { ...questions[qi], options };
        return { ...t, questions };
      })
    );

  const canProceed = (s: number) => {
    if (s === 1) return !!titre.trim();
    if (s === 2) return !!fileUrl;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* ═══ STEPPER ═══ */}
      <div className="flex items-center gap-2 rounded-2xl border border-primary/8 bg-surface p-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => { if (done || s.id <= step) setStep(s.id); }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all w-full",
                  active && "bg-primary text-white shadow-sm",
                  done && "bg-green-50 text-green-700",
                  !active && !done && "text-text-muted hover:bg-muted-cream/50"
                )}
              >
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  active && "bg-white/20",
                  done && "bg-green-100",
                  !active && !done && "bg-primary/8"
                )}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-primary/20" />
              )}
            </div>
          );
        })}
      </div>

      {/* Status */}
      {status && (
        <StatusBanner
          type={status.type}
          message={status.message}
          onDismiss={status.type !== "loading" ? () => setStatus(null) : undefined}
        />
      )}

      {/* ═══════ STEP 1: DOCUMENT UPLOAD ═══════ */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-primary/8 bg-surface p-6 space-y-5">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
              <Info className="h-5 w-5 text-accent-gold" />
              Informations & Document
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Numéro</Label>
                <Input type="number" min={1} max={20} value={numero} onChange={(e) => setNumero(Number(e.target.value))} className="border-primary/15 focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Titre</Label>
                <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="ex: Cancer du sein" className="border-primary/15 focus:border-primary" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brève description..." rows={3} className="border-primary/15 focus:border-primary" />
            </div>

            <Separator className="bg-primary/8" />

            {/* Upload zone */}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 block">Document du cours</Label>
              {fileUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-800">{fileName || "Document uploadé"}</p>
                    <p className="text-xs text-green-600 truncate">{fileUrl}</p>
                  </div>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">
                    <Download className="h-3.5 w-3.5" /> Voir
                  </a>
                  <button onClick={() => { setFileUrl(""); setFileName(""); }} className="rounded p-1 text-green-600 hover:bg-green-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className={cn(
                  "relative rounded-xl border-2 border-dashed transition-all",
                  uploading || extracting ? "border-primary/30 bg-primary/5" : "border-primary/15 hover:border-primary/30 hover:bg-muted-cream/50"
                )}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".doc,.docx,.pdf"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                      e.target.value = "";
                    }}
                    disabled={uploading || extracting}
                  />
                  <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                    {uploading || extracting ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8">
                        <Upload className="h-7 w-7 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {uploading ? "Upload en cours..." : extracting ? "Extraction du contenu..." : "Glissez un fichier PDF ou Word"}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Le document sera stocké en ligne et le contenu extrait automatiquement
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {sommaire.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
                <FileText className="h-4 w-4" />
                <span className="font-medium">{sommaire.length} titres extraits pour le sommaire</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ STEP 2: CONTENT REVIEW ═══════ */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-primary/8 bg-surface p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
                <BookOpen className="h-5 w-5 text-accent-gold" />
                Sommaire du cours
                {sommaire.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/8 text-primary text-xs">{sommaire.length} titres</Badge>
                )}
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addSommaireEntry} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Ajouter titre
              </Button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Vérifiez les titres extraits du PDF. Ces titres serviront de table des matières pour la navigation des étudiants.
            </p>

            {sommaire.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-primary/10 py-10 text-center">
                <BookOpen className="h-8 w-8 text-primary/20" />
                <p className="text-sm text-text-muted">Aucun titre extrait. Retournez à l{"'"}étape 1 pour importer un fichier.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sommaire.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl border border-primary/8 bg-warm-cream/30 px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">{idx + 1}</span>
                    <input
                      value={entry.titre}
                      onChange={(e) => updateSommaireEntry(idx, { titre: e.target.value })}
                      className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-text-muted"
                      placeholder="Titre de la section"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">p.</label>
                      <input
                        type="number"
                        min={1}
                        value={entry.page}
                        onChange={(e) => updateSommaireEntry(idx, { page: Number(e.target.value) || 1 })}
                        className="w-14 rounded-md border border-primary/15 bg-surface px-2 py-1 text-center text-xs font-semibold text-primary"
                      />
                    </div>
                    <button type="button" onClick={() => removeSommaireEntry(idx)} className="rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Separator className="bg-primary/8" />

            {/* Video + Conclusion + Rappel de cours + Fiche */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Video className="h-4 w-4 text-accent-gold" />
                Média & Résumé
              </h3>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">URL Vidéo YouTube</Label>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="border-primary/15 focus:border-primary" />
              </div>

              {/* ── Conclusion ── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Conclusion</Label>
                <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Conclusion du chapitre..." rows={4} className="border-primary/15 focus:border-primary" />
              </div>
              <SectionFileUpload
                label="Conclusion"
                fileUrl={conclusionFileUrl}
                fileName={conclusionFileName}
                onUpload={(file) => convertAndUploadSection(file, "Conclusion", setConclusionFileUrl, setConclusionFileName)}
                onClear={() => { setConclusionFileUrl(""); setConclusionFileName(""); }}
                uploading={sectionUploading === "Conclusion"}
              />

              {/* ── Rappel de cours ── */}
              <Separator className="bg-primary/8" />
              <SectionFileUpload
                label="Rappel de cours"
                fileUrl={rappelCoursFileUrl}
                fileName={rappelCoursFileName}
                onUpload={(file) => convertAndUploadSection(file, "Rappel de cours", setRappelCoursFileUrl, setRappelCoursFileName)}
                onClear={() => { setRappelCoursFileUrl(""); setRappelCoursFileName(""); }}
                uploading={sectionUploading === "Rappel de cours"}
              />

              {/* ── Fiche résumé ── */}
              <Separator className="bg-primary/8" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Fiche résumé</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const pts = extractedText.split("\n").map((l) => l.trim()).filter((l) => l.length > 20).slice(0, 8);
                    setFicheResume(JSON.stringify(pts, null, 2));
                    setStatus({ type: "success", message: "Fiche générée." });
                  }} disabled={!extractedText.trim()} className="gap-1 text-xs h-7">
                    <Sparkles className="h-3 w-3" /> Générer
                  </Button>
                </div>
                <Textarea rows={6} value={ficheResume} onChange={(e) => setFicheResume(e.target.value)} placeholder='["Point 1", "Point 2"]' className="border-primary/15 font-mono text-xs focus:border-primary" />
              </div>
              <SectionFileUpload
                label="Résumé"
                fileUrl={ficheResumeFileUrl}
                fileName={ficheResumeFileName}
                onUpload={(file) => convertAndUploadSection(file, "Résumé", setFicheResumeFileUrl, setFicheResumeFileName)}
                onClear={() => { setFicheResumeFileUrl(""); setFicheResumeFileName(""); }}
                uploading={sectionUploading === "Résumé"}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ STEP 3: TESTS ═══════ */}
      {step === 3 && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-primary/8 bg-surface p-6 space-y-5">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
              <ClipboardCheck className="h-5 w-5 text-accent-gold" />
              Tests & QCM
              {tests.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary/8 text-primary text-xs">{tests.length} tests</Badge>
              )}
            </h2>

            {/* Placement selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Placement du test</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTestPlacement("avant")}
                  className={cn(
                    "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all",
                    testPlacement === "avant"
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-primary/10 text-text-muted hover:border-primary/25 hover:bg-muted-cream/50"
                  )}
                >
                  Avant le cours
                </button>
                <button
                  type="button"
                  onClick={() => setTestPlacement("apres")}
                  className={cn(
                    "flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all",
                    testPlacement === "apres"
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-primary/10 text-text-muted hover:border-primary/25 hover:bg-muted-cream/50"
                  )}
                >
                  Après le cours
                </button>
              </div>
            </div>

            {/* File upload zone for test document */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Document de test</Label>
              <div className={cn(
                "relative rounded-xl border-2 border-dashed transition-all",
                generating === "file"
                  ? "border-primary/30 bg-primary/5"
                  : "border-primary/15 hover:border-primary/30 hover:bg-muted-cream/50"
              )}>
                <input
                  type="file"
                  accept=".doc,.docx,.pdf"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) extractTestsFromFile(f);
                    e.target.value = "";
                  }}
                  disabled={generating === "file"}
                />
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  {generating === "file" ? (
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {generating === "file" ? "Extraction IA en cours..." : "Importez un fichier PDF ou Word contenant les QCM"}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      L{"'"}IA détecte automatiquement le type (QCM, Vrai/Faux, Cas clinique) et extrait toutes les questions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted tests list */}
            {tests.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-primary/10 py-10 text-center">
                <ClipboardCheck className="h-8 w-8 text-primary/20" />
                <p className="text-sm text-text-muted">Importez un document pour extraire les tests automatiquement.</p>
              </div>
            ) : (
              tests.map((test, testIdx) => (
                <TestEditor
                  key={testIdx}
                  test={test}
                  onUpdate={(patch) => updateTest(testIdx, patch)}
                  onRemove={() => removeTest(testIdx)}
                  onUpdateQuestion={(qIdx, patch) => updateQuestion(testIdx, qIdx, patch)}
                  onUpdateOption={(qIdx, optIdx, patch) => updateOption(testIdx, qIdx, optIdx, patch)}
                  onAddQuestion={() => setTests((prev) => prev.map((t, i) => i === testIdx ? { ...t, questions: [...t.questions, { ...emptyQuestion(), ordre: t.questions.length + 1 }] } : t))}
                  onRemoveQuestion={(qIdx) => setTests((prev) => prev.map((t, i) => i === testIdx ? { ...t, questions: t.questions.filter((_, qi) => qi !== qIdx).map((q, qi) => ({ ...q, ordre: qi + 1 })) } : t))}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══════ STEP 4: REVIEW & SAVE ═══════ */}
      {step === 4 && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-primary/8 bg-surface p-6 space-y-5">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
              <Eye className="h-5 w-5 text-accent-gold" />
              Récapitulatif
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewItem label="Titre" value={titre} />
              <ReviewItem label="Numéro" value={String(numero)} />
              <ReviewItem label="Description" value={description || "—"} />
              <ReviewItem label="Document" value={fileName || "Aucun"} />
              <ReviewItem label="Sommaire" value={`${sommaire.length} titres`} />
              <ReviewItem label="Tests" value={`${tests.length} tests · ${tests.reduce((a, t) => a + t.questions.length, 0)} questions`} />
              <ReviewItem label="Vidéo" value={videoUrl || "—"} />
              <ReviewItem label="Conclusion" value={conclusion ? "Oui" : "—"} />
              <ReviewItem label="Fichier conclusion" value={conclusionFileName || "—"} />
              <ReviewItem label="Rappel de cours" value={rappelCoursFileName || "—"} />
              <ReviewItem label="Fiche résumé" value={ficheResumeFileName || (ficheResume ? "Texte" : "—")} />
            </div>

            {/* Checklist */}
            <div className="rounded-xl border border-primary/8 bg-warm-cream/50 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Vérification</p>
              <CheckItem ok={!!titre.trim()} label="Titre renseigné" />
              <CheckItem ok={!!fileUrl} label="Document uploadé" />
              <CheckItem ok={sommaire.length > 0} label="Sommaire vérifié" />
              <CheckItem ok={tests.length > 0} label="Au moins un test" />
              <CheckItem ok={tests.every((t) => t.questions.length > 0)} label="Chaque test a des questions" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pb-8">
            <Button disabled={saving || !titre.trim()} onClick={save} className="gap-2 px-8 py-2.5 text-sm font-semibold shadow-md shadow-primary/20">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Enregistrement..." : "Enregistrer le chapitre"}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ NAVIGATION BUTTONS ═══ */}
      {step < 4 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={!canProceed(step)} className="gap-1.5">
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {step === 4 && (
        <div className="flex items-center justify-start">
          <Button variant="outline" onClick={() => setStep(3)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Review helpers ─── */
function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-primary/8 bg-warm-cream/30 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
      <span className={ok ? "text-green-800" : "text-amber-700"}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TEST EDITOR
   ═══════════════════════════════════════════════ */
function TestEditor({
  test, onUpdate, onRemove, onUpdateQuestion, onUpdateOption, onAddQuestion, onRemoveQuestion,
}: {
  test: TestDraft; onUpdate: (p: Partial<TestDraft>) => void; onRemove: () => void;
  onUpdateQuestion: (qi: number, p: Partial<QuestionDraft>) => void; onUpdateOption: (qi: number, oi: number, p: Partial<OptionDraft>) => void;
  onAddQuestion: () => void; onRemoveQuestion: (qi: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-xl border border-primary/8 bg-surface overflow-hidden">
      <div className="flex items-center gap-3 bg-gradient-to-r from-muted-cream to-warm-cream px-4 py-3">
        <Badge className={cn("text-[10px] font-bold uppercase", test.type === "QCM" && "bg-primary/15 text-primary", test.type === "VRAI_FAUX" && "bg-amber-100 text-amber-700", test.type === "CAS_CLINIQUE" && "bg-accent-rose/10 text-accent-rose")}>{TEST_TYPE_LABELS[test.type]}</Badge>
        <Badge variant="outline" className="text-[10px] font-medium">{test.dansLeCours ? "Avant le cours" : "Après le cours"}</Badge>
        <input value={test.titre} onChange={(e) => onUpdate({ titre: e.target.value })} className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none" placeholder="Titre" />
        <span className="text-xs text-text-muted">{test.questions.length} q.</span>
        <button type="button" onClick={() => setExpanded(!expanded)} className="rounded p-1 text-text-muted hover:bg-primary/8">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {expanded && (
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="gap-1 text-xs text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer le test
            </Button>
          </div>
          <Separator className="bg-primary/8" />
          {test.questions.map((q, qIdx) => (
            <QuestionEditor key={qIdx} question={q} questionIndex={qIdx} testType={test.type} onUpdate={(p) => onUpdateQuestion(qIdx, p)} onUpdateOption={(oi, p) => onUpdateOption(qIdx, oi, p)} onRemove={() => onRemoveQuestion(qIdx)} />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={onAddQuestion} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Ajouter une question
          </Button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   QUESTION EDITOR
   ═══════════════════════════════════════════════ */
function QuestionEditor({
  question, questionIndex, testType, onUpdate, onUpdateOption, onRemove,
}: {
  question: QuestionDraft; questionIndex: number; testType: TestType;
  onUpdate: (p: Partial<QuestionDraft>) => void; onUpdateOption: (oi: number, p: Partial<OptionDraft>) => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-primary/8 bg-warm-cream/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-accent-gold">Question {questionIndex + 1}</span>
        <button type="button" onClick={onRemove} className="rounded p-1 text-text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {testType === "CAS_CLINIQUE" && (
        <div className="space-y-1">
          <Label className="text-xs text-text-muted">Contexte clinique</Label>
          <Textarea rows={3} value={question.contexte || ""} onChange={(e) => onUpdate({ contexte: e.target.value })} className="border-primary/15 text-xs focus:border-primary" placeholder="Scénario patient..." />
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs text-text-muted">Énoncé</Label>
        <Textarea rows={2} value={question.enonce} onChange={(e) => onUpdate({ enonce: e.target.value })} className="border-primary/15 text-xs focus:border-primary" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-text-muted">Options <span className="text-text-muted/60">(cliquez pour marquer correcte)</span></Label>
        {question.options.map((opt, oi) => (
          <div key={opt.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onUpdateOption(oi, { correct: !opt.correct })} className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold transition-all", opt.correct ? "border-green-500 bg-green-500 text-white" : "border-primary/20 text-text-muted hover:border-primary/40")}>{opt.id.toUpperCase()}</button>
              <Input value={opt.texte} onChange={(e) => onUpdateOption(oi, { texte: e.target.value })} className="h-8 border-primary/15 text-xs focus:border-primary flex-1" placeholder={`Option ${opt.id.toUpperCase()}`} />
            </div>
            {opt.justification && (
              <div className={cn("ml-8 rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed", opt.correct ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")}>
                {opt.justification}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION FILE UPLOAD (conclusion, rappel, résumé)
   ═══════════════════════════════════════════════ */
function SectionFileUpload({
  label,
  fileUrl,
  fileName,
  onUpload,
  onClear,
  uploading,
}: {
  label: string;
  fileUrl: string;
  fileName: string;
  onUpload: (f: File) => void;
  onClear: () => void;
  uploading: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Fichier {label} <span className="font-normal text-text-muted/60">(Word ou PDF — optionnel)</span>
      </Label>

      {fileUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">{fileName || "Fichier uploadé"}</p>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-green-300 bg-white px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
          >
            <Download className="h-3 w-3" /> Voir
          </a>
          <button onClick={onClear} className="rounded p-1 text-green-600 hover:bg-green-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className={cn(
          "relative rounded-xl border-2 border-dashed transition-all",
          uploading ? "border-primary/30 bg-primary/5" : "border-primary/10 hover:border-primary/25 hover:bg-muted-cream/40"
        )}>
          <input
            type="file"
            accept=".doc,.docx,.pdf"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
            disabled={uploading}
          />
          <div className="flex items-center gap-3 px-4 py-4">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8 shrink-0">
                <Upload className="h-4.5 w-4.5 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {uploading ? "Conversion & upload en cours..." : `Ajouter un fichier ${label.toLowerCase()}`}
              </p>
              <p className="text-xs text-text-muted">
                PDF ou Word — les fichiers Word sont convertis en PDF automatiquement
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
