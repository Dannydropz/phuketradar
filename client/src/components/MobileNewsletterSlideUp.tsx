import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetaPixel } from "@/hooks/use-meta-pixel";

const STORAGE_KEY = "nr_mobile_dismissed";
const DISMISS_DAYS = 7;
const SCROLL_THRESHOLD = 0.60; // Show at 60% of article body scrolled

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

function setDismissed() {
    try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch { }
}

export function MobileNewsletterSlideUp() {
    const [visible, setVisible] = useState(false);
    const [shown, setShown] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Touch swipe state
    const touchStartY = useRef<number | null>(null);

    const { toast } = useToast();
    const { trackSubscribe } = useMetaPixel();

    const dismiss = useCallback(() => {
        setVisible(false);
        setDismissed();
    }, []);

    useEffect(() => {
        // Only show on mobile-ish widths
        if (window.innerWidth >= 1024) return;
        // Don't show if already dismissed within 7 days
        if (isDismissed()) return;

        const articleBody = document.querySelector("article");
        if (!articleBody) return;

        const onScroll = () => {
            if (shown) return;
            const rect = articleBody.getBoundingClientRect();
            const articleHeight = articleBody.scrollHeight;
            const scrolledIntoArticle = -rect.top;
            const progress = scrolledIntoArticle / (articleHeight * SCROLL_THRESHOLD);

            if (progress >= 1) {
                setVisible(true);
                setShown(true);
                window.removeEventListener("scroll", onScroll);
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [shown]);

    // Handle touch swipe-down to dismiss
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current === null) return;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (dy > 40) dismiss(); // swipe down 40px+
        touchStartY.current = null;
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
                setSubscribed(true);
                setEmail("");
                // Auto dismiss after short confirmation
                setTimeout(() => {
                    setVisible(false);
                    setDismissed();
                }, 2500);
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

    // Don't render at all on desktop
    if (typeof window !== "undefined" && window.innerWidth >= 1024) return null;
    // SSR guard
    if (!visible && !shown) return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-[60] lg:hidden transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            role="complementary"
            aria-label="Newsletter signup"
        >
            {/* Shade bleed at top edge */}
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

            <div className="bg-[#0d0d0f] border-t border-zinc-800/80 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
                {subscribed ? (
                    <div className="flex items-center justify-center gap-2 py-1 text-center">
                        <span className="text-green-400 font-bold text-base">You're in ✓</span>
                        <span className="text-zinc-400 text-sm">The Daily Radar hits your inbox tonight.</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        {/* Icon + copy */}
                        <div className="flex-shrink-0 text-xl leading-none" aria-hidden="true">📨</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm leading-tight truncate">The Daily Radar</p>
                            <p className="text-zinc-400 text-xs leading-tight">Today's Phuket stories · 2-min read · Every evening</p>
                        </div>

                        {/* Inline form */}
                        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                                type="email"
                                id="newsletter-slide-email"
                                placeholder="email@..."
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-32 xs:w-40 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
                                disabled={isLoading}
                                aria-label="Email address"
                            />
                            <button
                                type="submit"
                                id="newsletter-slide-submit"
                                disabled={isLoading}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                            >
                                {isLoading ? "…" : "Go"}
                            </button>
                        </form>

                        {/* Dismiss */}
                        <button
                            onClick={dismiss}
                            className="flex-shrink-0 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg"
                            aria-label="Dismiss newsletter signup"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
