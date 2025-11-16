import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
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
  Undo,
  Redo,
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
        },
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
        <Select value={interestScore.toString()} onValueChange={(val) => setInterestScore(parseInt(val))}>
          <SelectTrigger id="article-interest-score" data-testid="select-article-interest-score">
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
        <p className="text-xs text-muted-foreground">
          Scores 4-5 trigger automatic posting to Facebook/Instagram/Threads when published.
        </p>
      </div>

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
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full max-w-md rounded-md"
          />
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
