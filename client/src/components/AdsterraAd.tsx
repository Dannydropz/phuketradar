import { useEffect, useRef } from 'react';

export function AdsterraSocialBar() {
    useEffect(() => {
        // Only load once
        if (!document.querySelector('script[src*="5ba89c4327cf60362890b1201951dc77"]')) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://pl28793603.effectivegatecpm.com/5b/a8/9c/5ba89c4327cf60362890b1201951dc77.js';
            document.body.appendChild(script);
        }
    }, []);

    return null;
}

interface AdsterraNativeAdProps {
    className?: string;
}

export function AdsterraNativeAd({ className = '' }: AdsterraNativeAdProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Adsterra injects the ad into the element with ID 'container-...'.
        // In React, standard script tags might have trouble if loaded dynamically multiple times.
        // We add the script once.
        const scriptSrc = 'https://pl28781799.effectivegatecpm.com/45a7019ebda539b1279a113c5356e5d5/invoke.js';

        // Create a local script element to append next to the container (some ad networks expect inline scripts)
        const container = containerRef.current;
        if (container && !container.hasAttribute('data-ad-loaded')) {
            const script = document.createElement('script');
            script.async = true;
            script.setAttribute('data-cfasync', 'false');
            script.src = scriptSrc;

            // Some Adsterra scripts overwrite 'document.write' or look near their own script tag.
            container.appendChild(script);
            container.setAttribute('data-ad-loaded', 'true');
        }
    }, []);

    return (
        <div className={`adsterra-native-wrapper w-full flex justify-center text-center overflow-hidden ${className}`}>
            {/* We keep the inner div ID so Adsterra can find it if it uses getElementById */}
            <div id="container-45a7019ebda539b1279a113c5356e5d5" ref={containerRef}></div>
        </div>
    );
}
