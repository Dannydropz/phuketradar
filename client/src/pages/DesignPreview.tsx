import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Menu, Bell, ChevronRight, Clock, MapPin, Share2, Bookmark } from "lucide-react";
import { Link } from "wouter";

export default function DesignPreview() {
    const [activeTab, setActiveTab] = useState("all");

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
            {/* Navigation Bar - Glass Effect */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo Area */}
                        <div className="flex items-center gap-2">
                            <img src="/logo-white.png" alt="Phuket Radar" className="h-8 w-auto object-contain" />
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            {["News", "Business", "Tourism", "Events", "Crime"].map((item) => (
                                <a
                                    key={item}
                                    href="#"
                                    className="text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group"
                                >
                                    {item}
                                    <span className="absolute -bottom-5 left-0 w-full h-0.5 bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                                </a>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-zinc-400 hover:text-white transition-colors">
                                <Search className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#050505]" />
                            </button>
                            <button className="md:hidden p-2 text-zinc-400 hover:text-white">
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* Breaking News - Hero Section */}
                <section className="mb-16">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <h2 className="text-xs font-bold tracking-widest text-red-500 uppercase">Breaking News</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Main Hero Card */}
                        <div className="lg:col-span-8 group cursor-pointer">
                            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-4 border border-white/10 shadow-2xl shadow-blue-900/10">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
                                <img
                                    src="https://images.unsplash.com/photo-1589820296156-2454bb8a4d50?q=80&w=2674&auto=format&fit=crop"
                                    alt="Breaking News"
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                                    <div className="flex items-center gap-3 mb-3 text-sm text-blue-400 font-medium">
                                        <span className="bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 backdrop-blur-md">Crime</span>
                                        <span className="flex items-center gap-1 text-zinc-400"><Clock className="w-3 h-3" /> 10 mins ago</span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3 group-hover:text-blue-100 transition-colors">
                                        Major Drug Bust in Patong: Police Seize 50 Million Baht in Assets
                                    </h1>
                                    <p className="text-lg text-zinc-300 line-clamp-2 max-w-3xl">
                                        In a coordinated dawn raid, Phuket provincial police have dismantled a major distribution network operating out of a luxury villa in the hills above Patong.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Side Stories - Compact List */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="group cursor-pointer flex gap-4 items-start p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                        <img
                                            src={`https://images.unsplash.com/photo-15${i}5820296156-2454bb8a4d50?q=80&w=300&auto=format&fit=crop`}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                                            <span className="text-emerald-400">Tourism</span>
                                            <span>•</span>
                                            <span>2h ago</span>
                                        </div>
                                        <h3 className="text-base font-semibold text-zinc-100 leading-snug group-hover:text-blue-400 transition-colors">
                                            Phuket Airport Expects Record Arrivals for High Season Kickoff
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* The "Radar" Feed - Mixed Density */}
                <section>
                    <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                        <h2 className="text-2xl font-bold text-white">On the Radar</h2>
                        <div className="flex gap-4">
                            {["All", "Trending", "Local", "Weather"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase())}
                                    className={`text-sm font-medium transition-colors ${activeTab === tab.toLowerCase()
                                        ? "text-white"
                                        : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Standard Card */}
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="group bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300">
                                <div className="aspect-[3/2] overflow-hidden relative">
                                    <div className="absolute top-3 left-3 z-10">
                                        <span className="bg-black/60 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/10">
                                            Local
                                        </span>
                                    </div>
                                    <img
                                        src={`https://images.unsplash.com/photo-15${i + 10}820296156-2454bb8a4d50?q=80&w=800&auto=format&fit=crop`}
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Kamala Beach</span>
                                        <span>4h ago</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-zinc-100 mb-2 leading-snug group-hover:text-blue-400 transition-colors">
                                        Local Authorities Launch New Beach Safety Campaign Ahead of Monsoon Season
                                    </h3>
                                    <p className="text-sm text-zinc-400 line-clamp-2 mb-4">
                                        Officials gathered this morning to demonstrate new lifeguard equipment and warning flags...
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-800" />
                                            <span className="text-xs text-zinc-400">Reporter Name</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button className="text-zinc-500 hover:text-white transition-colors"><Share2 className="w-4 h-4" /></button>
                                            <button className="text-zinc-500 hover:text-white transition-colors"><Bookmark className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}
