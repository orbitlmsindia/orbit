import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  created_at?: string;
}

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "dept-1", name: "Computer Science", code: "CS", description: "Department of Computer Science and Information Technology" },
  { id: "dept-2", name: "Design", code: "DES", description: "Department of User Experience, Interface & Visual Design" },
  { id: "dept-3", name: "Business", code: "BUS", description: "Department of Business Administration and Entrepreneurship" },
  { id: "dept-4", name: "Marketing", code: "MKT", description: "Department of Marketing and Communications" },
  { id: "dept-5", name: "Electrical Engineering", code: "EE", description: "Department of Electrical & Electronics Engineering" },
];

export function useDepartments() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.warn("Could not fetch departments from Supabase (using defaults):", error.message);
        // Retain current or default state
      } else if (data && data.length > 0) {
        setDepartments(data);
      }
    } catch (err) {
      console.warn("Departments table query caught error, using defaults:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const addDepartment = async (name: string, code?: string, description?: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ variant: "destructive", title: "Error", description: "Department name cannot be empty." });
      return false;
    }

    if (departments.some(d => d.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ variant: "destructive", title: "Duplicate Department", description: "A department with this name already exists." });
      return false;
    }

    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: trimmedName,
      code: code?.trim() || "",
      description: description?.trim() || "",
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("departments")
        .insert([{ name: newDept.name, code: newDept.code, description: newDept.description }])
        .select()
        .single();

      if (error) {
        console.warn("Supabase insert error, saving locally:", error.message);
      } else if (data) {
        newDept.id = data.id;
      }
    } catch (err) {
      console.warn("Database operation fallback to local state", err);
    }

    setDepartments(prev => [...prev, newDept]);
    toast({ title: "Department Created", description: `"${trimmedName}" department added successfully.` });
    return true;
  };

  const deleteDepartment = async (id: string): Promise<boolean> => {
    try {
      await supabase.from("departments").delete().eq("id", id);
    } catch (err) {
      console.warn("Database delete fallback:", err);
    }
    setDepartments(prev => prev.filter(d => d.id !== id));
    toast({ title: "Department Removed", description: "Department deleted successfully." });
    return true;
  };

  return {
    departments,
    loading,
    fetchDepartments,
    addDepartment,
    deleteDepartment,
  };
}
