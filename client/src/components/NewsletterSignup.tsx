import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMetaPixel } from "@/hooks/use-meta-pixel";

export function NewsletterSignup() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const { toast } = useToast();
    const { trackSubscribe } = useMetaPixel();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast({
                title: "Email required",
                description: "Please enter your email address",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                trackSubscribe();
                setSubscribed(true);
                setEmail("");
            } else {
                const data = await response.json();
                toast({
                    title: "Subscription failed",
                    description: data.message || data.error || "Please try again later",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="my-12">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                {/* Background glow blobs */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-600/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-0">

                    {/* Preview image — left on desktop, top on mobile */}
                    <div className="w-full lg:w-auto lg:flex-shrink-0 overflow-hidden rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none">
                        <img
                            src="/newsletter-preview.gif"
                            alt="Preview of The Daily Radar newsletter"
                            className="w-full lg:w-72 xl:w-80 h-48 lg:h-full object-cover object-top opacity-90"
                            loading="lazy"
                        />
                    </div>

                    {/* Text + Form */}
                    <div className="flex-1 p-8 md:p-10">
                        {subscribed ? (
                            <div className="text-center py-4">
                                <div className="text-4xl mb-3">✓</div>
                                <h2 className="text-2xl font-bold text-white mb-2">You're in!</h2>
                                <p className="text-zinc-400">The Daily Radar lands in your inbox every evening.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-5">
                                    {/* Eyebrow label */}
                                    <span className="inline-block text-[10px] font-bold tracking-[0.15em] uppercase text-blue-400 mb-3 opacity-90">
                                        Daily Newsletter
                                    </span>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2">
                                        The Daily Radar
                                    </h2>
                                    <p className="text-base md:text-lg font-semibold text-zinc-200 mb-1">
                                        Today's Phuket news. No noise. No fluff. Just what happened.
                                    </p>
                                    <p className="text-sm text-zinc-400">
                                        Delivered every evening. Free.{" "}
                                        <span className="text-zinc-300 font-medium">Read in under 2 minutes.</span>
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="email"
                                        id="newsletter-inline-email"
                                        placeholder="Your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="flex-1 px-5 py-3.5 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 border border-zinc-700 text-base transition"
                                        disabled={isLoading}
                                        aria-label="Email address for newsletter"
                                    />
                                    <button
                                        type="submit"
                                        id="newsletter-inline-submit"
                                        disabled={isLoading}
                                        className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:-translate-y-0.5"
                                    >
                                        {isLoading ? "Subscribing…" : "Subscribe"}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
