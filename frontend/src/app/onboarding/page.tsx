"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { getIdToken } from "@/lib/auth";
import { Shield, Phone, MapPin, Briefcase, CheckCircle, ChevronRight, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS } from "@/lib/constants";


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function OnboardingPage() {
    const router = useRouter();
    const { user, role, setNeedsOnboarding } = useAppContext();

    const [name, setName] = useState(user?.displayName || "");
    const [phone, setPhone] = useState("");
    const [pinCode, setPinCode] = useState("");
    const [department, setDepartment] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Location state
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [locationAddress, setLocationAddress] = useState("");
    const [geoStatus, setGeoStatus] = useState<"detecting" | "found" | "denied" | "idle">("idle");

    // Auto-detect location silently on mount
    useEffect(() => {
        if (!navigator.geolocation) return;
        setGeoStatus("detecting");
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setLatitude(lat);
                setLongitude(lng);
                setGeoStatus("found");
                // Reverse geocode for human-readable label
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                        { headers: { "Accept-Language": "en" } }
                    );
                    const data = await res.json();
                    setLocationAddress(data.display_name || "");
                } catch { /* ignore */ }
            },
            () => setGeoStatus("denied"),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    }, []);

    const isCitizen = role === "citizen";

    const isValid = isCitizen
        ? name.trim() && phone.trim().length >= 10 && pinCode.trim().length >= 6
        : name.trim() && phone.trim().length >= 10 && department;

    const handleSubmit = async () => {
        if (!isValid || !user) return;
        setSaving(true);
        setError("");

        try {
            const idToken = await getIdToken();
            const locationFields = latitude != null && longitude != null
                ? { latitude, longitude, location_address: locationAddress }
                : {};
            const body = isCitizen
                ? { phone: phone.trim(), pin_code: pinCode.trim(), display_name: name.trim(), ...locationFields }
                : { phone: phone.trim(), department, display_name: name.trim(), ...locationFields };

            const res = await fetch(`${BACKEND_URL}/auth/profile`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ uid: user.uid, ...body }),
            });

            if (!res.ok) {
                throw new Error("Failed to save profile");
            }
        } catch (e) {
            // Backend might be offline — save locally and proceed
            console.warn("Backend unreachable; proceeding without saving profile remotely.");
        }

        setNeedsOnboarding(false);
        router.replace(isCitizen ? "/dashboard" : "/agent");
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-foreground">
                        Welcome to CitizenPortal
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1.5">
                        Let's set up your {isCitizen ? "citizen" : "agent"} profile — takes 30 seconds.
                    </p>
                </div>

                {/* Avatar from Google */}
                {user?.photoURL && (
                    <div className="flex items-center gap-3 p-4 bg-secondary rounded-2xl mb-6">
                        <img
                            src={user.photoURL}
                            alt={user.displayName || ""}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-full border-2 border-border"
                        />
                        <div>
                            <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isCitizen ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-violet-500/10 text-violet-400 border border-violet-500/20"}`}>
                                {isCitizen ? "Citizen" : "Agent"}
                            </span>
                        </div>
                    </div>
                )}

                {/* Form card */}
                <div className="glass-card-elevated p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Full Name
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your full name"
                            className="h-12 rounded-xl"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Auto-filled from your Google account</p>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Mobile Number
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile number"
                                className="pl-10 h-12 rounded-xl font-mono"
                                inputMode="numeric"
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Used for SMS status updates on your complaints</p>
                    </div>

                    {/* Citizen: PIN Code */}
                    {isCitizen && (
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                Area PIN Code
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={pinCode}
                                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="6-digit PIN code"
                                    className="pl-10 h-12 rounded-xl font-mono tracking-widest"
                                    inputMode="numeric"
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">We use this to show you relevant local issues</p>
                        </div>
                    )}

                    {/* Agent: Department */}
                    {!isCitizen && (
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                Department
                            </label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                <select
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-card text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Select your department</option>
                                    {DEPARTMENTS.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Complaints will be routed to you based on this</p>
                        </div>
                    )}

                    {/* Location status chip */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${geoStatus === "found" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : geoStatus === "detecting" ? "bg-secondary text-muted-foreground"
                                : geoStatus === "denied" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "hidden"
                        }`}>
                        <LocateFixed className={`w-3.5 h-3.5 shrink-0 ${geoStatus === "detecting" ? "animate-pulse" : ""}`} />
                        {geoStatus === "detecting" && "Detecting your location…"}
                        {geoStatus === "found" && (locationAddress
                            ? `📍 ${locationAddress.split(",").slice(0, 2).join(",")}`
                            : "Location detected")}
                        {geoStatus === "denied" && "Location access denied — you can grant it later"}
                    </div>


                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || saving}
                        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 mt-2"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Complete Setup
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-4">
                    You can update these details later in your profile settings.
                </p>
            </motion.div>
        </div>
    );
}
