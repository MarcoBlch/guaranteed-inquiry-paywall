import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageNav from "@/components/layout/PageNav";
import DirectoryCard from "@/components/directory/DirectoryCard";
import RequestAccessModal from "@/components/directory/RequestAccessModal";
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { Search, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All categories' },
  { value: 'tech', label: 'Tech' },
  { value: 'finance', label: 'Finance' },
  { value: 'creator', label: 'Creator' },
  { value: 'sports', label: 'Sports' },
  { value: 'music', label: 'Music' },
  { value: 'business', label: 'Business' },
  { value: 'science', label: 'Science' },
  { value: 'other', label: 'Other' },
];

interface DirectoryProfile {
  id: string;
  target_name: string;
  target_slug: string;
  target_description: string | null;
  target_avatar_url: string | null;
  target_category: string | null;
  request_count: number;
}

const PAGE_SIZE = 12;

const Directory = () => {
  const navigate = useNavigate();
  usePageViewTracking('/directory');

  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<{ name: string; slug: string }>({ name: '', slug: '' });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProfiles = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: PAGE_SIZE.toString(),
      });

      if (category !== 'all') params.append('category', category);
      if (searchDebounce.trim()) params.append('search', searchDebounce.trim());

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-directory-profiles?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();

      if (data.success) {
        setProfiles(prev => append ? [...prev, ...data.profiles] : data.profiles);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching directory:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, searchDebounce]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchProfiles(1);
  }, [fetchProfiles]);

  const handleLoadMore = () => {
    fetchProfiles(page + 1, true);
  };

  const handleRequestAccess = (targetName: string, targetSlug: string) => {
    setSelectedTarget({ name: targetName, slug: targetSlug });
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageNav
        links={[
          { label: 'Directory', href: '/directory' },
          { label: 'FAQ', href: '/faq' },
        ]}
        showCTA
        ctaLabel="I'm a receiver"
        onCTAClick={() => navigate('/auth?from=directory')}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="font-display italic text-green-500 text-3xl sm:text-4xl lg:text-5xl mb-3">
            DIRECTORY
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Signal demand for the people you want to reach. When enough people request access, we invite them to join FastPass.
          </p>
        </div>

        {/* "I'm a receiver" banner */}
        <div className="border border-green-500/30 rounded-md p-4 sm:p-6 text-center mb-8">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
            Are you a creator, expert, or public figure?
          </p>
          <Button
            className="bg-green-500 hover:bg-green-400 text-white font-bold transition-colors"
            onClick={() => navigate('/auth?from=directory')}
          >
            Claim your profile & start receiving paid messages
          </Button>
        </div>

        {/* Search + Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:border-green-500"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-mono">
            {total} {total === 1 ? 'profile' : 'profiles'} found
          </p>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-green-500" />
            <span className="ml-2 text-slate-500 dark:text-slate-400 text-sm">Loading directory...</span>
          </div>
        ) : profiles.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <p className="text-slate-500 dark:text-slate-400 text-base mb-2">
              No profiles found
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              {searchDebounce || category !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Check back soon — new profiles are added regularly.'}
            </p>
          </div>
        ) : (
          <>
            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => (
                <DirectoryCard
                  key={profile.id}
                  targetName={profile.target_name}
                  targetSlug={profile.target_slug}
                  targetDescription={profile.target_description}
                  targetAvatarUrl={profile.target_avatar_url}
                  targetCategory={profile.target_category}
                  requestCount={profile.request_count}
                  onRequestAccess={handleRequestAccess}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-green-500 hover:text-green-500"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs sm:text-sm px-4 border-t border-slate-200 dark:border-slate-800">
        <p>&copy; {new Date().getFullYear()} FastPass</p>
      </footer>

      {/* Request Access Modal */}
      <RequestAccessModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        targetName={selectedTarget.name}
        targetSlug={selectedTarget.slug}
      />
    </div>
  );
};

export default Directory;
