import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMetaPixel } from "@/hooks/use-meta-pixel";

const STORAGE_KEY = "nr_mobile_dismissed";
const DISMISS_DAYS = 7;
const SCROLL_THRESHOLD = 0.50; // Show at 50% of article body scrolled

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
        // Only show on mobile/tablet widths (under 768px)
        if (window.innerWidth >= 768) return;
        // Don't show if already dismissed within 7 days
        if (isDismissed()) return;

        const articleBody = document.querySelector("article");
        if (!articleBody) return;

        const onScroll = () => {
            if (shown) return;
            const rect = articleBody.getBoundingClientRect();
            const articleHeight = articleBody.scrollHeight;
            const scrolledIntoArticle = -rect.top;
            // Fire at SCROLL_THRESHOLD of total article height
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
        if (dy > 40) dismiss(); // swipe down 40px+ to dismiss
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
    if (typeof window !== "undefined" && window.innerWidth >= 768) return null;
    // SSR guard — keep in DOM once shown so transition plays correctly
    if (!visible && !shown) return null;

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-[60] md:hidden transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            role="complementary"
            aria-label="Newsletter signup"
        >
            {/* Top accent line */}
            <div style={{ height: "3px", background: "linear-gradient(90deg, #06b6d4, #0891b2, #06b6d4)" }} />

            <div
                style={{
                    background: "#06b6d4", // cyan-500 — brand accent
                    padding: "16px 20px 20px",
                    boxShadow: "0 -8px 32px rgba(0,0,0,0.55)",
                    minHeight: "160px",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}
            >
                {subscribed ? (
                    /* ── Success state ── */
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", gap: "4px" }}>
                        <div style={{ fontSize: "28px" }}>✓</div>
                        <p style={{ color: "#0c4a6e", fontWeight: 700, fontSize: "17px", margin: 0 }}>You're in!</p>
                        <p style={{ color: "#0e4f6a", fontSize: "13px", margin: 0, opacity: 0.85 }}>
                            The Daily Radar hits your inbox tonight.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── Dismiss button — top-right, 44×44 tap target ── */}
                        <button
                            onClick={dismiss}
                            aria-label="Dismiss newsletter signup"
                            id="newsletter-slide-dismiss"
                            style={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                width: "44px",
                                height: "44px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#0c4a6e",
                                fontSize: "18px",
                                fontWeight: 700,
                                lineHeight: 1,
                                padding: 0,
                            }}
                        >
                            ✕
                        </button>

                        {/* ── Headline ── */}
                        <div style={{ paddingRight: "36px" }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: "19px",
                                    fontWeight: 800,
                                    color: "#0c0f0f",
                                    lineHeight: 1.2,
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                📨 The Daily Radar
                            </p>
                            <p
                                style={{
                                    margin: "4px 0 0",
                                    fontSize: "14px",
                                    fontWeight: 400,
                                    color: "#0c4a6e",
                                    opacity: 0.88,
                                    lineHeight: 1.3,
                                }}
                            >
                                1 email. Everything Phuket. 2 minute Read.
                            </p>
                        </div>

                        {/* ── Email input row ── */}
                        <form
                            onSubmit={handleSubmit}
                            style={{ display: "flex", gap: "8px", alignItems: "stretch" }}
                        >
                            <input
                                type="email"
                                id="newsletter-slide-email"
                                placeholder="enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                aria-label="Email address"
                                style={{
                                    flex: "1 1 0%",
                                    minWidth: 0,
                                    height: "44px",
                                    padding: "0 14px",
                                    borderRadius: "10px",
                                    border: "1.5px solid rgba(0,0,0,0.12)",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    fontSize: "15px",
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                            <button
                                type="submit"
                                id="newsletter-slide-submit"
                                disabled={isLoading}
                                style={{
                                    flexShrink: 0,
                                    height: "44px",
                                    padding: "0 20px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "#0c0f0f",
                                    color: "#ffffff",
                                    fontSize: "15px",
                                    fontWeight: 700,
                                    cursor: isLoading ? "not-allowed" : "pointer",
                                    opacity: isLoading ? 0.6 : 1,
                                    whiteSpace: "nowrap",
                                    boxSizing: "border-box",
                                }}
                            >
                                {isLoading ? "…" : "Go"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
