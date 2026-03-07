import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetaPixel } from "@/hooks/use-meta-pixel";

const STORAGE_KEY = "nr_exit_dismissed";
const DISMISS_DAYS = 14;
const SUBSCRIBED_KEY = "nr_subscribed";

function isDismissed(): boolean {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const ts = parseInt(raw, 10);
        const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
        return daysSince < DISMISS_DAYS;
    } catch {
        return false;
    }
}

function isSubscribed(): boolean {
    try {
        return localStorage.getItem(SUBSCRIBED_KEY) === "1";
    } catch {
        return false;
    }
}

function setDismissed() {
    try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch { }
}

function markSubscribed() {
    try {
        localStorage.setItem(SUBSCRIBED_KEY, "1");
    } catch { }
}

export function ExitIntentPopup() {
    const [open, setOpen] = useState(false);
    const [triggered, setTriggered] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    const { toast } = useToast();
    const { trackSubscribe } = useMetaPixel();

    const dismiss = useCallback(() => {
        setOpen(false);
        setDismissed();
    }, []);

    useEffect(() => {
        // Desktop only
        if (window.innerWidth < 1024) return;
        // Once per session, and respect dismiss + subscribe flags
        if (triggered) return;

        const onMouseOut = (e: MouseEvent) => {
            // Trigger when cursor leaves through the top edge (toward tab bar / back button)
            if (e.clientY <= 10 && !triggered) {
                if (isDismissed() || isSubscribed()) return;
                setTriggered(true);
                setOpen(true);
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && open) dismiss();
        };

        document.addEventListener("mouseleave", onMouseOut);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mouseleave", onMouseOut);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [triggered, open, dismiss]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === overlayRef.current) dismiss();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                trackSubscribe();
                markSubscribed();
                setSubscribed(true);
                setEmail("");
                setTimeout(() => setOpen(false), 3000);
            } else {
                const data = await response.json();
                toast({
                    title: "Subscription failed",
                    description: data.message || data.error || "Please try again",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-[100] hidden lg:flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Newsletter signup"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className={`relative z-10 w-full max-w-4xl mx-4 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl shadow-black/60
                    transition-all duration-300 ${open ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
                {/* Top glow accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Dismiss button */}
                <button
                    onClick={dismiss}
                    id="exit-popup-close"
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5 z-20"
                    aria-label="Close newsletter popup"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col md:flex-row">
                    {/* Preview image column */}
                    <div className="hidden md:flex w-72 lg:w-[350px] flex-shrink-0 bg-black/40 p-6 items-center border-r border-zinc-800/50">
                        <img
                            src="/newsletter-preview.gif"
                            alt="Preview of The Daily Radar newsletter"
                            className="w-full h-auto object-contain rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] opacity-95"
                            loading="lazy"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 md:p-10">
                        {subscribed ? (
                            <div className="text-center py-8">
                                <div className="text-5xl mb-4">✓</div>
                                <h2 className="text-2xl font-bold text-white mb-2">You're in!</h2>
                                <p className="text-zinc-400">The Daily Radar lands in your inbox tonight.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <p className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-2">Before you go —</p>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3">
                                        Get Phuket’s top stories in one quick daily email.
                                    </h2>
                                    <p className="text-zinc-300 text-base leading-relaxed">
                                        <span className="font-semibold text-white">The Daily Radar</span> lands in your inbox every evening.
                                        Today's news, zero filler. Takes 2 minutes to read.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-3 mb-4">
                                    <input
                                        type="email"
                                        id="exit-popup-email"
                                        placeholder="Your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 text-base transition"
                                        disabled={isLoading}
                                        aria-label="Email address for newsletter"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        id="exit-popup-submit"
                                        disabled={isLoading}
                                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:-translate-y-0.5"
                                    >
                                        {isLoading ? "Subscribing…" : "Send me the news"}
                                    </button>
                                </form>

                                <p className="text-center text-xs text-zinc-500 leading-relaxed">
                                    Free. Unsubscribe anytime.{" "}
                                    <span className="text-zinc-400">We don't spam — we barely have time to write the news.</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
