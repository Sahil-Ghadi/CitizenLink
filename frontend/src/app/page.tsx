"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Shield, ArrowRight, CheckCircle, Zap, MapPin, Bell,
    FileText, Users, Star, ChevronRight, Sparkles, Clock, TrendingUp
} from "lucide-react";

const stats = [
    { value: "50K+", label: "Issues Resolved" },
    { value: "95%", label: "Satisfaction Rate" },
    { value: "2.3 Days", label: "Avg Resolution" },
    { value: "14", label: "Departments" },
];

const steps = [
    {
        num: "01",
        icon: FileText,
        title: "Report in 60 Seconds",
        desc: "Upload a photo — our AI reads it, fills the form, sets severity, and detects the right department automatically.",
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
        num: "02",
        icon: Zap,
        title: "AI Routes & Prioritises",
        desc: "Smart triage engine groups duplicates, escalates emergencies, and pushes your complaint to the right agent instantly.",
        color: "text-violet-400",
        bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
        num: "03",
        icon: CheckCircle,
        title: "Track & Get Resolved",
        desc: "Real-time status updates via SMS. Chat directly with the agent. Escalate if needed. Rate your experience.",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
    },
];

const features = [
    { icon: Sparkles, title: "Vision AI", desc: "Photo auto-fills entire complaint form", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { icon: MapPin, title: "Area Pulse", desc: "See top issues in your neighbourhood", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { icon: Clock, title: "ETA Predictor", desc: "AI estimates resolution time from 47 similar cases", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { icon: Bell, title: "SMS Updates", desc: "Get notified at every step without opening the app", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { icon: Users, title: "Group Complaints", desc: "Join others nearby to boost ticket priority", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
    { icon: TrendingUp, title: "Priority Scoring", desc: "AI ranks every ticket so urgent ones never get buried", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function LandingPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <Shield className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-bold text-foreground tracking-tight">CitizenPortal</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/login")}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => router.push("/login")}
                            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-20 px-6">
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="max-w-4xl mx-auto text-center"
                >
                    <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent mb-6">
                        <Sparkles className="w-3 h-3" />
                        AI-Powered Civic Issue Resolution
                    </motion.div>

                    <motion.h1 variants={item} className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight tracking-tight mb-6">
                        Report.{" "}
                        <span className="bg-gradient-to-r from-accent via-blue-400 to-violet-400 bg-clip-text text-transparent">
                            Track.
                        </span>{" "}
                        Resolve.
                    </motion.h1>

                    <motion.p variants={item} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                        The smartest way to report civic issues. Upload a photo, let AI handle the rest — your complaint reaches the right government department in seconds.
                    </motion.p>

                    <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => router.push("/login")}
                            className="group px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30 flex items-center gap-2"
                        >
                            Report an Issue
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => router.push("/login")}
                            className="px-8 py-4 border border-border text-foreground rounded-2xl font-semibold text-base hover:bg-secondary transition-all flex items-center gap-2"
                        >
                            <Shield className="w-4 h-4" />
                            Agent Login
                        </button>
                    </motion.div>
                </motion.div>
            </section>

            {/* Stats */}
            <section className="py-12 px-6 border-y border-border/40 bg-secondary/30">
                <motion.div
                    variants={container}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
                >
                    {stats.map((s) => (
                        <motion.div key={s.label} variants={item} className="text-center">
                            <p className="text-3xl font-display font-bold text-foreground">{s.value}</p>
                            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* How it works */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">How it works</h2>
                        <p className="text-muted-foreground text-lg">Three simple steps. AI handles the complex parts.</p>
                    </motion.div>

                    <motion.div
                        variants={container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {steps.map((step) => (
                            <motion.div
                                key={step.num}
                                variants={item}
                                className={`relative p-6 rounded-2xl border ${step.bg} hover:scale-105 transition-transform duration-300`}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.bg}`}>
                                        <step.icon className={`w-5 h-5 ${step.color}`} />
                                    </div>
                                    <span className={`text-2xl font-display font-bold ${step.color} opacity-40`}>{step.num}</span>
                                </div>
                                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* AI Features */}
            <section className="py-24 px-6 bg-secondary/20">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent mb-4">
                            <Sparkles className="w-3 h-3" />
                            21 AI Features
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Built on intelligence</h2>
                        <p className="text-muted-foreground text-lg max-w-xl mx-auto">Every part of the process is enhanced by AI — from the moment you upload a photo to the resolution quality check.</p>
                    </motion.div>

                    <motion.div
                        variants={container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {features.map((f) => (
                            <motion.div
                                key={f.title}
                                variants={item}
                                className={`p-5 rounded-2xl border ${f.bg} hover:scale-102 transition-all duration-300`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.bg} mb-3`}>
                                    <f.icon className={`w-5 h-5 ${f.color}`} />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <div className="p-10 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-violet-500/10 border border-primary/20">
                        <Star className="w-10 h-10 text-accent mx-auto mb-4" />
                        <h2 className="text-3xl font-display font-bold text-foreground mb-4">Your voice matters</h2>
                        <p className="text-muted-foreground mb-8">
                            Join thousands of citizens who have already improved their neighbourhoods. One photo is all it takes.
                        </p>
                        <button
                            onClick={() => router.push("/login")}
                            className="group px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30 inline-flex items-center gap-2"
                        >
                            Get Started — It's Free
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="py-10 px-6 border-t border-border/40">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                            <Shield className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-bold text-foreground">CitizenPortal</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        © 2025 CitizenPortal. Smart Government. Responsive Services.
                    </p>
                </div>
            </footer>
        </div>
    );
}
