import { useEffect, useRef, useState } from "react";
import { SiFacebook } from "react-icons/si";
import { ExternalLink, Play } from "lucide-react";

interface FacebookEmbedProps {
    url: string;
    sourceName?: string;
    className?: string;
}

/**
 * Facebook Video/Reel Embed Component
 * 
 * Uses Facebook's official embed SDK to display videos and reels.
 * Falls back to a clickable preview if the SDK fails to load.
 * 
 * Supports:
 * - /reel/ID URLs
 * - /videos/ID URLs  
 * - /posts/ID URLs (with video)
 * - /watch?v=ID URLs
 */
export function FacebookEmbed({ url, sourceName, className = "" }: FacebookEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    // Extract video/reel ID for fallback
    const videoId = url.match(/(?:reel|videos|watch\?v=|posts)\/(\d+)/)?.[1];

    useEffect(() => {
        // Load Facebook SDK if not already loaded
        const loadFacebookSDK = () => {
            if (window.FB) {
                // SDK already loaded, parse the embed
                window.FB.XFBML.parse(containerRef.current);
                setLoaded(true);
                return;
            }

            // Check if SDK script is already being loaded
            if (document.getElementById("facebook-jssdk")) {
                // Wait for it to load
                const checkFB = setInterval(() => {
                    if (window.FB) {
                        clearInterval(checkFB);
                        window.FB.XFBML.parse(containerRef.current);
                        setLoaded(true);
                    }
                }, 100);

                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkFB);
                    if (!window.FB) {
                        setError(true);
                    }
                }, 5000);
                return;
            }

            // Load the SDK
            const script = document.createElement("script");
            script.id = "facebook-jssdk";
            script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
            script.async = true;
            script.defer = true;
            script.crossOrigin = "anonymous";

            script.onload = () => {
                if (window.FB) {
                    window.FB.XFBML.parse(containerRef.current);
                    setLoaded(true);
                }
            };

            script.onerror = () => {
                setError(true);
            };

            document.body.appendChild(script);
        };

        loadFacebookSDK();

        // Cleanup timeout
        const timeout = setTimeout(() => {
            if (!loaded && !error) {
                setError(true);
            }
        }, 8000);

        return () => clearTimeout(timeout);
    }, [url, loaded, error]);

    // Fallback UI when embed fails
    if (error) {
        return (
            <div className={`rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 ${className}`}>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                >
                    <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col items-center justify-center gap-4 p-8">
                        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-10 h-10 text-white ml-1" />
                        </div>
                        <p className="text-zinc-400 text-center">
                            Watch video on Facebook
                        </p>
                        <div className="flex items-center gap-2 text-blue-400 group-hover:text-blue-300 transition-colors">
                            <SiFacebook className="w-5 h-5" />
                            <span className="text-sm">Open in Facebook</span>
                            <ExternalLink className="w-4 h-4" />
                        </div>
                    </div>
                </a>
                {/* Source Credit */}
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-3 border-t border-white/10">
                    <SiFacebook className="w-4 h-4 text-[#1877F2]" />
                    <span>
                        Video source:{" "}
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                        >
                            {sourceName || "Facebook"}
                        </a>
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Facebook Embed Container */}
            <div
                ref={containerRef}
                className="rounded-2xl overflow-hidden border border-white/10 bg-black"
            >
                <div
                    className="fb-video"
                    data-href={url}
                    data-width="auto"
                    data-show-text="false"
                    data-allowfullscreen="true"
                />

                {/* Loading state */}
                {!loaded && (
                    <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                    </div>
                )}
            </div>

            {/* Video Source Credit */}
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-2">
                <SiFacebook className="w-4 h-4 text-[#1877F2]" />
                <span>
                    Video source:{" "}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                    >
                        {sourceName || "Facebook"}
                    </a>
                </span>
            </div>
        </div>
    );
}

// TypeScript declaration for Facebook SDK
declare global {
    interface Window {
        FB?: {
            XFBML: {
                parse: (element?: Element | null) => void;
            };
        };
    }
}
