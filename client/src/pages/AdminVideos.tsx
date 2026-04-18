import { useQuery, useMutation } from "@tanstack/react-query";
import { DiscoveredVideo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check, X, Play, Heart, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminVideos() {
  console.log("AdminVideos component loading...");
  const { toast } = useToast();

  const { data: videos, isLoading } = useQuery<DiscoveredVideo[]>({
    queryKey: ["/api/admin/discovered-videos"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/admin/discovered-videos/${id}/approve`);
    },
    onSuccess: (_, id) => {
      // Optimistic update - remove from list
      queryClient.setQueryData<DiscoveredVideo[]>(["/api/admin/discovered-videos"], (old) => 
        old ? old.filter(v => v.id !== id) : []
      );
      toast({ title: "Video approved", description: "Video marked as approved." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/admin/discovered-videos/${id}/reject`);
    },
    onSuccess: (_, id) => {
      // Optimistic update - remove from list
      queryClient.setQueryData<DiscoveredVideo[]>(["/api/admin/discovered-videos"], (old) => 
        old ? old.filter(v => v.id !== id) : []
      );
      toast({ title: "Video rejected", description: "Video marked as rejected." });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050505]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="container mx-auto py-12 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Video Review</h1>
            <p className="text-slate-400">Assess TikTok discoveries from the n8n pipeline</p>
          </div>
          <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 shadow-xl">
            <span className="font-black text-2xl text-blue-500 mr-2">{videos?.length || 0}</span>
            <span className="text-slate-400 font-medium uppercase tracking-wider text-sm">queued for review</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos?.map((video) => (
            <Card key={video.id} className="bg-slate-900/50 border-slate-800 overflow-hidden flex flex-col hover:border-slate-700 transition-all duration-300 group shadow-lg">
              {video.coverUrl && (
                <div className="aspect-[4/5] relative overflow-hidden bg-slate-950">
                  <img 
                    src={video.coverUrl} 
                    alt="" 
                    className="object-cover w-full h-full opacity-70 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-white/10 text-[10px] px-2 py-0.5 uppercase tracking-widest font-bold">
                      {video.platform}
                    </Badge>
                  </div>
                </div>
              )}
              <CardHeader className="pb-2 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                    {video.authorUsername?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-blue-400 font-bold text-sm tracking-tight">
                    @{video.authorUsername}
                  </div>
                </div>
                <CardTitle className="text-sm font-medium line-clamp-4 leading-relaxed text-slate-200">
                  {video.description}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col pt-2">
                <div className="grid grid-cols-2 gap-4 mb-6 pt-2">
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">
                      <Play className="w-3 h-3 text-blue-500" />
                      Plays
                    </div>
                    <div className="text-lg font-black text-white">{video.playCount?.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase font-bold tracking-tighter mb-1">
                      <Heart className="w-3 h-3 text-rose-500" />
                      Likes
                    </div>
                    <div className="text-lg font-black text-white">{video.likeCount?.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                     <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                     Score Reason
                   </div>
                   <div className="text-xs text-slate-400 italic bg-slate-950/30 p-3 rounded-xl border border-slate-800/30 line-clamp-2">
                     "{video.scoreReason}"
                   </div>
                </div>

                <div className="mt-auto space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <Calendar className="w-3 h-3" />
                      {video.discoveredAt && format(new Date(video.discoveredAt), "MMM d, HH:mm")}
                    </div>

                    <a 
                      href={video.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 text-[11px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Watch on TikTok <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <Button 
                      onClick={() => approveMutation.mutate(video.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-900/10 border-b-2 border-emerald-700 active:border-b-0 active:translate-y-[2px] transition-all"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-2 stroke-[3]" /> Approve
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(video.id)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-rose-900/10 border-b-2 border-rose-700 active:border-b-0 active:translate-y-[2px] transition-all"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-2 stroke-[3]" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(videos?.length === 0 || !videos) && !isLoading && (
          <div className="text-center py-32 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <Check className="w-8 h-8 text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-300 mb-2">No videos queued</h2>
            <p className="text-slate-500 text-sm max-w-xs">Everything from the n8n pipeline has been assessed. Great job!</p>
          </div>
        )}
      </div>
    </div>
  );
}
