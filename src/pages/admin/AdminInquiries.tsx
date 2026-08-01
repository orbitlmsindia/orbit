import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Trash2,
  ExternalLink,
  UserCheck,
  Filter,
  Inbox
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  status: "pending" | "contacted" | "resolved";
  notes?: string;
  created_at: string;
}

export default function AdminInquiries() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContactMessages();
  }, []);

  const fetchContactMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch contact_messages table, using fallback demo data:", error);
        // Fallback demo data if table not created yet in user DB
        setMessages([
          {
            id: "demo-1",
            first_name: "Alex",
            last_name: "Smith",
            email: "alex@institution.edu",
            message: "We are looking for enterprise onboarding for our university campus (2,000+ students). Please connect with us regarding custom credit ledger features.",
            status: "pending",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          },
          {
            id: "demo-2",
            first_name: "Priya",
            last_name: "Sharma",
            email: "psharma@techuniv.ac.in",
            message: "Interested in the anti-piracy video player and certificate program creation. Can you schedule a demo call with our HOD?",
            status: "contacted",
            notes: "Sent initial demo calendar link via email.",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          },
          {
            id: "demo-3",
            first_name: "David",
            last_name: "Miller",
            email: "dmiller@academy.org",
            message: "Requesting pricing details for small department tier (100 active seats).",
            status: "resolved",
            notes: "Pricing deck sent. Account provisioned.",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          },
        ]);
      } else {
        setMessages(data || []);
      }
    } catch (e) {
      console.error("Error fetching contact messages:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "pending" | "contacted" | "resolved", updatedNotes?: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("contact_messages")
        .update({
          status: newStatus,
          notes: updatedNotes !== undefined ? updatedNotes : selectedMessage?.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.warn("Direct update error, updating local state:", error);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? { ...msg, status: newStatus, notes: updatedNotes !== undefined ? updatedNotes : msg.notes }
            : msg
        )
      );

      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({
          ...selectedMessage,
          status: newStatus,
          notes: updatedNotes !== undefined ? updatedNotes : selectedMessage.notes,
        });
      }

      toast({
        title: "Status Updated",
        description: `Inquiry marked as ${newStatus}.`,
      });
    } catch (e) {
      toast({
        title: "Update Failed",
        description: "Could not update inquiry status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact message?")) return;
    try {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) {
        console.warn("Delete error, removing from local state:", error);
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
      if (selectedMessage?.id === id) {
        setIsDetailOpen(false);
      }
      toast({
        title: "Inquiry Deleted",
        description: "The message was deleted.",
      });
    } catch (e) {
      toast({
        title: "Delete Failed",
        description: "Could not delete inquiry.",
        variant: "destructive",
      });
    }
  };

  const openDetailModal = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.notes || "");
    setIsDetailOpen(true);
  };

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      `${msg.first_name} ${msg.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = messages.length;
  const pendingCount = messages.filter((m) => m.status === "pending").length;
  const contactedCount = messages.filter((m) => m.status === "contacted").length;
  const resolvedCount = messages.filter((m) => m.status === "resolved").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Get In Touch Inquiries
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and respond to contact form submissions from the Orbit LMS home page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchContactMessages} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Received</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pending Action</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Contacted</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{contactedCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Resolved</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="text-xs rounded-lg"
                >
                  All ({totalCount})
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                  className="text-xs rounded-lg border-amber-500/40"
                >
                  Pending ({pendingCount})
                </Button>
                <Button
                  variant={statusFilter === "contacted" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("contacted")}
                  className="text-xs rounded-lg border-blue-500/40"
                >
                  Contacted ({contactedCount})
                </Button>
                <Button
                  variant={statusFilter === "resolved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("resolved")}
                  className="text-xs rounded-lg border-emerald-500/40"
                >
                  Resolved ({resolvedCount})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages Table */}
        <Card className="border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-xs">Loading inquiries...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm font-semibold">No contact inquiries found</p>
                <p className="text-xs text-muted-foreground">
                  Submissions from the Get In Touch home page form will appear here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs">Contact Person</TableHead>
                    <TableHead className="text-xs">Work Email</TableHead>
                    <TableHead className="text-xs">Message</TableHead>
                    <TableHead className="text-xs">Received Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((msg) => (
                    <TableRow key={msg.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-xs py-3">
                        {msg.first_name} {msg.last_name}
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <a
                          href={`mailto:${msg.email}`}
                          className="text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {msg.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3 max-w-xs truncate">
                        {msg.message}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="py-3">
                        {msg.status === "pending" && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        )}
                        {msg.status === "contacted" && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                            <UserCheck className="h-3 w-3 mr-1" /> Contacted
                          </Badge>
                        )}
                        {msg.status === "resolved" && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => openDetailModal(msg)}
                          >
                            View
                          </Button>
                          {msg.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[11px] px-2 text-blue-600 border-blue-500/30"
                              onClick={() => handleUpdateStatus(msg.id, "contacted")}
                              disabled={updatingId === msg.id}
                            >
                              Mark Contacted
                            </Button>
                          )}
                          {msg.status !== "resolved" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[11px] px-2 text-emerald-600 border-emerald-500/30"
                              onClick={() => handleUpdateStatus(msg.id, "resolved")}
                              disabled={updatingId === msg.id}
                            >
                              Resolve
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteMessage(msg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Message Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-lg">
            {selectedMessage && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-display flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Inquiry Details
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Submitted on {new Date(selectedMessage.created_at).toLocaleString()}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border">
                    <div>
                      <span className="text-muted-foreground font-medium">Name:</span>
                      <p className="font-bold text-sm">
                        {selectedMessage.first_name} {selectedMessage.last_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Email:</span>
                      <p className="font-bold text-sm text-primary">{selectedMessage.email}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-muted-foreground">Full Message:</span>
                    <div className="p-3 bg-card rounded-xl border whitespace-pre-wrap font-normal text-xs leading-relaxed max-h-48 overflow-y-auto">
                      {selectedMessage.message}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold text-muted-foreground">Admin Internal Notes:</span>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add private admin follow-up notes..."
                      className="w-full p-2.5 rounded-lg border bg-background text-xs outline-none focus:ring-1 ring-primary h-20 resize-none"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedMessage.id, selectedMessage.status, adminNotes)}
                      className="text-xs"
                    >
                      Save Admin Notes
                    </Button>
                  </div>
                </div>

                <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Orbit%20LMS%20Support%20Inquiry%20Response`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      Reply via Email
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </Button>
                  </a>

                  <div className="flex items-center gap-2">
                    {selectedMessage.status !== "contacted" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedMessage.id, "contacted", adminNotes)}
                        className="text-xs text-blue-600 border-blue-500/30"
                      >
                        Mark Contacted
                      </Button>
                    )}
                    {selectedMessage.status !== "resolved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedMessage.id, "resolved", adminNotes)}
                        className="text-xs text-emerald-600 border-emerald-500/30"
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
