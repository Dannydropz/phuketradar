import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, Eye, Share2, MessageCircle, ThumbsUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { format } from "date-fns";

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export default function AdminAnalytics() {
    const [, setLocation] = useLocation();

    const { data, isLoading } = useQuery({
        queryKey: ["/api/admin/analytics/dashboard"],
        refetchInterval: 60000, // Refresh every minute
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    const { topArticles, categoryStats, dailyStats } = data || { topArticles: [], categoryStats: [], dailyStats: [] };

    // Format daily stats for chart
    const formattedDailyStats = dailyStats.map((d: any) => ({
        date: format(new Date(d.metric_date), 'MMM dd'),
        views: parseInt(d.total_views),
        engagement: parseInt(d.total_fb_engagement)
    }));

    // Format category stats for pie chart
    const pieData = categoryStats.map((c: any) => ({
        name: c.category,
        value: parseInt(c.total_views)
    })).slice(0, 5); // Top 5 categories

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 relative overflow-hidden">
                {/* Premium Background Effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background pointer-events-none" />

                <div className="container mx-auto px-4 py-8 relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" onClick={() => setLocation("/admin")}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <TrendingUp className="w-8 h-8 text-purple-500" />
                                Analytics Dashboard
                            </h1>
                            <p className="text-muted-foreground">Real-time engagement and traffic insights</p>
                        </div>
                    </div>

                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Views (7 Days)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold flex items-center gap-2">
                                    <Eye className="w-6 h-6 text-blue-500" />
                                    {formattedDailyStats.reduce((acc: number, curr: any) => acc + curr.views, 0).toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Social Engagement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold flex items-center gap-2">
                                    <Users className="w-6 h-6 text-pink-500" />
                                    {formattedDailyStats.reduce((acc: number, curr: any) => acc + curr.engagement, 0).toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Top Performing Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold flex items-center gap-2">
                                    <TrendingUp className="w-6 h-6 text-green-500" />
                                    {categoryStats[0]?.category || 'N/A'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Daily Traffic Chart */}
                        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Traffic & Engagement Trend</CardTitle>
                                <CardDescription>Last 7 days performance</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formattedDailyStats}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="date" stroke="#888" />
                                        <YAxis yAxisId="left" stroke="#3b82f6" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#ec4899" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} name="Page Views" />
                                        <Line yAxisId="right" type="monotone" dataKey="engagement" stroke="#ec4899" strokeWidth={2} name="FB Engagement" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Category Distribution */}
                        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Views by Category</CardTitle>
                                <CardDescription>Top 5 categories distribution</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Articles Table */}
                    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Top Trending Articles</CardTitle>
                            <CardDescription>Ranked by Engagement Score</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10 text-left text-sm text-muted-foreground">
                                            <th className="pb-3 pl-2">Rank</th>
                                            <th className="pb-3">Article</th>
                                            <th className="pb-3 text-right">Score</th>
                                            <th className="pb-3 text-right">Views</th>
                                            <th className="pb-3 text-right">FB Reactions</th>
                                            <th className="pb-3 text-right">FB Comments</th>
                                            <th className="pb-3 text-right">FB Shares</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {topArticles.map((article: any, index: number) => (
                                            <tr key={article.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 pl-2 font-bold text-purple-400">#{index + 1}</td>
                                                <td className="py-4 pr-4">
                                                    <div className="font-medium line-clamp-1">{article.title}</div>
                                                    <div className="text-xs text-muted-foreground">{format(new Date(article.publishedAt), 'MMM dd, HH:mm')}</div>
                                                </td>
                                                <td className="py-4 text-right font-bold text-purple-400">
                                                    {article.engagementScore?.toFixed(1) || 0}
                                                </td>
                                                <td className="py-4 text-right text-muted-foreground">
                                                    {article.views?.toLocaleString() || 0}
                                                </td>
                                                <td className="py-4 text-right text-muted-foreground">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <ThumbsUp className="w-3 h-3" />
                                                        {article.fbReactions?.toLocaleString() || 0}
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right text-muted-foreground">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <MessageCircle className="w-3 h-3" />
                                                        {article.fbComments?.toLocaleString() || 0}
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right text-muted-foreground">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Share2 className="w-3 h-3" />
                                                        {article.fbShares?.toLocaleString() || 0}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </main>
            <Footer />
        </div>
    );
}
