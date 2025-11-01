import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ArticleListItem } from "@shared/schema";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Reset search query when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const { data: allArticles = [] } = useQuery<ArticleListItem[]>({
    queryKey: ["/api/articles"],
    enabled: open, // Only fetch when dialog is open
  });

  const filteredArticles = searchQuery.trim()
    ? allArticles.filter((article) => {
        const query = searchQuery.toLowerCase();
        return (
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query) ||
          article.category.toLowerCase().includes(query)
        );
      }).slice(0, 10)
    : [];

  const handleArticleClick = () => {
    setSearchQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-search">
        <DialogHeader>
          <DialogTitle>Search Articles</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, content, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
            data-testid="input-search"
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          {searchQuery.trim() === "" ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Start typing to search articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No articles found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => {
                const articleUrl = article.slug ? `/article/${article.slug}` : `/article/${article.id}`;
                const isFresh = (Date.now() - new Date(article.publishedAt).getTime()) < (8 * 60 * 60 * 1000);
                const isBreaking = article.category.toLowerCase() === "breaking";
                const showRed = isBreaking && isFresh;

                return (
                  <Link key={article.id} href={articleUrl}>
                    <div
                      className="p-3 rounded-lg hover-elevate active-elevate-2 cursor-pointer border"
                      onClick={handleArticleClick}
                      data-testid={`search-result-${article.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={showRed ? "destructive" : "secondary"} 
                          className={`text-xs ${showRed ? "font-bold" : ""}`}
                        >
                          {isBreaking ? (showRed ? "BREAKING" : "Breaking") : article.category}
                        </Badge>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <h3 className="font-semibold mb-1 line-clamp-2">{article.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
