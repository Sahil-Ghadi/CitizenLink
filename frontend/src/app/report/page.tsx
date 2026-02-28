"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, ChevronRight, ChevronLeft, Check, Camera,
  AlertTriangle, Sparkles, Clock, Loader2, CheckCircle2, X, Plus, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge } from "@/components/shared/StatusBadge";
import { categories, departments } from "@/data/mockData";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { getIdToken } from "@/lib/auth";

const LeafletMap = dynamic(() => import("@/components/shared/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-secondary flex items-center justify-center border border-border">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const STEPS = ["Photo Analysis", "Location", "Details", "Review & Submit"];

interface FormState {
  title: string;
  description: string;
  category: string;
  department: string;
  severity: string;
  location_address: string;
  latitude: number;
  longitude: number;
  ongoing: boolean;
  start_date: string;
  additional_info: string;
}

const DEFAULT_LAT = 19.076;
const DEFAULT_LNG = 72.8777;

export default function ReportIssuePage() {
  const router = useRouter();
  const { user } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraPhotoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
  const [extraPhotoPreviews, setExtraPhotoPreviews] = useState<string[]>([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [error, setError] = useState("");
  const [geolocating, setGeolocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  // ── Toast ─────────────────────────────────────────────────────────────────
  type Toast = { id: number; msg: string; type: "success" | "error" | "info" };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const showToast = useCallback((msg: string, type: Toast["type"] = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    category: "",
    department: "",
    severity: "medium",
    location_address: "",
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    ongoing: true,
    start_date: "",
    additional_info: "",
  });

  // Auto-detect GPS on mount (silently — no popup, just sets default)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const addr = await reverseGeocodeClient(latitude, longitude);
          setForm((f) => ({ ...f, latitude, longitude, location_address: addr }));
        },
        () => { } // Silently ignore if denied on mount
      );
    }
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    setError("");
    setAnalyzed(false);
    try {
      const idToken = await getIdToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${BACKEND_URL}/tickets/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setPhotoUrl(data.photo_url);
      setForm((f) => ({
        ...f,
        title: data.title,
        description: data.description,
        category: data.category,
        department: data.department,
        severity: data.severity,
      }));
      setAnalyzed(true);
      showToast("AI analysis complete — fields auto-filled ✨", "success");
    } catch {
      showToast("AI analysis failed. Please fill the form manually.", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFileSelect(file);
  };

  const handleLocationChange = useCallback((lat: number, lng: number, address: string) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng, location_address: address }));
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeolocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const addr = await reverseGeocodeClient(latitude, longitude);
        setForm((f) => ({ ...f, latitude, longitude, location_address: addr }));
        setGeolocating(false);
      },
      (err) => {
        setGeolocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location access denied. Please allow location in your browser settings and try again.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError("Location unavailable. Pin your location manually on the map.");
        } else {
          setGeoError("Timeout getting location. Pin your location manually on the map.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleExtraPhotoSelect = async (file: File) => {
    if (extraPhotoPreviews.length >= 4) return;
    setUploadingExtra(true);
    const localPreview = URL.createObjectURL(file);
    setExtraPhotoPreviews((prev) => [...prev, localPreview]);
    try {
      const idToken = await getIdToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${BACKEND_URL}/tickets/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setExtraPhotos((prev) => [...prev, url]);
    } catch {
      setExtraPhotoPreviews((prev) => prev.slice(0, -1));
    } finally {
      setUploadingExtra(false);
    }
  };

  const removeExtraPhoto = (i: number) => {
    setExtraPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setExtraPhotoPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      const idToken = await getIdToken();
      const res = await fetch(`${BACKEND_URL}/tickets/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          ...form,
          photo_urls: photoUrl ? [photoUrl, ...extraPhotos] : extraPhotos,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Submission failed");
      }
      const ticket = await res.json();
      setTicketId(ticket.id);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step progress ─────────────────────────────────────────────────────────
  const StepProgress = () => (
    <div className="flex items-center gap-2 mb-3">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${i < step ? "bg-status-resolved text-primary-foreground"
            : i === step ? "bg-accent text-accent-foreground"
              : "bg-secondary text-muted-foreground"
            }`}>
            {i < step ? <Check className="w-4 h-4" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${i < step ? "bg-status-resolved" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );

  // ── Submitted screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto mt-8 text-center">
        <div className="glass-card-elevated p-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
            <div className="w-20 h-20 rounded-full bg-status-resolved/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-status-resolved" />
            </div>
          </motion.div>
          <h2 className="text-2xl font-display font-bold text-foreground">Complaint Submitted!</h2>
          <p className="text-sm text-muted-foreground mt-2">Your issue is now in the system.</p>
          <div className="mt-5 p-4 bg-secondary rounded-2xl">
            <p className="text-xs text-muted-foreground">Ticket ID</p>
            <p className="text-xl font-mono font-bold text-foreground mt-1">{ticketId}</p>
          </div>
          <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl text-left space-y-1">
            <p className="text-xs font-semibold text-accent">What happens next?</p>
            <p className="text-xs text-muted-foreground">• AI routes your complaint to the right department</p>
            <p className="text-xs text-muted-foreground">• An agent will be assigned within 24 hours</p>
            <p className="text-xs text-muted-foreground">• You'll get SMS updates at every step</p>
          </div>
          <div className="flex gap-3 mt-8">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => router.push("/tickets")}>View My Tickets</Button>
            <Button className="flex-1 rounded-xl bg-primary text-primary-foreground" onClick={() => router.push("/dashboard")}>Dashboard</Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ── Toast portal ─────────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs border ${t.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300" :
                t.type === "error" ? "bg-red-950/90 border-red-500/30 text-red-300" :
                  "bg-card border-border text-foreground"
                }`}
            >
              {t.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> :
                t.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> :
                  <Zap className="w-4 h-4 shrink-0" />}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Report an Issue</h1>
        <p className="text-sm text-muted-foreground mt-1">Help improve your community</p>
      </div>

      <StepProgress />
      <p className="text-sm font-semibold text-foreground">{STEPS[step]}</p>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">{error}</div>
      )}

      <AnimatePresence mode="wait">

        {/* ── STEP 0: Photo Analysis ── */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

            {!photoFile ? (
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                className="glass-card p-12 text-center cursor-pointer hover:shadow-md transition-all border-2 border-dashed border-border hover:border-accent">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-semibold text-foreground">Drag & drop a photo or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Gemini AI will read it and pre-fill the form</p>
              </div>
            ) : analyzing ? (
              <div className="glass-card p-8">
                <div className="flex items-center gap-2 mb-4">
                  <AiBadge />
                  <span className="text-sm font-semibold text-foreground">Gemini is analysing your photo…</span>
                </div>
                <div className="space-y-3">
                  {["Reading image", "Detecting issue type", "Generating description", "Setting severity"].map((label, i) => (
                    <motion.div key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.6 }}
                      className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
                      <span className="text-sm text-muted-foreground">{label}…</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="glass-card p-4 space-y-4">
                  {photoPreview && <img src={photoPreview} alt="Uploaded" className="w-full max-h-48 object-cover rounded-xl" />}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Title <span className="text-destructive">*</span></label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" placeholder="Briefly describe the issue" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl min-h-[80px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground">
                        <option value="">Select…</option>
                        {categories.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Severity</label>
                      <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                        className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Skip → shows manual form inline */}
            {!photoFile && !skipped && (
              <button
                onClick={() => setSkipped(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip photo — fill manually →
              </button>
            )}

            {/* Manual form shown after skip */}
            {skipped && !photoFile && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issue Details</p>
                  <button onClick={() => setSkipped(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to photo</button>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title <span className="text-destructive">*</span></label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" placeholder="Briefly describe the issue" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl min-h-[80px]" placeholder="Provide more context…" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground">
                      <option value="">Select…</option>
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Severity</label>
                    <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                      className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── STEP 1: Location ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <Button variant="outline" className="w-full rounded-xl gap-2 h-11" disabled={geolocating} onClick={handleDetectLocation}>
                {geolocating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting location…</>
                  : <><MapPin className="w-4 h-4" /> Use My Current Location</>}
              </Button>

              {geoError && (
                <p className="text-xs text-destructive flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {geoError}
                </p>
              )}

              {form.location_address && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Input value={form.location_address} onChange={(e) => setForm({ ...form, location_address: e.target.value })}
                    className="rounded-xl" placeholder="Address" />
                </motion.div>
              )}

              <LeafletMap lat={form.latitude} lng={form.longitude} onLocationChange={handleLocationChange} />
              <p className="text-xs text-muted-foreground text-center">📍 Click on the map or drag the marker to pin the exact location</p>
            </div>

            <button
              onClick={() => { setError(""); setStep(2); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip location →
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              {!form.title && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Issue Title <span className="text-destructive">*</span></label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" placeholder="Short title for the issue" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground">
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-foreground">Type:</label>
                <div className="flex bg-secondary rounded-xl p-1 gap-0.5">
                  <button onClick={() => setForm({ ...form, ongoing: true })} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${form.ongoing ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>Ongoing</button>
                  <button onClick={() => setForm({ ...form, ongoing: false })} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${!form.ongoing ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>One-time</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">When did it start?</label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Additional Details</label>
                <Textarea value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
                  placeholder="Describe the issue in more detail…" className="rounded-xl min-h-[100px]" />
                {form.additional_info.length > 10 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-accent" />
                    Tip: mention duration for faster resolution
                  </motion.div>
                )}
              </div>

              {/* Additional Photos */}
              <input ref={extraPhotoInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleExtraPhotoSelect(f);
                  e.target.value = "";
                }} />
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Additional Photos (up to 4)</label>
                <div className="grid grid-cols-4 gap-2">
                  {extraPhotoPreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={src} className="w-full h-full object-cover rounded-xl border border-border" />
                      <button onClick={() => removeExtraPhoto(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                  {uploadingExtra && (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-accent flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    </div>
                  )}
                  {extraPhotoPreviews.length < 4 && !uploadingExtra && (
                    <button onClick={() => extraPhotoInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors flex items-center justify-center">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Summary</h3>
              {photoPreview && <img src={photoPreview} alt="Issue" className="w-full max-h-40 object-cover rounded-xl" />}
              {extraPhotoPreviews.length > 0 && (
                <div className="flex gap-2">
                  {extraPhotoPreviews.map((src, i) => <img key={i} src={src} className="w-16 h-16 object-cover rounded-lg" />)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Title: </span><span className="font-medium text-foreground">{form.title}</span></div>
                <div><span className="text-muted-foreground">Category: </span><span className="font-medium text-foreground">{form.category || "—"}</span></div>
                <div><span className="text-muted-foreground">Department: </span><span className="font-medium text-foreground">{form.department || "—"}</span></div>
                <div><span className="text-muted-foreground">Severity: </span>
                  <span className={`font-medium capitalize ${form.severity === "emergency" ? "text-red-400" : form.severity === "high" ? "text-orange-400" : form.severity === "medium" ? "text-yellow-400" : "text-green-400"}`}>
                    {form.severity}
                  </span>
                </div>
                <div className="col-span-2"><span className="text-muted-foreground">Location: </span>
                  <span className="font-medium text-foreground">{form.location_address || `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}</span></div>
              </div>
              {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
            </div>



            {(form.severity === "high" || form.severity === "emergency") && (
              <div className="glass-card p-4 border-l-4 border-l-red-500 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">High Severity Detected</p>
                  <p className="text-xs text-muted-foreground">Your complaint will be prioritised and escalated immediately.</p>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button onClick={handleSubmit} disabled={submitting || !form.title}
              className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-sm">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</> : "Submit Complaint"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav buttons ── */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-xl gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        {step < 3 && (
          <Button onClick={() => {
            if (step === 0 && !form.title) { setError("Please add a title before continuing."); return; }
            setError(""); setStep(step + 1);
          }} className="rounded-xl gap-1 bg-primary text-primary-foreground"
            disabled={step === 0 && skipped && !form.title.trim()}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

async function reverseGeocodeClient(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
