import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BlogPost, DEFAULT_BLOGS } from "@/types/blog";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Bookmark,
  CheckCircle2,
  Copy,
  ChevronRight,
  BookOpen,
  Sparkles,
  ArrowRight,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BLOGS_STORAGE_KEY = "orbit_master_blogs";

export default function BlogPostDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [allBlogs, setAllBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
    window.scrollTo(0, 0);
  }, [slug]);

  const loadPost = async () => {
    setLoading(true);
    try {
      let candidate: BlogPost | null = null;
      let allLoaded: BlogPost[] = [];

      // 1. Try Supabase
      try {
        const { data: dbPost, error } = await supabase
          .from("blogs")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!error && dbPost) {
          candidate = {
            id: dbPost.id,
            slug: dbPost.slug,
            title: dbPost.title,
            excerpt: dbPost.excerpt || "",
            content: dbPost.content || "",
            coverImage: dbPost.cover_image,
            category: dbPost.category || "EdTech",
            tags: Array.isArray(dbPost.tags) ? dbPost.tags : [],
            author: {
              name: dbPost.author_name || "Orbit Editorial Team",
              role: dbPost.author_role || "EdTech Research Lead",
              avatar: dbPost.author_avatar,
            },
            readingTime: dbPost.reading_time || "5 min read",
            publishedAt: dbPost.created_at || new Date().toISOString(),
            updatedAt: dbPost.updated_at || new Date().toISOString(),
            isPublished: dbPost.is_published !== false,
            isFeatured: !!dbPost.is_featured,
            seo: {
              metaTitle: dbPost.meta_title || dbPost.title,
              metaDescription: dbPost.meta_description || dbPost.excerpt || "",
              focusKeywords: Array.isArray(dbPost.focus_keywords) ? dbPost.focus_keywords : [],
              canonicalUrl: dbPost.canonical_url,
            },
            viewsCount: (Number(dbPost.views_count) || 100) + 1,
          };
        }

        const { data: allDb } = await supabase
          .from("blogs")
          .select("*")
          .eq("is_published", true);
        if (allDb) {
          allLoaded = allDb.map((b: any) => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            excerpt: b.excerpt || "",
            content: b.content || "",
            coverImage: b.cover_image,
            category: b.category,
            tags: b.tags || [],
            author: {
              name: b.author_name,
              role: b.author_role,
              avatar: b.author_avatar,
            },
            readingTime: b.reading_time,
            publishedAt: b.created_at,
            updatedAt: b.updated_at,
            isPublished: true,
            isFeatured: !!b.is_featured,
            seo: {
              metaTitle: b.meta_title || b.title,
              metaDescription: b.meta_description || b.excerpt || "",
              focusKeywords: b.focus_keywords || [],
            },
          }));
        }
      } catch (e) {
        // Fallback
      }

      // Check localStorage
      const stored = localStorage.getItem(BLOGS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (allLoaded.length === 0) allLoaded = parsed;
          if (!candidate) {
            candidate = parsed.find((b: BlogPost) => b.slug === slug || b.id === slug) || null;
          }
        } catch {}
      }

      // Default fallback
      if (!candidate) {
        candidate = DEFAULT_BLOGS.find((b) => b.slug === slug || b.id === slug) || null;
      }
      if (allLoaded.length === 0) {
        allLoaded = DEFAULT_BLOGS;
      }

      setPost(candidate);
      setAllBlogs(allLoaded);

      // Inject SEO Meta and JSON-LD schema
      if (candidate) {
        applySeoMetadata(candidate);
      }
    } catch (err) {
      console.warn("Could not load blog post:", err);
    } finally {
      setLoading(false);
    }
  };

  const applySeoMetadata = (p: BlogPost) => {
    // 1. Page Title
    document.title = `${p.seo.metaTitle || p.title} | Orbit LMS`;

    // 2. Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", p.seo.metaDescription || p.excerpt);

    // 3. Meta Keywords
    if (p.seo.focusKeywords && p.seo.focusKeywords.length > 0) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute("content", p.seo.focusKeywords.join(", "));
    }

    // 4. OpenGraph Tags
    const setMetaTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMetaTag("og:title", p.seo.metaTitle || p.title);
    setMetaTag("og:description", p.seo.metaDescription || p.excerpt);
    setMetaTag("og:image", p.coverImage);
    setMetaTag("og:url", window.location.href);
    setMetaTag("og:type", "article");

    // 5. JSON-LD Structured Data Schema for Google Rich Snippets
    const existingScript = document.getElementById("jsonld-blog-post");
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.id = "jsonld-blog-post";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      image: [p.coverImage],
      datePublished: p.publishedAt,
      dateModified: p.updatedAt,
      author: {
        "@type": "Person",
        name: p.author.name,
        jobTitle: p.author.role,
      },
      publisher: {
        "@type": "Organization",
        name: "Orbit LMS",
        logo: {
          "@type": "ImageObject",
          url: "https://orbitlms.in/logo.png",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": window.location.href,
      },
    });
    document.head.appendChild(script);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Article Link Copied",
      description: "Direct URL copied to clipboard. Ready to share with your campus colleagues.",
    });
  };

  const handleShareWhatsApp = () => {
    if (!post) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `Check out this article on Orbit LMS: "${post.title}" - ${window.location.href}`
    )}`;
    window.open(url, "_blank");
  };

  const handleShareTwitter = () => {
    if (!post) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      post.title
    )}&url=${encodeURIComponent(window.location.href)}&via=OrbitLMS`;
    window.open(url, "_blank");
  };

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return allBlogs
      .filter((b) => b.id !== post.id && (b.category === post.category || b.isPublished))
      .slice(0, 3);
  }, [allBlogs, post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Loading SEO Article...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
        <h2 className="text-2xl font-bold font-display text-foreground">Article Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          The requested article may have been archived or unpublished by the Master Admin.
        </p>
        <Button onClick={() => navigate("/blog")} className="gap-2 text-xs">
          <ArrowLeft className="h-4 w-4" /> Return to Blog Archive
        </Button>
      </div>
    );
  }

  // Simple Markdown Renderer
  const renderContent = (content: string) => {
    return content.split("\n\n").map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Heading 1
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-2xl sm:text-3xl font-black font-display text-foreground mt-8 mb-4 tracking-tight">
            {trimmed.replace("# ", "")}
          </h1>
        );
      }
      // Heading 2
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-xl sm:text-2xl font-bold font-display text-foreground mt-8 mb-3 pt-4 border-t tracking-tight">
            {trimmed.replace("## ", "")}
          </h2>
        );
      }
      // Heading 3
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-lg font-bold font-display text-foreground mt-6 mb-2">
            {trimmed.replace("### ", "")}
          </h3>
        );
      }
      // Blockquote
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={idx} className="my-6 border-l-4 border-primary bg-primary/5 p-4 rounded-r-xl text-sm italic text-foreground leading-relaxed">
            {trimmed.replace(/^>\s*/gm, "")}
          </blockquote>
        );
      }
      // Bullet list
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split("\n").map((line) => line.replace(/^[-*]\s*/, ""));
        return (
          <ul key={idx} className="my-4 space-y-2 list-disc pl-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split("\n").map((line) => line.replace(/^\d+\.\s*/, ""));
        return (
          <ol key={idx} className="my-4 space-y-2 list-decimal pl-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      }
      // Paragraph
      return (
        <p key={idx} className="my-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-sm">
              O
            </div>
            <span className="font-display font-extrabold text-base tracking-tight text-foreground">
              Orbit<span className="text-primary">LMS</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/blog")}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All Articles
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/#pricing")}
              className="font-bold text-xs bg-primary text-primary-foreground"
            >
              Institutional Plans
            </Button>
          </div>
        </div>
      </header>

      {/* Main Article Container */}
      <main className="container mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 flex-1 space-y-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-primary font-medium">{post.category}</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs uppercase tracking-wider font-bold">
              {post.category}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {post.readingTime}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display text-foreground tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {post.excerpt}
          </p>

          {/* Author Card & Share Actions */}
          <div className="pt-4 border-y border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-primary/20"
              />
              <div>
                <div className="font-bold text-sm text-foreground">{post.author.name}</div>
                <div className="text-xs text-muted-foreground">{post.author.role}</div>
              </div>
            </div>

            {/* Social Share Bar */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs h-8 gap-1.5"
                title="Copy Article URL"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="text-xs h-8 text-emerald-500 hover:text-emerald-400 gap-1.5"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareTwitter}
                className="text-xs h-8 gap-1.5"
                title="Share on Twitter / X"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
            </div>
          </div>
        </header>

        {/* Featured Cover Image */}
        <div className="rounded-3xl overflow-hidden border bg-muted max-h-[480px] relative shadow-lg">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Key Takeaways Callout Box */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Sparkles className="h-4 w-4" /> Key Executive Takeaways
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            This research paper outlines direct regulatory compliance pathways under NEP 2020. Indian academic institutions leveraging Orbit LMS automated credit tracking reduce semester-end audit friction by 85%.
          </p>
        </div>

        {/* Article Body Content */}
        <article className="prose prose-slate dark:prose-invert max-w-none pt-2">
          {renderContent(post.content)}
        </article>

        {/* Focus Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-6 border-t border-border space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Indexed Focus Keywords & Tags:</div>
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border border-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Institutional Consultation Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border border-primary/20 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold font-display text-foreground">
              Automate Academic Compliance With Orbit LMS
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Implement blockchain-ready certificates, NEP 2020 DigiLocker integration, and dynamic anti-piracy video lectures for your university.
            </p>
          </div>
          <Button
            onClick={() => navigate("/#pricing")}
            className="bg-primary text-primary-foreground font-bold text-xs px-6 py-2.5 shadow-md shrink-0"
          >
            Review Institutional Tiers
          </Button>
        </div>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <section className="pt-8 border-t space-y-4">
            <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Related Educational Guides
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="group rounded-2xl border bg-card overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="h-32 bg-muted overflow-hidden">
                    <img
                      src={rel.coverImage}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30 mb-1">
                        {rel.category}
                      </Badge>
                      <h4 className="font-bold text-xs line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                        {rel.title}
                      </h4>
                    </div>
                    <div className="pt-2 text-[10px] text-muted-foreground flex items-center justify-between">
                      <span>{rel.readingTime}</span>
                      <span className="text-primary font-bold flex items-center gap-0.5">
                        Read <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8 px-4 text-center text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/#pricing" className="hover:text-foreground">SaaS Pricing</Link>
          <Link to="/blog" className="hover:text-foreground text-primary">Blog & Research</Link>
          <Link to="/#contact" className="hover:text-foreground">Contact</Link>
        </div>
        <p>© 2026 Orbit LMS. Built for NEP 2020 accredited Indian universities and colleges.</p>
      </footer>
    </div>
  );
}
