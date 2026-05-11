import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { IframeExtension, parseIframeHtml } from '@/components/tiptap/IframeExtension';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Undo,
  Redo,
  Video,
  Link2,
  Zap,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Article, Category } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface ArticleEditorProps {
  article?: Article;
  categories: Category[];
  onSave: (data: {
    title: string;
    content: string;
    excerpt: string;
    category: string;
    imageUrl?: string;
    imageUrls?: string[];
    interestScore?: number;
    facebookEmbedUrl?: string | null;
    sourceUrl?: string;
    facebookHeadline?: string;
    videoUrl?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ArticleEditor({
  article,
  categories,
  onSave,
  onCancel,
  isSaving = false,
}: ArticleEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(article?.title || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [category, setCategory] = useState(article?.category || '');
  const [imageUrl, setImageUrl] = useState(article?.imageUrl || '');
  const [imageUrls, setImageUrls] = useState<string[]>(article?.imageUrls || []);
  const [interestScore, setInterestScore] = useState<number>(article?.interestScore ?? 3);
  const [facebookEmbedUrl, setFacebookEmbedUrl] = useState((article as any)?.facebookEmbedUrl || '');
  const [sourceUrl, setSourceUrl] = useState(article?.sourceUrl || '');
  const [facebookHeadline, setFacebookHeadline] = useState(article?.facebookHeadline || '');
  const [videoUrl, setVideoUrl] = useState(article?.videoUrl || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isGeneratingHeadline, setIsGeneratingHeadline] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDeepEnriching, setIsDeepEnriching] = useState(false);
  const [editorNotes, setEditorNotes] = useState('');
  const [facebookCaption, setFacebookCaption] = useState((article as any)?.facebookCaption || '');
  const [previousScore, setPreviousScore] = useState<number>(article?.interestScore ?? 3);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
          style: null,
        },
      }),
      IframeExtension.configure({
        allowFullscreen: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your article content here...',
      }),
    ],
    content: article?.content || '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none min-h-[400px] focus:outline-none p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && article?.content && editor.getHTML() !== article.content) {
      editor.commands.setContent(article.content);
    }
  }, [editor, article?.content]);

  const handleSave = async () => {
    if (!editor || !title.trim() || !category) {
      return;
    }

    const content = editor.getHTML();

    await onSave({
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || title.substring(0, 200),
      category,
      imageUrl: imageUrl || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      interestScore,
      facebookEmbedUrl: facebookEmbedUrl.trim() || null, // Use null to clear, undefined would be ignored
      sourceUrl: sourceUrl || undefined,
      facebookHeadline: facebookHeadline || undefined,
      videoUrl: videoUrl.trim() || null, // Use null to clear
    });
  };

  const addLink = () => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addEmbed = () => {
    if (!editor) return;
    const embedCode = window.prompt(
      'Paste iframe embed code (e.g., Facebook video embed):',
      '<iframe src="https://www.facebook.com/plugins/video.php?..." width="267" height="476"></iframe>'
    );
    if (embedCode) {
      // Try to parse the iframe HTML
      const parsed = parseIframeHtml(embedCode);
      if (parsed && parsed.src) {
        editor.chain().focus().setIframe({
          src: parsed.src,
          width: parsed.width,
          height: parsed.height,
        }).run();
        toast({
          title: "Embed Added",
          description: "Iframe embed inserted into content",
        });
      } else {
        toast({
          title: "Invalid Embed Code",
          description: "Please paste a valid iframe HTML code",
          variant: "destructive",
        });
      }
    }
  };

  const addImageToList = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      setImageUrls([...imageUrls, url]);
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setImageUrl(data.imageUrl);

      toast({
        title: "Image Uploaded",
        description: "Featured image uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setImageUrls([...imageUrls, data.imageUrl]);

      toast({
        title: "Image Uploaded",
        description: "Additional image uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/admin/upload-video', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await response.json();
      setVideoUrl(data.videoUrl);

      toast({
        title: "Video Uploaded",
        description: "Video uploaded to Cloudinary successfully",
      });
    } catch (error) {
      toast({
        title: "Video Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setIsUploadingVideo(false);
      e.target.value = '';
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="article-title">Title</Label>
        <Input
          id="article-title"
          data-testid="input-article-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter article title"
          className="text-lg font-semibold"
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="article-category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="article-category" data-testid="select-article-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Interest Score */}
      <div className="space-y-2">
        <Label htmlFor="article-interest-score">Interest Score</Label>
        <div className="flex gap-2">
          <Select
            value={interestScore.toString()}
            onValueChange={(val) => {
              const newScore = parseInt(val);
              // Track previous score for upgrade detection
              setPreviousScore(interestScore);
              setInterestScore(newScore);
            }}
          >
            <SelectTrigger id="article-interest-score" data-testid="select-article-interest-score" className="flex-1">
              <SelectValue placeholder="Select interest score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Low (Draft only)</SelectItem>
              <SelectItem value="2">2 - Minor (Draft only)</SelectItem>
              <SelectItem value="3">3 - Moderate (Published, manual post)</SelectItem>
              <SelectItem value="4">4 - High (Auto-posted to socials)</SelectItem>
              <SelectItem value="5">5 - Urgent (Auto-posted to socials)</SelectItem>
            </SelectContent>
          </Select>
          {/* Show Quick Enrich button for existing articles with low scores */}
          {article?.id && (article?.interestScore ?? 3) < 4 && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={async () => {
                if (!article?.id) return;
                setIsUpgrading(true);
                try {
                  const response = await fetch(`/api/admin/articles/${article.id}/upgrade-enrich`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ targetScore: interestScore >= 4 ? interestScore : 4 }),
                  });
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to upgrade article');
                  }
                  const data = await response.json();

                  // Update editor with enriched content
                  if (data.article) {
                    setTitle(data.article.title);
                    setExcerpt(data.article.excerpt);
                    setInterestScore(data.article.interestScore);
                    if (data.article.facebookHeadline) {
                      setFacebookHeadline(data.article.facebookHeadline);
                    }
                    if (editor && data.article.content) {
                      editor.commands.setContent(data.article.content);
                    }
                  }

                  toast({
                    title: "✨ Quick Enrich Complete!",
                    description: `Story enhanced with GPT-4o mini. Score: ${data.changes?.previousScore} → ${data.changes?.newScore}`,
                  });
                } catch (error) {
                  toast({
                    title: "Quick Enrich Failed",
                    description: error instanceof Error ? error.message : "Failed to upgrade article",
                    variant: "destructive",
                  });
                } finally {
                  setIsUpgrading(false);
                }
              }}
              disabled={isUpgrading || isDeepEnriching || isSaving}
              data-testid="button-upgrade-enrich"
              className="bg-purple-500 text-white hover:bg-purple-600 border-0"
            >
              {isUpgrading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isUpgrading ? 'Enriching...' : 'Quick Enrich'}
            </Button>
          )}

          {/* Deep Enrich Button — Premium Sonnet 4-6 enrichment */}
          {article?.id && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={async () => {
                if (!article?.id) return;
                setIsDeepEnriching(true);
                try {
                  const response = await fetch(`/api/admin/articles/${article.id}/enrich-premium`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ editorNotes }),
                  });
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Deep Enrich failed');
                  }
                  const data = await response.json();

                  // Update editor with enriched content
                  setTitle(data.enrichedTitle);
                  setExcerpt(data.enrichedExcerpt);
                  if (data.facebookCaption) {
                    setFacebookCaption(data.facebookCaption);
                  }
                  if (editor && data.enrichedContent) {
                    editor.commands.setContent(data.enrichedContent);
                  }

                  toast({
                    title: "🚀 Deep Enrich Complete!",
                    description: `Story enhanced with Claude Sonnet and fresh comments. Review and save.`,
                  });
                } catch (error) {
                  toast({
                    title: "Deep Enrich Failed",
                    description: error instanceof Error ? error.message : "Deep enrichment failed",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeepEnriching(false);
                }
              }}
              disabled={isDeepEnriching || isUpgrading || isSaving}
              data-testid="button-deep-enrich"
              className="bg-amber-500 text-white hover:bg-amber-600 border-0"
            >
              {isDeepEnriching ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {isDeepEnriching ? 'Processing...' : 'Deep Enrich'}
            </Button>
          )}
        </div>

        {/* Editor Notes for Deep Enrich */}
        {article?.id && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="editor-notes-field" className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Editor Notes (Trusted Local Knowledge)
            </Label>
            <Textarea
              id="editor-notes-field"
              placeholder="Add any details you know — location context, backstory, corrections, things the source missed... (Used by Deep Enrich)"
              value={editorNotes}
              onChange={(e) => setEditorNotes(e.target.value)}
              rows={3}
              className="text-xs border-amber-200 focus-visible:ring-amber-500"
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          Scores 4-5 trigger automatic posting to Facebook/Instagram/Threads when published.
          <span className="block mt-1 text-purple-600 dark:text-purple-400">
            💡 Use <strong>Quick Enrich</strong> for fast AI cleanup, or <strong>Deep Enrich</strong> for premium investigative reporting with fresh comments.
          </span>
        </p>
      </div>

      {/* Video Section */}
      <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">Video (optional)</Label>
        </div>

        {/* Direct Video URL or Upload */}
        <div className="space-y-2">
          <Label htmlFor="article-video-url" className="text-xs text-muted-foreground">Direct Video URL or Cloudinary Upload</Label>
          <div className="flex gap-2">
            <Input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              disabled={isUploadingVideo}
              className="hidden"
              id="video-upload"
              data-testid="input-article-video-file"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('video-upload')?.click()}
              disabled={isUploadingVideo}
              data-testid="button-upload-video"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploadingVideo ? 'Uploading...' : 'Upload Video'}
            </Button>
            <Input
              id="article-video-url"
              data-testid="input-article-video-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/... or any direct .mp4 URL"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a video file (mp4, mov, webm — up to 500MB) to Cloudinary, or paste any direct video URL. This will be embedded as a native video player on the article page.
          </p>
          {videoUrl && (
            <div className="flex items-center gap-2 mt-2">
              <video
                src={videoUrl}
                controls
                className="w-full max-w-sm rounded-md max-h-48"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setVideoUrl('')}
                data-testid="button-remove-video"
              >
                Remove
              </Button>
            </div>
          )}
        </div>

        {/* Facebook Reel / Embed URL */}
        <div className="space-y-2">
          <Label htmlFor="article-facebook-embed" className="text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Facebook Reel / Video Embed URL</span>
          </Label>
          <Input
            id="article-facebook-embed"
            data-testid="input-article-facebook-embed"
            value={facebookEmbedUrl}
            onChange={(e) => setFacebookEmbedUrl(e.target.value)}
            placeholder="https://www.facebook.com/reel/4117170505095746"
          />
          <p className="text-xs text-muted-foreground">
            Paste a Facebook reel or video URL here if you want to embed it directly from Facebook (no upload needed).
          </p>
        </div>
      </div>

      {/* Source URL */}
      <div className="space-y-2">
        <Label htmlFor="article-source-url">Source URL (optional)</Label>
        <Input
          id="article-source-url"
          data-testid="input-article-source-url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://www.facebook.com/phuketimes/posts/..."
        />
        <p className="text-xs text-muted-foreground">
          Original source link for attribution. Links to the Facebook post or news article you're covering.
        </p>
      </div>

      {/* Facebook Headline */}
      <div className="space-y-2">
        <Label htmlFor="article-facebook-headline">Facebook Headline (optional)</Label>
        <div className="flex gap-2">
          <Input
            id="article-facebook-headline"
            data-testid="input-article-facebook-headline"
            value={facebookHeadline}
            onChange={(e) => setFacebookHeadline(e.target.value)}
            placeholder="High-CTR headline for Facebook posts"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!title.trim()) {
                toast({
                  title: "Title Required",
                  description: "Please enter a title first to generate a Facebook headline",
                  variant: "destructive",
                });
                return;
              }
              setIsGeneratingHeadline(true);
              try {
                const response = await fetch('/api/admin/generate-facebook-headline', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    title: title.trim(),
                    excerpt: excerpt.trim() || editor?.getHTML().substring(0, 500) || ''
                  }),
                });
                if (!response.ok) throw new Error('Failed to generate headline');
                const data = await response.json();
                setFacebookHeadline(data.headline);
                toast({
                  title: "Headline Generated",
                  description: "AI-optimized Facebook headline created",
                });
              } catch (error) {
                toast({
                  title: "Generation Failed",
                  description: error instanceof Error ? error.message : "Failed to generate headline",
                  variant: "destructive",
                });
              } finally {
                setIsGeneratingHeadline(false);
              }
            }}
            disabled={isGeneratingHeadline || !title.trim()}
            data-testid="button-generate-fb-headline"
          >
            {isGeneratingHeadline ? 'Generating...' : '✨ Generate'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          CTR-optimized headline used when posting to Facebook. If empty, the article title is used.
        </p>
      </div>

      {/* Facebook Caption — populated by Deep Enrich, editable, used as the post body */}
      {facebookCaption && (
        <div className="space-y-2 p-3 border border-blue-500/30 rounded-lg bg-blue-500/5">
          <Label htmlFor="article-facebook-caption" className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
            📱 Facebook Caption
            <span className="text-muted-foreground font-normal">(generated by Deep Enrich — editable)</span>
          </Label>
          <Textarea
            id="article-facebook-caption"
            data-testid="input-article-facebook-caption"
            value={facebookCaption}
            onChange={(e) => setFacebookCaption(e.target.value)}
            placeholder="Facebook caption will appear here after Deep Enrich runs..."
            rows={4}
            className="text-xs border-blue-300 focus-visible:ring-blue-500"
          />
          <p className="text-xs text-muted-foreground">{facebookCaption.length} chars — this caption is used when clicking &quot;Post to Facebook&quot; from the article card.</p>
        </div>
      )}

      {/* Excerpt */}
      <div className="space-y-2">
        <Label htmlFor="article-excerpt">Excerpt (optional)</Label>
        <Textarea
          id="article-excerpt"
          data-testid="input-article-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Brief summary of the article (auto-generated from title if left empty)"
          rows={3}
        />
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label>Featured Image</Label>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFeaturedImageUpload}
            disabled={isUploadingImage}
            className="hidden"
            id="featured-image-upload"
            data-testid="input-article-image-file"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('featured-image-upload')?.click()}
            disabled={isUploadingImage}
            data-testid="button-upload-featured-image"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploadingImage ? 'Uploading...' : 'Upload Image'}
          </Button>
          <Input
            data-testid="input-article-image-url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Or enter image URL"
            className="flex-1"
          />
        </div>
        {imageUrl && (
          <div className="space-y-2">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full max-w-md rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setImageUrl('')}
              data-testid="button-remove-featured-image"
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Additional Images</Label>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleAdditionalImageUpload}
            disabled={isUploadingImage}
            className="hidden"
            id="additional-image-upload"
            data-testid="input-additional-image-file"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('additional-image-upload')?.click()}
            disabled={isUploadingImage}
            data-testid="button-upload-additional-image"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploadingImage ? 'Uploading...' : 'Upload Image'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addImageToList}
            data-testid="button-add-image-url"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Add Image URL
          </Button>
        </div>
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => removeImage(index)}
                  data-testid={`button-remove-image-${index}`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content Editor */}
      <div className="space-y-2">
        <Label>Content</Label>
        <div className="border rounded-md overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-accent' : ''}
              data-testid="button-editor-bold"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-accent' : ''}
              data-testid="button-editor-italic"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}
              data-testid="button-editor-heading"
            >
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-accent' : ''}
              data-testid="button-editor-bullet-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-accent' : ''}
              data-testid="button-editor-ordered-list"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLink}
              className={editor.isActive('link') ? 'bg-accent' : ''}
              data-testid="button-editor-link"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addImage}
              data-testid="button-editor-image"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addEmbed}
              data-testid="button-editor-embed"
              title="Add embed (iframe)"
            >
              <Code className="w-4 h-4" />
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              data-testid="button-editor-undo"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              data-testid="button-editor-redo"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          {/* Editor Content */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          data-testid="button-cancel-edit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !title.trim() || !category}
          data-testid="button-save-article"
        >
          {isSaving ? 'Saving...' : article ? 'Save Changes' : 'Create Article'}
        </Button>
      </div>
    </div>
  );
}
