import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";
import { JsonLd } from "./JsonLd";

interface BreadcrumbsProps {
    items: Array<{
        label: string;
        href: string;
    }>;
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    // Generate BreadcrumbList JSON-LD schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.label,
            "item": `https://phuketradar.com${item.href}`
        }))
    };

    return (
        <>
            <JsonLd data={breadcrumbSchema} />
            <nav aria-label="Breadcrumb" className="mb-6 hidden md:block">
                <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
                    {items.map((item, index) => (
                        <li key={item.href} className="flex items-center">
                            {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
                            {index === items.length - 1 ? (
                                <span className="text-foreground font-medium">{item.label}</span>
                            ) : (
                                <Link href={item.href}>
                                    <a className="hover:text-foreground transition-colors flex items-center">
                                        {index === 0 && <Home className="h-4 w-4 mr-1" />}
                                        {item.label}
                                    </a>
                                </Link>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </>
    );
}
