import { useState } from "react";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetaPixel } from "@/hooks/use-meta-pixel";

export function NewsletterSignup() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
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
                // Track Meta Pixel Subscribe event on successful subscription
                trackSubscribe();

                toast({
                    title: "Subscribed!",
                    description: "You've been added to our newsletter.",
                });
                setEmail("");
            } else {
                const data = await response.json();
                toast({
                    title: "Subscription failed",
                    description: data.message || "Please try again later",
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
            <div className="relative overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 md:p-12">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-200/50 dark:bg-zinc-800/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-zinc-300/30 dark:bg-zinc-700/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* Text Content */}
                    <div className="text-center lg:text-left flex-1">
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                            <Mail className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Newsletter</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
                            Be first to know what's happening in Phuket
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg">
                            1 daily email. Just what matters, straight to your inbox
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:flex-none lg:w-80">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-3.5 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 border border-zinc-300 dark:border-zinc-700 text-base"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg hover:shadow-xl"
                        >
                            {isLoading ? "Subscribing..." : "Subscribe"}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}
