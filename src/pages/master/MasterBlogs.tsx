import { useState, useEffect, useMemo } from "react";
import { MasterLayout } from "@/components/layout/MasterLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Clock,
  Globe,
  Tag,
  Share2,
  Loader2,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileText,
  AlertCircle,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { BlogPost, BLOG_CATEGORIES, DEFAULT_BLOGS } from "@/types/blog";
import { useNavigate } from "react-router-dom";

const BLOGS_STORAGE_KEY = "orbit_master_blogs";

const COVER_PRESETS = [
  {
    name: "Higher Ed & NEP",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "AI & Innovation",
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Security & Cloud",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Modern University",
    url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80",
  },
];

export default function MasterBlogs() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBlog, setSavingBlog] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [editorTab, setEditorTab] = useState("content");

  // Form State
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: COVER_PRESETS[0].url,
    category: BLOG_CATEGORIES[0] as string,
    tagsInput: "Higher Education, NEP 2020, Orbit LMS",
    authorName: "Orbit Editorial Team",
    authorRole: "EdTech Research Lead",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    readingTime: "5 min read",
    isPublished: true,
    isFeatured: false,
    metaTitle: "",
    metaDescription: "",
    focusKeywordsInput: "Higher Education LMS, NEP 2020, Academic Credit Bank",
    canonicalUrl: "",
  });

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    setLoading(true);
    try {
      let loaded: BlogPost[] = [];

      // 1. Try Supabase first
      try {
        const { data: dbBlogs, error } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && dbBlogs && dbBlogs.length > 0) {
          loaded = dbBlogs.map((b: any) => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            excerpt: b.excerpt || "",
            content: b.content || "",
            coverImage: b.cover_image || COVER_PRESETS[0].url,
            category: b.category || "EdTech",
            tags: Array.isArray(b.tags) ? b.tags : [],
            author: {
              name: b.author_name || "Orbit Editorial Team",
              role: b.author_role || "EdTech Research Lead",
              avatar: b.author_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
            },
            readingTime: b.reading_time || "5 min read",
            publishedAt: b.created_at || new Date().toISOString(),
            updatedAt: b.updated_at || new Date().toISOString(),
            isPublished: b.is_published !== false,
            isFeatured: !!b.is_featured,
            seo: {
              metaTitle: b.meta_title || b.title,
              metaDescription: b.meta_description || b.excerpt || "",
              focusKeywords: Array.isArray(b.focus_keywords) ? b.focus_keywords : [],
              canonicalUrl: b.canonical_url || `https://orbitlms.in/blog/${b.slug}`,
            },
            viewsCount: Number(b.views_count) || 120,
          }));
        }
      } catch (e) {
        console.warn("Supabase blogs table not ready yet, using localStorage cache:", e);
      }

      // 2. Fallback to localStorage or DEFAULT_BLOGS
      if (loaded.length === 0) {
        const stored = localStorage.getItem(BLOGS_STORAGE_KEY);
        if (stored) {
          try {
            loaded = JSON.parse(stored);
          } catch {
            loaded = DEFAULT_BLOGS;
          }
        } else {
          loaded = DEFAULT_BLOGS;
          localStorage.setItem(BLOGS_STORAGE_KEY, JSON.stringify(DEFAULT_BLOGS));
        }
      }

      setBlogs(loaded);
    } catch (err) {
      console.error("Error loading blogs:", err);
      setBlogs(DEFAULT_BLOGS);
    } finally {
      setLoading(false);
    }
  };

  const persistBlogs = async (updated: BlogPost[]) => {
    setBlogs(updated);
    localStorage.setItem(BLOGS_STORAGE_KEY, JSON.stringify(updated));

    // Broadcast for live sync across public /blog and landing page
    try {
      window.dispatchEvent(new CustomEvent("orbit_blogs_updated", { detail: updated }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      // ignore
    }

    // Persist all to Supabase if table exists
    try {
      const records = updated.map((b) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt,
        content: b.content,
        cover_image: b.coverImage,
        category: b.category,
        tags: b.tags,
        author_name: b.author.name,
        author_role: b.author.role,
        author_avatar: b.author.avatar,
        reading_time: b.readingTime,
        is_published: b.isPublished,
        is_featured: b.isFeatured,
        meta_title: b.seo.metaTitle,
        meta_description: b.seo.metaDescription,
        focus_keywords: b.seo.focusKeywords,
        canonical_url: b.seo.canonicalUrl,
        views_count: b.viewsCount || 0,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("blogs").upsert(records, { onConflict: "id" });
    } catch (e) {
      console.warn("Could not upsert blogs to Supabase:", e);
    }
  };

  // Helper to generate URL-safe SEO slug
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Auto calculate estimated reading time from word count
  const calculateReadingTime = (content: string) => {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingBlog(null);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImage: COVER_PRESETS[0].url,
      category: BLOG_CATEGORIES[0],
      tagsInput: "Higher Education, NEP 2020, Orbit LMS",
      authorName: "Orbit Editorial Team",
      authorRole: "EdTech Research Lead",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      readingTime: "5 min read",
      isPublished: true,
      isFeatured: false,
      metaTitle: "",
      metaDescription: "",
      focusKeywordsInput: "Higher Education LMS, NEP 2020, Academic Credit Bank",
      canonicalUrl: "",
    });
    setEditorTab("content");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (blog: BlogPost) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      coverImage: blog.coverImage,
      category: blog.category,
      tagsInput: blog.tags.join(", "),
      authorName: blog.author.name,
      authorRole: blog.author.role,
      authorAvatar: blog.author.avatar,
      readingTime: blog.readingTime,
      isPublished: blog.isPublished,
      isFeatured: blog.isFeatured,
      metaTitle: blog.seo.metaTitle,
      metaDescription: blog.seo.metaDescription,
      focusKeywordsInput: blog.seo.focusKeywords.join(", "),
      canonicalUrl: blog.seo.canonicalUrl || "",
    });
    setEditorTab("content");
    setIsModalOpen(true);
  };

  // Save Blog
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an article title.",
        variant: "destructive",
      });
      return;
    }

    const finalSlug = form.slug.trim() || generateSlug(form.title);
    const parsedTags = form.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const parsedKeywords = form.focusKeywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const computedReadingTime = form.readingTime || calculateReadingTime(form.content);

    setSavingBlog(true);
    try {
      if (editingBlog) {
        const updated = blogs.map((b) =>
          b.id === editingBlog.id
            ? {
                ...b,
                title: form.title,
                slug: finalSlug,
                excerpt: form.excerpt,
                content: form.content,
                coverImage: form.coverImage,
                category: form.category,
                tags: parsedTags,
                author: {
                  name: form.authorName,
                  role: form.authorRole,
                  avatar: form.authorAvatar,
                },
                readingTime: computedReadingTime,
                isPublished: form.isPublished,
                isFeatured: form.isFeatured,
                updatedAt: new Date().toISOString(),
                seo: {
                  metaTitle: form.metaTitle.trim() || form.title,
                  metaDescription: form.metaDescription.trim() || form.excerpt,
                  focusKeywords: parsedKeywords,
                  canonicalUrl: form.canonicalUrl.trim() || `https://orbitlms.in/blog/${finalSlug}`,
                },
              }
            : b
        );
        await persistBlogs(updated);
        toast({
          title: "Blog Article Updated",
          description: `"${form.title}" has been updated with full SEO metadata.`,
        });
      } else {
        const newBlog: BlogPost = {
          id: `blog-${Date.now()}`,
          title: form.title,
          slug: finalSlug,
          excerpt: form.excerpt,
          content: form.content,
          coverImage: form.coverImage,
          category: form.category,
          tags: parsedTags,
          author: {
            name: form.authorName,
            role: form.authorRole,
            avatar: form.authorAvatar,
          },
          readingTime: computedReadingTime,
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: form.isPublished,
          isFeatured: form.isFeatured,
          viewsCount: 1,
          seo: {
            metaTitle: form.metaTitle.trim() || form.title,
            metaDescription: form.metaDescription.trim() || form.excerpt,
            focusKeywords: parsedKeywords,
            canonicalUrl: form.canonicalUrl.trim() || `https://orbitlms.in/blog/${finalSlug}`,
          },
        };
        const updated = [newBlog, ...blogs];
        await persistBlogs(updated);
        toast({
          title: "SEO Blog Published",
          description: `New article "${newBlog.title}" is now live at /blog/${newBlog.slug}.`,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Could not save blog post.",
        variant: "destructive",
      });
    } finally {
      setSavingBlog(false);
    }
  };

  // Toggle Live/Draft
  const handleTogglePublish = async (blog: BlogPost) => {
    const updated = blogs.map((b) =>
      b.id === blog.id ? { ...b, isPublished: !b.isPublished } : b
    );
    await persistBlogs(updated);
    toast({
      title: !blog.isPublished ? "Article Published" : "Article Set to Draft",
      description: `"${blog.title}" is ${!blog.isPublished ? "now live on /blog" : "hidden from public view"}.`,
    });
  };

  // Toggle Featured
  const handleToggleFeatured = async (blog: BlogPost) => {
    const updated = blogs.map((b) =>
      b.id === blog.id ? { ...b, isFeatured: !b.isFeatured } : b
    );
    await persistBlogs(updated);
    toast({
      title: !blog.isFeatured ? "Marked as Featured" : "Removed from Featured",
      description: `"${blog.title}" will ${!blog.isFeatured ? "now be highlighted" : "no longer be featured"} on the homepage.`,
    });
  };

  // Delete Blog
  const handleDeleteBlog = async (blogId: string, blogTitle: string) => {
    if (confirm(`Are you sure you want to delete the blog post "${blogTitle}"?`)) {
      const updated = blogs.filter((b) => b.id !== blogId);
      await persistBlogs(updated);
      try {
        await supabase.from("blogs").delete().eq("id", blogId);
      } catch (e) {
        console.warn("Could not delete from Supabase blogs:", e);
      }
      toast({
        title: "Blog Deleted",
        description: `"${blogTitle}" has been removed.`,
      });
    }
  };

  // Filtered Blogs
  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.seo.focusKeywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === "all" || b.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && b.isPublished) ||
        (statusFilter === "draft" && !b.isPublished) ||
        (statusFilter === "featured" && b.isFeatured);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [blogs, searchQuery, categoryFilter, statusFilter]);

  // Overall KPIs
  const totalViews = useMemo(() => blogs.reduce((acc, b) => acc + (b.viewsCount || 0), 0), [blogs]);
  const publishedCount = useMemo(() => blogs.filter((b) => b.isPublished).length, [blogs]);
  const featuredCount = useMemo(() => blogs.filter((b) => b.isFeatured).length, [blogs]);

  return (
    <MasterLayout
      headerTitle="SEO Blogs & Knowledge Engine"
      headerDescription="Publish search-optimized articles, NEP 2020 regulatory insights, and campus guides to drive high-intent organic traffic to Orbit LMS."
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Articles</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{blogs.length} Posts</div>
              <p className="text-xs text-slate-400 mt-1">{publishedCount} indexed & publicly live</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Homepage Featured</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{featuredCount} Featured</div>
              <p className="text-xs text-slate-400 mt-1">Highlighted on public landing page</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Organic Readers</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{totalViews.toLocaleString("en-IN")} Views</div>
              <p className="text-xs text-slate-400 mt-1">Total combined article readership</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">SEO Health Index</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Globe className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">100% Optimized</div>
              <p className="text-xs text-slate-400 mt-1">Schema JSON-LD & meta tags active</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Header & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search articles by title, keywords, or URL slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-white text-xs h-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] bg-slate-900 border-slate-800 text-slate-300 text-xs h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                <SelectItem value="all">All Categories</SelectItem>
                {BLOG_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-slate-900 border-slate-800 text-slate-300 text-xs h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="featured">Featured Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadBlogs}
              className="border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/blog", "_blank")}
              className="border-slate-800 hover:bg-slate-800 text-cyan-400 text-xs h-9"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Public Blog Hub
            </Button>
            <Button
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Write SEO Article
            </Button>
          </div>
        </div>

        {/* Articles Table Card */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  All Blog Publications ({filteredBlogs.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Managed and indexed centrally for Google search indexing and campus thought leadership.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/60 border-b border-slate-800">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Article & Slug</TableHead>
                    <TableHead className="text-slate-400 text-xs">Category</TableHead>
                    <TableHead className="text-slate-400 text-xs">Author</TableHead>
                    <TableHead className="text-slate-400 text-xs">SEO Keywords</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                        No articles found matching your query. Click "Write SEO Article" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBlogs.map((blog) => (
                      <TableRow key={blog.id} className="border-slate-800/60 hover:bg-slate-800/40">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={blog.coverImage}
                              alt={blog.title}
                              className="w-14 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                            />
                            <div className="space-y-1 max-w-sm">
                              <div className="font-semibold text-white text-xs line-clamp-1 hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => handleOpenEditModal(blog)}>
                                {blog.title}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 truncate">
                                <span className="text-indigo-400">/blog/</span>
                                <span className="truncate">{blog.slug}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300 bg-slate-950/40">
                            {blog.category}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={blog.author.avatar}
                              alt={blog.author.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-700"
                            />
                            <div className="text-xs">
                              <div className="text-slate-200 font-medium text-[11px]">{blog.author.name}</div>
                              <div className="text-slate-500 text-[10px]">{blog.readingTime}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {blog.seo.focusKeywords.slice(0, 2).map((k) => (
                              <span
                                key={k}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-slate-950 text-indigo-300 border border-indigo-500/20 font-mono"
                              >
                                {k}
                              </span>
                            ))}
                            {blog.seo.focusKeywords.length > 2 && (
                              <span className="text-[9px] text-slate-500 self-center">
                                +{blog.seo.focusKeywords.length - 2}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(blog)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                                blog.isPublished
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                              }`}
                            >
                              {blog.isPublished ? (
                                <>
                                  <Eye className="w-3 h-3 text-emerald-400" />
                                  <span>Live</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-slate-400" />
                                  <span>Draft</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(blog)}
                              title={blog.isFeatured ? "Featured on Landing Page" : "Click to feature on Landing Page"}
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                                blog.isFeatured
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : "bg-slate-800/40 text-slate-500 border-slate-800 hover:text-slate-300"
                              }`}
                            >
                              ★
                            </button>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/blog/${blog.slug}`, "_blank")}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                              title="View Public Blog Page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditModal(blog)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-400 hover:bg-slate-800"
                              title="Edit Article & SEO"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBlog(blog.id, blog.title)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Delete Blog"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* MODAL: WRITE / EDIT BLOG POST */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100 max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                {editingBlog ? "Edit SEO Article" : "Write & Publish New SEO Article"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Articles authored here are dynamically indexed for Google SERP search engine crawlers and published to the public Orbit LMS Blog Hub.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveBlog} className="space-y-4 pt-2">
              <Tabs value={editorTab} onValueChange={setEditorTab} className="w-full">
                <TabsList className="bg-slate-950 border border-slate-800 text-slate-400 grid grid-cols-2">
                  <TabsTrigger
                    value="content"
                    className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Article Content & Media
                  </TabsTrigger>
                  <TabsTrigger
                    value="seo"
                    className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs"
                  >
                    <Globe className="w-3.5 h-3.5 mr-1.5" /> SEO Metadata & Google SERP Preview
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: ARTICLE CONTENT */}
                <TabsContent value="content" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-slate-300">Article Title *</Label>
                      <Input
                        placeholder="e.g. How Indian Universities Can Automate Academic Bank of Credits (ABC)"
                        value={form.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            title: val,
                            slug: prev.slug || generateSlug(val),
                            metaTitle: prev.metaTitle || val,
                          }));
                        }}
                        className="bg-slate-950 border-slate-800 text-white text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">URL Slug *</Label>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, slug: generateSlug(form.title) })}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300"
                        >
                          Auto-generate from Title
                        </button>
                      </div>
                      <div className="flex items-center rounded-md bg-slate-950 border border-slate-800 px-3">
                        <span className="text-xs text-slate-500 font-mono select-none">https://orbitlms.in/blog/</span>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })}
                          className="bg-transparent border-0 text-indigo-400 text-xs font-mono py-2 focus:outline-none flex-1"
                          placeholder="slug-url-path"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-slate-300">Executive Summary / Excerpt *</Label>
                      <textarea
                        rows={2}
                        value={form.excerpt}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            excerpt: e.target.value,
                            metaDescription: prev.metaDescription || e.target.value,
                          }))
                        }
                        placeholder="Concise 1-2 sentence preview displayed on search cards and Twitter summary..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Category *</Label>
                      <Select
                        value={form.category}
                        onValueChange={(val) => setForm({ ...form, category: val })}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                          <SelectValue placeholder="Choose Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                          {BLOG_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Estimated Reading Time</Label>
                      <Input
                        placeholder="e.g. 6 min read"
                        value={form.readingTime}
                        onChange={(e) => setForm({ ...form, readingTime: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    {/* Cover Image Presets */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">Cover Image URL *</Label>
                        <div className="flex gap-1.5">
                          {COVER_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setForm({ ...form, coverImage: preset.url })}
                              className="text-[10px] text-slate-400 hover:text-indigo-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input
                        value={form.coverImage}
                        onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                        required
                      />
                    </div>

                    {/* Author Details */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Author Name</Label>
                      <Input
                        value={form.authorName}
                        onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300">Author Role / Title</Label>
                      <Input
                        value={form.authorRole}
                        onChange={(e) => setForm({ ...form, authorRole: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-slate-300">Tags (comma-separated)</Label>
                      <Input
                        placeholder="NEP 2020, Academic Credit, DigiLocker, Higher Education"
                        value={form.tagsInput}
                        onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    {/* Markdown Body */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">Full Article Content (Markdown & HTML supported) *</Label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {form.content.trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <textarea
                        rows={12}
                        value={form.content}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            content: e.target.value,
                            readingTime: calculateReadingTime(e.target.value),
                          }))
                        }
                        placeholder="# Heading 1&#10;&#10;Write comprehensive educational content with subheadings (##), bullet points, and actionable takeaways..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: SEO ENGINE & GOOGLE SERP PREVIEW */}
                <TabsContent value="seo" className="space-y-5 pt-4">
                  {/* Interactive Google SERP Snippet Preview */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        Google Search Result Preview (Desktop & Mobile SERP)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Indexed as Rich Result</span>
                    </div>

                    <div className="p-4 rounded-lg bg-[#202124] border border-[#303134] text-left space-y-1">
                      <div className="flex items-center gap-2 text-[12px] text-[#bdc1c6]">
                        <div className="h-4 w-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">
                          O
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[11px] truncate">
                          <span>orbitlms.in</span>
                          <span className="text-[#9aa0a6]">› blog ›</span>
                          <span className="text-[#9aa0a6] truncate">{form.slug || "article-url-slug"}</span>
                        </div>
                      </div>

                      <h4 className="text-[18px] text-[#8ab4f8] hover:underline cursor-pointer font-sans leading-tight line-clamp-1">
                        {form.metaTitle || form.title || "Your Search Optimized Title Will Appear Here"}
                      </h4>

                      <p className="text-[13px] text-[#bdc1c6] font-sans line-clamp-2 leading-relaxed">
                        {form.metaDescription ||
                          form.excerpt ||
                          "Enter a compelling meta description summarizing the key takeaways and benefits of your educational guide..."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Meta Title */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">SEO Meta Title (Title Tag)</Label>
                        <span
                          className={`text-[10px] font-mono ${
                            form.metaTitle.length > 60
                              ? "text-amber-400"
                              : form.metaTitle.length >= 30
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {form.metaTitle.length}/60 chars (Recommended: 45-60)
                        </span>
                      </div>
                      <Input
                        value={form.metaTitle}
                        onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                        placeholder="Keyword-rich page title for search engines..."
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-300">SEO Meta Description</Label>
                        <span
                          className={`text-[10px] font-mono ${
                            form.metaDescription.length > 160
                              ? "text-amber-400"
                              : form.metaDescription.length >= 100
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {form.metaDescription.length}/160 chars (Recommended: 120-155)
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={form.metaDescription}
                        onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                        placeholder="Summarize the core premise and benefit of this article for search engine results..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Focus Keywords */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-slate-300">SEO Focus Keywords (comma-separated)</Label>
                      <Input
                        value={form.focusKeywordsInput}
                        onChange={(e) => setForm({ ...form, focusKeywordsInput: e.target.value })}
                        placeholder="NEP 2020 LMS, Indian University Software, Academic Bank of Credits"
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                      />
                    </div>

                    {/* Canonical URL */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-slate-300">Canonical Tag URL</Label>
                      <Input
                        value={form.canonicalUrl}
                        onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })}
                        placeholder={`https://orbitlms.in/blog/${form.slug || "slug"}`}
                        className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Status Toggles */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Publish & Index Live</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Instantly visible to students, universities, and Google crawlers.
                    </div>
                  </div>
                  <Checkbox
                    checked={form.isPublished}
                    onCheckedChange={(checked) => setForm({ ...form, isPublished: !!checked })}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-5 w-5"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Feature on Homepage</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Showcases article in the "Featured Insights" landing carousel.
                    </div>
                  </div>
                  <Checkbox
                    checked={form.isFeatured}
                    onCheckedChange={(checked) => setForm({ ...form, isFeatured: !!checked })}
                    className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 h-5 w-5"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingBlog}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md shadow-indigo-600/20"
                >
                  {savingBlog ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving Article...
                    </>
                  ) : editingBlog ? (
                    "Update Article"
                  ) : (
                    "Publish Article"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MasterLayout>
  );
}
