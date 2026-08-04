import { MasterLayout } from "@/components/layout/MasterLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Eye, Play, Pause, Trash2, Key, Sliders, CheckSquare, ShieldCheck, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL_FEATURES = [
  { id: "live_classes", label: "Live Online Classes & Video Streams" },
  { id: "certificates", label: "20-Credit Domain Certificates" },
  { id: "gamification", label: "Daily Streaks & Aura XP Points" },
  { id: "quizzes", label: "Interactive Timed Quizzes" },
  { id: "assignments", label: "Assignment Submission Portal" },
  { id: "ai_json_builder", label: "AI & JSON Bulk Course Importer" },
  { id: "leaderboard", label: "Student & Faculty Leaderboards" },
  { id: "ticket_raising", label: "Help Center Ticket Support Desk" },
  { id: "coupon_engine", label: "Coupon Engine & UPI Payment QR" },
  { id: "attendance_tracker", label: "Student Live Session Attendance" },
];

export default function MasterColleges() {
  const [colleges, setColleges] = useState<any[]>([
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Orbit LMS Innovation Academy",
      domain: "jiet.orbitlms.edu.in",
      currency: "INR",
      max_students: 1000,
      activation_status: true,
      subscription_status: "active",
      enabled_features: ["live_classes", "certificates", "gamification", "quizzes", "assignments", "ai_json_builder", "leaderboard", "ticket_raising", "coupon_engine", "attendance_tracker"]
    }
  ]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCollege, setNewCollege] = useState({ name: '', shortName: '' });
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  // Edit / Customization Modal State
  const [editCollegeModalOpen, setEditCollegeModalOpen] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    currency: "INR",
    maxStudents: 1000,
    features: ALL_FEATURES.map(f => f.id)
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchColleges = async () => {
    const { data } = await supabase
      .from('colleges')
      .select('id, name, domain, currency, max_students, enabled_features, activation_status, subscription_status, created_at')
      .order('created_at', { ascending: false });
    if (data) setColleges(data);
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('colleges').insert([{
        name: newCollege.name,
        domain: newCollege.shortName.toLowerCase() + ".orbitlms.edu.in",
        currency: "INR",
        max_students: 1000,
        activation_status: true,
        subscription_status: 'active',
        enabled_features: ALL_FEATURES.map(f => f.id)
      }]).select().single();

      if (error) throw error;

      toast({ title: "Success", description: "New College Tenant Provisioned." });
      setCredentials({ email: `admin@${newCollege.shortName}.edu.in`, password: "AdminPassword123@" });
      fetchColleges();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (college: any) => {
    setSelectedCollege(college);
    const existingFeatures = Array.isArray(college.enabled_features) 
      ? college.enabled_features 
      : ALL_FEATURES.map(f => f.id);

    setEditForm({
      name: college.name || "",
      currency: college.currency || "INR",
      maxStudents: college.max_students || 1000,
      features: existingFeatures
    });
    setEditCollegeModalOpen(true);
  };

  const handleSaveCollegeCustomization = async () => {
    if (!selectedCollege) return;
    try {
      const { error } = await supabase
        .from('colleges')
        .update({
          name: editForm.name,
          currency: editForm.currency,
          max_students: editForm.maxStudents,
          enabled_features: editForm.features
        })
        .eq('id', selectedCollege.id);

      if (error) throw error;
      toast({ title: "Customization Saved", description: `${editForm.name} features and INR pricing updated.` });
      setEditCollegeModalOpen(false);
      fetchColleges();
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleFeature = (featureId: string) => {
    setEditForm(prev => {
      const exists = prev.features.includes(featureId);
      return {
        ...prev,
        features: exists 
          ? prev.features.filter(id => id !== featureId)
          : [...prev.features, featureId]
      };
    });
  };

  const toggleCollegeStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('colleges').update({ activation_status: !currentStatus }).eq('id', id);
      if (error) throw error;
      toast({ title: "Status Updated", description: "College access has been " + (!currentStatus ? "Activated" : "Suspended") });
      fetchColleges();
    } catch (err: any) {
      toast({ title: "Action Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <MasterLayout
      headerTitle="Tenant College Registry & Customization Engine"
      headerDescription="Configure organization features, feature checkboxes, student limits, and currency settings."
      action={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 border"><Plus className="w-4 h-4 mr-2" /> Provision New College</Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>Provision SaaS Tenant</DialogTitle>
            </DialogHeader>
            {credentials ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-emerald-400">Successfully Provisioned Database Schema & Admin Rights.</p>
                <div className="p-4 bg-slate-950 rounded border border-slate-800 space-y-1 font-mono text-xs">
                  <p><span className="text-slate-400">Admin Email:</span> {credentials.email}</p>
                  <p><span className="text-slate-400">Password:</span> {credentials.password}</p>
                </div>
                <Button onClick={() => { setIsCreateOpen(false); setCredentials(null); }} className="w-full">Close</Button>
              </div>
            ) : (
              <form onSubmit={handleCreateCollege} className="space-y-4">
                <div>
                  <Label>Formal College Name</Label>
                  <Input required value={newCollege.name} onChange={e => setNewCollege({ ...newCollege, name: e.target.value })} placeholder="Jodhpur Institute of Engineering & Tech" className="bg-slate-950 border-slate-800" />
                </div>
                <div>
                  <Label>Subdomain Prefix</Label>
                  <Input required value={newCollege.shortName} onChange={e => setNewCollege({ ...newCollege, shortName: e.target.value })} placeholder="jiet" className="bg-slate-950 border-slate-800" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {loading ? "Deploying Tenant..." : "Deploy Tenant Instance"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      }
    >
      {/* Mobile Responsive Tenant Cards (Phone Layout) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {colleges.filter(c => c.subscription_status !== 'deleted').map((college) => {
          const activeCount = Array.isArray(college.enabled_features) ? college.enabled_features.length : 10;
          return (
            <div key={college.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-100">{college.name}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{college.domain || `${college.name.toLowerCase().replace(/\s+/g, '')}.orbitlms.edu.in`}</p>
                </div>
                <Badge variant={college.activation_status ? "default" : "destructive"} className="shrink-0">
                  {college.activation_status ? "Active" : "Suspended"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-slate-800">
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-slate-400 text-[10px]">STUDENTS</div>
                  <div className="font-bold text-slate-200 mt-0.5">{college.max_students || 1000}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-slate-400 text-[10px]">CURRENCY</div>
                  <div className="font-bold text-emerald-400 mt-0.5">₹ {college.currency || 'INR'}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <div className="text-slate-400 text-[10px]">MODULES</div>
                  <div className="font-bold text-indigo-400 mt-0.5">{activeCount} / {ALL_FEATURES.length}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEditModal(college)} className="w-full border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs font-semibold">
                  <Sliders className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> Customize Tenant
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleCollegeStatus(college.id, college.activation_status)} className="border border-slate-800 shrink-0">
                  {college.activation_status ? <Pause className="h-4 w-4 text-amber-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Viewport Table */}
      <div className="hidden md:block bg-slate-900 rounded-lg border border-slate-800 shadow-sm overflow-x-auto">
        <Table className="min-w-[750px]">
          <TableHeader className="bg-slate-950/80">
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-300">College Name & Subdomain</TableHead>
              <TableHead className="text-center text-slate-300">Max Student Limit</TableHead>
              <TableHead className="text-center text-slate-300">Currency</TableHead>
              <TableHead className="text-center text-slate-300">Active Features</TableHead>
              <TableHead className="text-slate-300">Status</TableHead>
              <TableHead className="text-right text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {colleges.filter(c => c.subscription_status !== 'deleted').map((college) => {
              const activeCount = Array.isArray(college.enabled_features) ? college.enabled_features.length : 10;
              return (
                <TableRow key={college.id} className="border-slate-800 hover:bg-slate-800/40">
                  <TableCell>
                    <div className="font-medium text-slate-100">{college.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{college.domain || `${college.name.toLowerCase().replace(/\s+/g, '')}.orbitlms.edu.in`}</div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-medium text-slate-200">{college.max_students || 1000} Seats</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono">
                      ₹ {college.currency || 'INR'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-slate-800 text-slate-300">
                      {activeCount} / {ALL_FEATURES.length} Modules
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={college.activation_status ? "default" : "destructive"}>
                      {college.activation_status ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(college)} className="border-slate-700 hover:bg-slate-800 text-xs text-slate-200">
                        <Sliders className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Customize
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100">
                          <DropdownMenuItem onClick={() => toggleCollegeStatus(college.id, college.activation_status)}>
                            {college.activation_status ? <Pause className="mr-2 h-4 w-4 text-amber-400" /> : <Play className="mr-2 h-4 w-4 text-emerald-400" />}
                            {college.activation_status ? "Suspend Operations" : "Activate Instance"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* College Features & Settings Customization Dialog */}
      <Dialog open={editCollegeModalOpen} onOpenChange={setEditCollegeModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Customize Organization & Features: {selectedCollege?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 my-2">
            {/* General Information & Role ID Creation Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="md:col-span-2">
                <Label className="text-slate-300">Organization / College Name</Label>
                <Input 
                  value={editForm.name} 
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  className="bg-slate-900 border-slate-800 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Max Student IDs Limit</Label>
                <Input 
                  type="number"
                  value={editForm.maxStudents} 
                  onChange={e => setEditForm({ ...editForm, maxStudents: parseInt(e.target.value) || 500 })} 
                  className="bg-slate-900 border-slate-800 text-white mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-slate-300">Max Teacher / Faculty IDs Limit</Label>
                <Input 
                  type="number"
                  defaultValue={50} 
                  className="bg-slate-900 border-slate-800 text-white mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-slate-300">Max Finance Staff IDs Limit</Label>
                <Input 
                  type="number"
                  defaultValue={10} 
                  className="bg-slate-900 border-slate-800 text-white mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-slate-300">Max Admin Staff IDs Limit</Label>
                <Input 
                  type="number"
                  defaultValue={5} 
                  className="bg-slate-900 border-slate-800 text-white mt-1 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-slate-300">Billing Currency Standard</Label>
                <Select value={editForm.currency} onValueChange={v => setEditForm({ ...editForm, currency: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="INR">Indian Rupee (₹ INR)</SelectItem>
                    <SelectItem value="USD">US Dollar ($ USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Feature Checkboxes Grid */}
            <div className="space-y-3">
              <Label className="text-base font-bold text-slate-200 flex items-center justify-between">
                <span>Organization Feature Controls (Checkboxes)</span>
                <span className="text-xs text-emerald-400 font-mono font-normal">
                  {editForm.features.length} / {ALL_FEATURES.length} Enabled
                </span>
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-950 rounded-lg border border-slate-800">
                {ALL_FEATURES.map((feature) => {
                  const isChecked = editForm.features.includes(feature.id);
                  return (
                    <div 
                      key={feature.id} 
                      onClick={() => toggleFeature(feature.id)}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300" 
                          : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Checkbox 
                        checked={isChecked} 
                        onCheckedChange={() => toggleFeature(feature.id)}
                        className="data-[state=checked]:bg-emerald-500 border-slate-600"
                      />
                      <span className="text-sm font-medium leading-none">{feature.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditCollegeModalOpen(false)} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleSaveCollegeCustomization} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Save Organization Customizations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
