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
  const [title, setTitle] = useState(article?.title || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [category, setCategory] = useState(article?.category || '');
  const [imageUrl, setImageUrl] = useState(article?.imageUrl || '');
  const [imageUrls, setImageUrls] = useState<string[]>(article?.imageUrls || []);

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
            data-testid="input-article-image-url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL"
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
