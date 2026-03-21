import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  BookOpen,
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  'tech', 'finance', 'creator', 'sports', 'music', 'business', 'science', 'other',
];

interface DirectoryEntry {
  id: string;
  target_name: string;
  target_slug: string;
  target_description: string | null;
  target_avatar_url: string | null;
  target_category: string | null;
  request_count: number;
  status: string;
  created_at: string;
}

interface Requester {
  id: string;
  requester_name: string;
  email: string;
  created_at: string;
}

const AdminDirectoryManager: React.FC = () => {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [loadingRequesters, setLoadingRequesters] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addSlug, setAddSlug] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addAvatarUrl, setAddAvatarUrl] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-directory', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.success) {
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Error fetching directory entries:', error);
      toast.error('Failed to load directory entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error('Name is required');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-directory', {
        body: {
          action: 'create',
          target_name: addName.trim(),
          target_slug: addSlug.trim() || undefined,
          target_description: addDescription.trim() || undefined,
          target_avatar_url: addAvatarUrl.trim() || undefined,
          target_category: addCategory || undefined,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Added "${addName.trim()}" to directory`);
        setAddName('');
        setAddSlug('');
        setAddDescription('');
        setAddAvatarUrl('');
        setAddCategory('');
        setShowAddForm(false);
        fetchEntries();
      } else {
        toast.error(data?.error || 'Failed to add entry');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to add entry');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from directory?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-directory', {
        body: { action: 'remove', id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Removed "${name}"`);
        fetchEntries();
      }
    } catch (error) {
      toast.error('Failed to remove entry');
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    setLoadingRequesters(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-directory', {
        body: { action: 'requesters', id },
      });
      if (error) throw error;
      setRequesters(data?.requesters || []);
    } catch (error) {
      console.error('Error fetching requesters:', error);
      setRequesters([]);
    } finally {
      setLoadingRequesters(false);
    }
  };

  const slugify = (text: string) => {
    return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Active</Badge>;
      case 'invited': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Invited</Badge>;
      case 'onboarded': return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30">Onboarded</Badge>;
      case 'removed': return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/30">Removed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-green-500" />
          <CardTitle className="text-green-500 text-lg">Directory Management</CardTitle>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-500 hover:bg-green-400 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Profile
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="p-4 border border-green-500/30 rounded-md space-y-3 bg-slate-50 dark:bg-slate-950">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Name *</Label>
                <Input
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value);
                    if (!addSlug) setAddSlug(slugify(e.target.value));
                  }}
                  placeholder="Elon Musk"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Slug</Label>
                <Input
                  value={addSlug}
                  onChange={(e) => setAddSlug(e.target.value)}
                  placeholder="elon-musk"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Description</Label>
              <Textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="CEO of Tesla, SpaceX"
                rows={2}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Category</Label>
                <Select value={addCategory} onValueChange={setAddCategory}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Avatar URL</Label>
                <Input
                  value={addAvatarUrl}
                  onChange={(e) => setAddAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={adding} size="sm" className="bg-green-500 hover:bg-green-400 text-white">
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Add to Directory
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="border-slate-200 dark:border-slate-700">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Entries Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-green-500" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm">No directory entries yet. Add one above.</p>
        ) : (
          <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5">
                  <TableHead className="text-green-500">Name</TableHead>
                  <TableHead className="text-green-500">Category</TableHead>
                  <TableHead className="text-green-500 text-center">Requests</TableHead>
                  <TableHead className="text-green-500">Status</TableHead>
                  <TableHead className="text-green-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow
                      className="border-slate-200 dark:border-slate-700 hover:bg-green-500/5 cursor-pointer"
                      onClick={() => handleExpand(entry.id)}
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          {expandedId === entry.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          {entry.target_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.target_category && (
                          <span className="text-xs font-mono text-green-500 bg-green-500/10 rounded px-1.5 py-0.5">
                            {entry.target_category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-500">
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-mono text-sm">{entry.request_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(entry.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleRemove(entry.id, entry.target_name); }}
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 p-0"
                          disabled={entry.status === 'removed'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded: Requesters list */}
                    {expandedId === entry.id && (
                      <TableRow className="bg-slate-50 dark:bg-slate-950">
                        <TableCell colSpan={5} className="p-4">
                          {loadingRequesters ? (
                            <div className="flex items-center gap-2 py-2">
                              <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                              <span className="text-sm text-slate-400">Loading requesters...</span>
                            </div>
                          ) : requesters.length === 0 ? (
                            <p className="text-sm text-slate-400 py-2">No requesters yet.</p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-mono text-slate-400 mb-2">{requesters.length} requester(s)</p>
                              {requesters.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0">
                                  <span className="text-slate-900 dark:text-slate-100 font-medium min-w-[120px]">{r.requester_name}</span>
                                  <span className="text-slate-400 font-mono text-xs">{r.email}</span>
                                  <span className="text-slate-400 text-xs ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminDirectoryManager;
