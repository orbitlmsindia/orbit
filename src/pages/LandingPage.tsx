import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookOpen, Users, Trophy, Rocket, MessageCircle, Mail, MapPin } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed w-full z-50 glass border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Orbit Launchpad
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("home")} className="text-sm font-medium hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection("about")} className="text-sm font-medium hover:text-primary transition-colors">About Us</button>
            <button onClick={() => scrollToSection("features")} className="text-sm font-medium hover:text-primary transition-colors">Features</button>
            <button onClick={() => scrollToSection("contact")} className="text-sm font-medium hover:text-primary transition-colors">Contact Us</button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button onClick={() => navigate("/register")} className="bg-primary hover:bg-primary/90">
              Register
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold font-display mb-6 leading-tight">
              Launch Your Career with <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Orbit Launchpad
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Empowering the Digital University of JIET Universe. Experience a next-generation Learning Management System designed for your success.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-lg" onClick={() => navigate("/register")}>
                Get Started
                <Rocket className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => scrollToSection("about")}>
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">About Orbit Launchpad</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Orbit Launchpad is a comprehensive platform built exclusively for JIET College. We bridge the gap between students, mentors, and academic excellence through technology.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Our mission is to provide a seamless digital environment where learning thrives, mentorship is accessible, and progress is tracked effectively.
              </p>
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="p-4 bg-card rounded-lg border shadow-sm">
                  <div className="font-bold text-3xl text-primary mb-1">1000+</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
                <div className="p-4 bg-card rounded-lg border shadow-sm">
                  <div className="font-bold text-3xl text-accent mb-1">50+</div>
                  <div className="text-sm text-muted-foreground">Mentors</div>
                </div>
              </div>
            </motion.div>
            <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <div className="text-center p-8 glass rounded-xl max-w-xs">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg">Community Driven</h3>
                <p className="text-sm text-muted-foreground">Empowering JIET students together.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage your academic journey in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <BookOpen className="h-8 w-8 text-blue-500" />,
                title: "LMS System",
                description: "Access course materials, assignments, and lectures anytime, anywhere."
              },
              {
                icon: <Users className="h-8 w-8 text-green-500" />,
                title: "Mentorship",
                description: "Connect with experienced mentors for guidance and career advice."
              },
              {
                icon: <Trophy className="h-8 w-8 text-amber-500" />,
                title: "Progress Tracking",
                description: "Monitor your grades, attendance, and achievements in real-time."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="p-8 rounded-2xl bg-card border hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="mb-4 p-3 bg-secondary rounded-lg w-fit">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="py-20 px-4 bg-background border-t">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-6">Contact Us</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Have questions or suggestions? We'd love to hear from you. Reach out to the JIET administration or Orbit Launchpad team.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email Us</h4>
                    <p className="text-muted-foreground">support@orbit-jiet.edu</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Visit Us</h4>
                    <p className="text-muted-foreground">JIET College Campus, Jodhpur</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Live Chat</h4>
                    <p className="text-muted-foreground">Available Mon-Fri, 9am - 5pm</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-secondary/20 border">
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <input className="w-full p-3 rounded-lg border bg-background focus:ring-2 ring-primary outline-none" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <input className="w-full p-3 rounded-lg border bg-background focus:ring-2 ring-primary outline-none" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <input className="w-full p-3 rounded-lg border bg-background focus:ring-2 ring-primary outline-none" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea className="w-full p-3 rounded-lg border bg-background focus:ring-2 ring-primary outline-none h-32 resize-none" placeholder="How can we help?" />
                </div>
                <Button className="w-full h-12">Send Message</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card text-muted-foreground text-sm">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} Orbit Launchpad - JIET College. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
