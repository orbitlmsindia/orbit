import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BlogPost, BLOG_CATEGORIES, DEFAULT_BLOGS } from "@/types/blog";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  BookOpen,
  Clock,
  Calendar,
  ArrowRight,
  Sparkles,
  ChevronRight,
  TrendingUp,
  GraduationCap,
  Layers,
  Globe,
  Share2,
} from "lucide-react";
import { motion } from "framer-motion";

const BLOGS_STORAGE_KEY = "orbit_master_blogs";

export default function BlogList() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    // Set Document SEO Title & Meta
    document.title = "Orbit LMS Blog | Higher EdTech, NEP 2020 & AI Insights";
    
    // Inject dynamic meta description if missing
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      "Authoritative insights on Indian higher education technology, NEP 2020 compliance, Academic Bank of Credits (ABC), AI syllabus generators, and campus security."
    );

    fetchBlogs();

    const handleUpdate = () => fetchBlogs();
    window.addEventListener("orbit_blogs_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("orbit_blogs_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      let loaded: BlogPost[] = [];
      try {
        const { data: dbBlogs, error } = await supabase
          .from("blogs")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (!error && dbBlogs && dbBlogs.length > 0) {
          loaded = dbBlogs.map((b: any) => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            excerpt: b.excerpt || "",
            content: b.content || "",
            coverImage: b.cover_image,
            category: b.category || "EdTech",
            tags: Array.isArray(b.tags) ? b.tags : [],
            author: {
              name: b.author_name || "Orbit Editorial Team",
              role: b.author_role || "EdTech Research Lead",
              avatar: b.author_avatar,
            },
            readingTime: b.reading_time || "5 min read",
            publishedAt: b.created_at || new Date().toISOString(),
            updatedAt: b.updated_at || new Date().toISOString(),
            isPublished: true,
            isFeatured: !!b.is_featured,
            seo: {
              metaTitle: b.meta_title || b.title,
              metaDescription: b.meta_description || b.excerpt || "",
              focusKeywords: Array.isArray(b.focus_keywords) ? b.focus_keywords : [],
              canonicalUrl: b.canonical_url,
            },
            viewsCount: Number(b.views_count) || 100,
          }));
        }
      } catch (e) {
        console.warn("Could not query supabase blogs, falling back:", e);
      }

      // Check localStorage
      const stored = localStorage.getItem(BLOGS_STORAGE_KEY);
      let localBlogs: BlogPost[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localBlogs = parsed.filter((b: BlogPost) => b.isPublished !== false);
        } catch {}
      }

      if (loaded.length > 0 && localBlogs.length > 0) {
        const map = new Map<string, BlogPost>();
        loaded.forEach((b) => map.set(b.slug, b));
        localBlogs.forEach((b) => map.set(b.slug, b));
        loaded = Array.from(map.values()).filter((b) => b.isPublished !== false);
      } else if (loaded.length === 0) {
        loaded = localBlogs.length > 0 ? localBlogs : DEFAULT_BLOGS.filter((b) => b.isPublished);
      }

      setBlogs(loaded);
    } catch (err) {
      console.warn("Failed loading public blogs:", err);
      setBlogs(DEFAULT_BLOGS.filter((b) => b.isPublished));
    } finally {
      setLoading(false);
    }
  };

  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.seo.focusKeywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === "all" || b.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [blogs, searchQuery, selectedCategory]);

  const featuredPost = useMemo(() => {
    return blogs.find((b) => b.isFeatured) || blogs[0];
  }, [blogs]);

  const nonFeaturedPosts = useMemo(() => {
    if (!featuredPost) return filteredBlogs;
    return filteredBlogs.filter((b) => b.id !== featuredPost.id);
  }, [filteredBlogs, featuredPost]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/20">
              O
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-lg leading-tight tracking-tight text-foreground">
                Orbit<span className="text-primary">LMS</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Research & Insights
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              to="/#pricing"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hidden sm:inline-block transition-colors"
            >
              Plans & Pricing
            </Link>
            <Link
              to="/#contact"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hidden sm:inline-block transition-colors"
            >
              Enterprise SLA
            </Link>
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              className="font-bold text-xs shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Campus Sign In
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative py-14 sm:py-20 px-4 bg-muted/20 border-b overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-5xl text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Orbit Knowledge Hub & Academic Policy
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            Next-Gen EdTech Architecture, NEP 2020 & AI Campus Insights
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Curated analysis for university leaders, academic deans, and educators navigating digital credit portability, autonomous syllabus generation, and exam security.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by topic, NEP 2020, DigiLocker, AI or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-card border-border text-foreground text-sm rounded-full shadow-md focus-visible:ring-primary"
            />
          </div>

          {/* Category Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All Topics ({blogs.length})
            </button>
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 flex-1 space-y-12">
        {/* Featured Hero Article */}
        {!searchQuery && selectedCategory === "all" && featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="group block rounded-3xl border bg-card overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="lg:col-span-7 h-64 sm:h-96 relative overflow-hidden bg-muted">
                  <img
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-amber-500 text-black font-extrabold text-xs shadow-md gap-1">
                      <Sparkles className="h-3 w-3" /> Featured Institutional Guide
                    </Badge>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                      {featuredPost.category}
                    </Badge>
                    <h2 className="text-xl sm:text-2xl font-black font-display text-foreground group-hover:text-primary transition-colors leading-tight">
                      {featuredPost.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={featuredPost.author.avatar}
                        alt={featuredPost.author.name}
                        className="w-8 h-8 rounded-full object-cover border"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-foreground">{featuredPost.author.name}</div>
                        <div className="text-[10px] text-muted-foreground">{featuredPost.readingTime}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-primary text-xs font-bold group-hover:translate-x-1 transition-transform">
                      Read Full Guide <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Regular Articles Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Latest Articles ({filteredBlogs.length})
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Search Engine Indexed & Accredited
            </span>
          </div>

          {filteredBlogs.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl bg-card space-y-3">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-foreground">No articles match your criteria</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try searching for broader keywords like "NEP 2020", "Credits", or "AI".
              </p>
              <Button size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(searchQuery || selectedCategory !== "all" ? filteredBlogs : nonFeaturedPosts).map((post, idx) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="group flex flex-col justify-between rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  <Link to={`/blog/${post.slug}`} className="block overflow-hidden relative h-48 bg-muted">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px]">
                        {post.category}
                      </Badge>
                    </div>
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {post.readingTime}
                        </span>
                        <span>{new Date(post.publishedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>

                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      </h4>

                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-6 h-6 rounded-full object-cover border"
                        />
                        <span className="text-[11px] font-semibold text-foreground truncate max-w-[120px]">
                          {post.author.name}
                        </span>
                      </div>

                      <Link
                        to={`/blog/${post.slug}`}
                        className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        Read <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>

        {/* Enterprise Callout Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border border-primary/20 p-8 sm:p-12 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h3 className="text-xl sm:text-2xl font-black font-display text-foreground">
              Empower Your Campus With Orbit LMS
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Automate Academic Bank of Credits (ABC), dynamic student forensic watermarking, automated AI exam rubrics, and NEP 2020 curriculum pipelines.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button
              onClick={() => navigate("/#pricing")}
              className="bg-primary text-primary-foreground font-bold text-xs shadow-md"
            >
              Explore SaaS Plans
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/#contact")}
              className="text-xs font-bold"
            >
              Book Campus Demo
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8 px-4 text-center text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/#pricing" className="hover:text-foreground">Institutional Pricing</Link>
          <Link to="/blog" className="hover:text-foreground text-primary">Blog & Research</Link>
          <Link to="/#contact" className="hover:text-foreground">Contact</Link>
        </div>
        <p>© 2026 Orbit LMS. Built for NEP 2020 accredited Indian universities and colleges.</p>
      </footer>
    </div>
  );
}
