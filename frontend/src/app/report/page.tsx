"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, MapPin, Calendar, FileImage, ChevronRight, ChevronLeft, Check, Camera, AlertTriangle, Users, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge } from "@/components/shared/StatusBadge";
import { categories, departments } from "@/data/mockData";
import { useRouter } from "next/navigation";

const steps = ["Photo Analysis", "Location", "Details", "Review & Submit"];

const ReportIssue = () => {
  const navigate = useRouter();
  const [step, setStep] = useState(0);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "", department: "", severity: "medium" as string,
    location: "", ongoing: true, startDate: "", additionalInfo: "",
  });

  const simulateUpload = () => {
    setPhotoUploaded(true);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
      setForm((f) => ({
        ...f,
        title: "Pothole on main road near intersection",
        description: "Large pothole approximately 1.5 feet wide detected on the roadway. Appears to be a structural road surface failure, likely caused by water erosion.",
        category: "Roads",
        department: "Roads & Transport",
        severity: "high",
      }));
    }, 2500);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto mt-12 text-center">
        <div className="glass-card-elevated p-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
            <div className="w-16 h-16 rounded-full bg-status-resolved/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-status-resolved" />
            </div>
          </motion.div>
          <h2 className="text-xl font-display font-bold text-foreground">Complaint Submitted!</h2>
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground">Ticket ID</p>
            <p className="text-lg font-mono font-bold text-foreground">PS-2025-00848</p>
          </div>
          <p className="text-sm text-muted-foreground mt-4">SMS confirmation sent to +91 98765 43210</p>
          <p className="text-sm text-muted-foreground mt-1">Estimated resolution: <span className="font-semibold text-foreground">2–3 days</span></p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => router.push("/tickets")}>View Tickets</Button>
            <Button className="flex-1 rounded-xl bg-primary text-primary-foreground" onClick={() => router.push("/dashboard")}>Dashboard</Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Report an Issue</h1>
        <p className="text-sm text-muted-foreground mt-1">Help improve your community</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
              i < step ? "bg-status-resolved text-primary-foreground" : i === step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${i < step ? "bg-status-resolved" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-foreground">{steps[step]}</p>

      <AnimatePresence mode="wait">
        {/* Step 0: Photo */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            {!photoUploaded ? (
              <div
                onClick={simulateUpload}
                className="glass-card p-12 text-center cursor-pointer hover:shadow-md transition-all border-2 border-dashed border-border hover:border-accent"
              >
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-semibold text-foreground">Drag & drop a photo or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Our AI will analyze it and pre-fill the form</p>
              </div>
            ) : analyzing ? (
              <div className="glass-card p-8 text-center">
                <div className="space-y-3">
                  {["Reading image", "Detecting issue", "Generating description", "Setting severity"].map((label, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.5 }}
                      className="flex items-center gap-3"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full"
                      />
                      <span className="text-sm text-muted-foreground">{label}...</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : analyzed ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-status-resolved/10 rounded-xl border border-status-resolved/20">
                  <Check className="w-4 h-4 text-status-resolved" />
                  <span className="text-sm font-medium text-foreground">AI analysis complete — fields auto-filled</span>
                  <AiBadge />
                </div>
                <div className="glass-card p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl min-h-[80px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm">
                        {categories.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Severity</label>
                      <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
            <button onClick={() => { setStep(1); if (!analyzed) { setForm({ ...form, title: "Untitled Issue" }); } }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Skip photo →
            </button>
          </motion.div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <div className="glass-card p-4">
              <Button variant="outline" className="w-full rounded-xl gap-2 h-11 mb-4" onClick={() => setForm({ ...form, location: "MG Road, Bandra West, Mumbai" })}>
                <MapPin className="w-4 h-4" />
                Use My Location
              </Button>
              {form.location && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-xl mb-3" />
                </motion.div>
              )}
              {/* Placeholder map */}
              <div className="w-full h-48 rounded-xl bg-secondary flex items-center justify-center border border-border">
                <div className="text-center">
                  <MapPin className="w-8 h-8 mx-auto text-accent mb-2" />
                  <p className="text-xs text-muted-foreground">Map View • Drag pin to adjust</p>
                </div>
              </div>
            </div>
            {/* Proximity alert */}
            <div className="glass-card p-4 border-l-4 border-l-accent">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">Proximity Alert</span>
                <AiBadge />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">4 citizens</span> near you reported this. Join their complaint to increase priority?
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 text-xs">Accept</Button>
                <Button size="sm" variant="outline" className="rounded-xl text-xs">Skip</Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-foreground">Type:</label>
                <div className="flex bg-secondary rounded-xl p-1 gap-0.5">
                  <button onClick={() => setForm({ ...form, ongoing: true })} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${form.ongoing ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                    Ongoing
                  </button>
                  <button onClick={() => setForm({ ...form, ongoing: false })} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${!form.ongoing ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                    One-time
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">When did it start?</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-xl" />
              </div>
              <div className="relative">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Additional Details</label>
                <Textarea
                  value={form.additionalInfo}
                  onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
                  placeholder="Describe the issue in more detail..."
                  className="rounded-xl min-h-[100px]"
                />
                {form.additionalInfo.length > 10 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span>AI suggests mentioning the time of day and how it affects daily commute</span>
                  </motion.div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Additional Media (up to 4)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-accent transition-colors flex items-center justify-center cursor-pointer">
                      <FileImage className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-semibold text-foreground">Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Title:</span> <span className="font-medium text-foreground">{form.title}</span></div>
                <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground">{form.category || "Roads"}</span></div>
                <div><span className="text-muted-foreground">Department:</span> <span className="font-medium text-foreground">{form.department || "Roads & Transport"}</span></div>
                <div><span className="text-muted-foreground">Severity:</span> <span className="font-medium text-foreground capitalize">{form.severity}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Location:</span> <span className="font-medium text-foreground">{form.location || "MG Road, Bandra West"}</span></div>
              </div>
              <p className="text-sm text-muted-foreground">{form.description}</p>
            </div>

            <div className="glass-card p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Estimated Resolution: 2–3 days</p>
                <p className="text-xs text-muted-foreground">Based on 31 similar cases in your area</p>
              </div>
              <AiBadge />
            </div>

            {form.severity === "high" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border-l-4 border-l-severity-high flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-severity-high shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Severity Validator</p>
                  <p className="text-xs text-muted-foreground">AI confirms: High severity is appropriate for this type of issue.</p>
                </div>
                <AiBadge />
              </motion.div>
            )}

            <Button onClick={handleSubmit} className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-sm">
              Submit Complaint
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {!submitted && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-xl gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} className="rounded-xl gap-1 bg-primary text-primary-foreground">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportIssue;

