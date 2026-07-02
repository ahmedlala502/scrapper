import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Plus,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Edit3,
  Trash2,
  X,
  Instagram,
  Check,
  Loader2,
  Link2,
  AlertCircle,
  FileText,
  Hash,
  Video,
  Camera,
  Play,
  Archive,
  Clock,
  TrendingUp,
  ChevronDown,
  Upload,
  Download,
  Globe,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Layers,
  Zap,
  ArrowRight,
  Bookmark,
  Star,
  Grid,
  List,
  Sliders,
  Trash,
  PlusCircle,
  Save,
  FolderOpen,
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Platform = 'instagram' | 'snapchat' | 'tiktok';
type ContentType = 'post' | 'story' | 'video' | 'snap' | 'reel';
type Status = 'active' | 'archived' | 'pending';
type DiscoveryViewMode = 'grid' | 'list';

interface CoverageLink {
  id: string;
  platform: Platform;
  username: string;
  mention_or_caption: string;
  content_type: ContentType;
  coverage_url: string;
  campaign_name: string | null;
  notes: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

interface FormData {
  platform: Platform;
  username: string;
  mention_or_caption: string;
  content_type: ContentType;
  coverage_url: string;
  campaign_name: string;
  notes: string;
  status: Status;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
  platform: string;
  contentType: string;
  image?: string;
  username?: string;
}

interface ScrapeResult {
  title: string;
  description: string;
  image: string | null;
  type: string;
  platform: string;
  username: string | null;
  url: string;
}

interface VerifyResult {
  valid: boolean;
  status: number;
  platform: string;
  contentType: string;
}

const platformConfig = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-instagram',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
  snapchat: {
    label: 'Snapchat',
    icon: Camera,
    color: 'bg-gradient-snapchat',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  tiktok: {
    label: 'TikTok',
    icon: Play,
    color: 'bg-gradient-tiktok',
    textColor: 'text-black',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
};

const contentTypeConfig: Record<ContentType, { label: string; icon: typeof FileText }> = {
  post: { label: 'Post', icon: FileText },
  story: { label: 'Story', icon: Camera },
  video: { label: 'Video', icon: Video },
  snap: { label: 'Snap', icon: Camera },
  reel: { label: 'Reel', icon: Play },
};

const statusConfig: Record<Status, { label: string; color: string; icon: typeof Check }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', icon: Check },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-600', icon: Archive },
};

const initialFormData: FormData = {
  platform: 'instagram',
  username: '',
  mention_or_caption: '',
  content_type: 'post',
  coverage_url: '',
  campaign_name: '',
  notes: '',
  status: 'active',
};

const getContentTypeOptions = (platform: Platform): ContentType[] => {
  switch (platform) {
    case 'instagram':
      return ['post', 'story', 'reel', 'video'];
    case 'snapchat':
      return ['snap', 'story'];
    case 'tiktok':
      return ['video', 'post'];
    default:
      return ['post'];
  }
};

function App() {
  const [coverageLinks, setCoverageLinks] = useState<CoverageLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<CoverageLink | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Discovery modal state
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [discoveryPlatform, setDiscoveryPlatform] = useState<Platform | 'all'>('all');
  const [discoveryUsername, setDiscoveryUsername] = useState('');
  const [discoveryContentType, setDiscoveryContentType] = useState<ContentType | 'all'>('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scrapePreview, setScrapePreview] = useState<ScrapeResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [urlVerification, setUrlVerification] = useState<VerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());
  const [discoveryViewMode, setDiscoveryViewMode] = useState<DiscoveryViewMode>('grid');
  const [urlScraper, setUrlScraper] = useState('');
  const [scrapedUrls, setScrapedUrls] = useState<SearchResult[]>([]);
  const [savedSearches, setSavedSearches] = useState<{ query: string; platform: string; timestamp: string }[]>([]);
  const [discoveryTab, setDiscoveryTab] = useState<'search' | 'scraper' | 'saved'>('search');

  // Bulk operations state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportUrl, setBulkImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Partial<CoverageLink>[]>([]);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCoverageLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('coverage_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (platformFilter !== 'all') {
        query = query.eq('platform', platformFilter);
      }
      if (contentTypeFilter !== 'all') {
        query = query.eq('content_type', contentTypeFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let filteredData = data || [];

      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        filteredData = filteredData.filter(
          (link) =>
            link.username.toLowerCase().includes(queryLower) ||
            link.mention_or_caption.toLowerCase().includes(queryLower) ||
            link.coverage_url.toLowerCase().includes(queryLower) ||
            (link.campaign_name && link.campaign_name.toLowerCase().includes(queryLower))
        );
      }

      setCoverageLinks(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coverage links');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, platformFilter, statusFilter, contentTypeFilter]);

  useEffect(() => {
    fetchCoverageLinks();
  }, [fetchCoverageLinks]);

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gc_saved_searches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  // Discovery functions
  const handleDiscoverySearch = async () => {
    if (!discoveryQuery.trim() && !discoveryUsername.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedResults(new Set());
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/coverage-discovery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            action: 'search',
            query: discoveryQuery,
            platform: discoveryPlatform,
            username: discoveryUsername,
          }),
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      // Filter by content type if specified
      let results = data.results || [];
      if (discoveryContentType !== 'all') {
        results = results.filter((r: SearchResult) => r.contentType === discoveryContentType);
      }

      setSearchResults(results);

      // Save to recent searches
      const newSavedSearch = {
        query: discoveryQuery,
        platform: discoveryPlatform,
        timestamp: new Date().toISOString(),
      };
      const updatedSavedSearches = [newSavedSearch, ...savedSearches.slice(0, 9)];
      setSavedSearches(updatedSavedSearches);
      localStorage.setItem('gc_saved_searches', JSON.stringify(updatedSavedSearches));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleScrapeUrl = async (url: string): Promise<ScrapeResult | null> => {
    setIsScraping(true);
    setScrapePreview(null);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/coverage-discovery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            action: 'scrape',
            url,
          }),
        }
      );

      if (!response.ok) throw new Error('Scrape failed');

      const data = await response.json();
      setScrapePreview(data.result);
      return data.result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scrape URL');
      return null;
    } finally {
      setIsScraping(false);
    }
  };

  const handleVerifyUrl = async (url: string) => {
    setIsVerifying(true);
    setUrlVerification(null);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/coverage-discovery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            action: 'verify',
            url,
          }),
        }
      );

      if (!response.ok) throw new Error('Verification failed');

      const data = await response.json();
      setUrlVerification(data);
    } catch {
      setUrlVerification({ valid: false, status: 0, platform: 'unknown', contentType: 'post' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddScrapedUrl = async () => {
    if (!urlScraper.trim()) return;

    setIsScraping(true);
    try {
      const result = await handleScrapeUrl(urlScraper);
      if (result) {
        const newResult: SearchResult = {
          title: result.title,
          url: result.url,
          description: result.description,
          platform: result.platform,
          contentType: result.type,
          image: result.image || undefined,
          username: result.username || undefined,
        };
        setScrapedUrls((prev) => [newResult, ...prev]);
        setUrlScraper('');
      }
    } catch (err) {
      setError('Failed to scrape URL');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    setFormData({
      ...initialFormData,
      coverage_url: result.url,
      platform: result.platform as Platform || 'instagram',
      content_type: result.contentType as ContentType || 'post',
      username: result.username || '',
      mention_or_caption: result.title || '',
    });
    setIsDiscoveryOpen(false);
    setIsModalOpen(true);
  };

  const handleUseScrapedData = () => {
    if (scrapePreview) {
      setFormData((prev) => ({
        ...prev,
        username: scrapePreview.username || prev.username,
        mention_or_caption: scrapePreview.title || prev.mention_or_caption,
        notes: scrapePreview.description || prev.notes,
        platform: scrapePreview.platform as Platform || prev.platform,
      }));
    }
    setScrapePreview(null);
  };

  // Toggle result selection
  const toggleResultSelection = (index: number) => {
    const newSet = new Set(selectedResults);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedResults(newSet);
  };

  const toggleAllResults = () => {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map((_, i) => i)));
    }
  };

  // Export discovery results
  const exportDiscoveryResults = (results: SearchResult[], filename: string) => {
    const headers = ['url', 'title', 'description', 'platform', 'content_type', 'username'];
    const csvRows = [headers.join(',')];

    results.forEach((result) => {
      const row = [
        `"${result.url.replace(/"/g, '""')}"`,
        `"${(result.title || '').replace(/"/g, '""')}"`,
        `"${(result.description || '').replace(/"/g, '""')}"`,
        result.platform || 'unknown',
        result.contentType || 'post',
        result.username || '',
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSelectedResults = () => {
    const selected = searchResults.filter((_, i) => selectedResults.has(i));
    exportDiscoveryResults(selected, `discovery_results_selected_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportAllResults = () => {
    exportDiscoveryResults(searchResults, `discovery_results_all_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Batch import selected results
  const handleBatchImportSelected = async () => {
    const selected = searchResults.filter((_, i) => selectedResults.has(i));
    if (selected.length === 0) return;

    setIsImporting(true);
    try {
      const insertData = selected.map((result) => ({
        platform: result.platform as Platform || 'instagram',
        username: result.username || 'unknown',
        mention_or_caption: result.title || result.description || '',
        content_type: result.contentType as ContentType || 'post',
        coverage_url: result.url,
        status: 'pending' as Status,
      }));

      const { error: insertError } = await supabase
        .from('coverage_links')
        .insert(insertData);

      if (insertError) throw insertError;

      setSelectedResults(new Set());
      setIsDiscoveryOpen(false);
      fetchCoverageLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Load saved search
  const handleLoadSavedSearch = (saved: { query: string; platform: string }) => {
    setDiscoveryQuery(saved.query);
    setDiscoveryPlatform(saved.platform as Platform | 'all');
    setDiscoveryTab('search');
    handleDiscoverySearch();
  };

  // Clear saved searches
  const handleClearSavedSearches = () => {
    setSavedSearches([]);
    localStorage.removeItem('gc_saved_searches');
  };

  // Bulk import functions
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkImportText(text);
      parseImportPreview(text);
    };
    reader.readAsText(file);
  };

  const parseImportPreview = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return;

    const hasHeader = lines[0].toLowerCase().includes('platform') || lines[0].toLowerCase().includes('url');
    const startIndex = hasHeader ? 1 : 0;

    const preview: Partial<CoverageLink>[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);

      if (parts.length >= 3) {
        const platform = parts[0]?.toLowerCase() as Platform;
        const username = parts[1];
        const url = parts[2];
        const caption = parts[3] || '';
        const contentType = parts[4]?.toLowerCase() as ContentType || 'post';
        const campaign = parts[5] || '';
        const status = parts[6]?.toLowerCase() as Status || 'active';

        if (['instagram', 'snapchat', 'tiktok'].includes(platform) && url) {
          preview.push({
            platform,
            username,
            coverage_url: url,
            mention_or_caption: caption,
            content_type: contentType,
            campaign_name: campaign,
            status,
          });
        }
      }
    }

    setImportPreview(preview);
  };

  const handleBulkImport = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    try {
      const { error: insertError } = await supabase
        .from('coverage_links')
        .insert(importPreview.map((item) => ({
          platform: item.platform,
          username: item.username || '',
          mention_or_caption: item.mention_or_caption || '',
          content_type: item.content_type || 'post',
          coverage_url: item.coverage_url || '',
          campaign_name: item.campaign_name || null,
          status: item.status || 'active',
        })));

      if (insertError) throw insertError;

      setIsBulkImportOpen(false);
      setBulkImportText('');
      setImportPreview([]);
      fetchCoverageLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Export functions
  const handleExportCsv = () => {
    const linksToExport = selectMode && selectedForExport.size > 0
      ? coverageLinks.filter((l) => selectedForExport.has(l.id))
      : coverageLinks;

    if (linksToExport.length === 0) return;

    const headers = ['platform', 'username', 'coverage_url', 'mention_or_caption', 'content_type', 'campaign_name', 'status', 'notes', 'created_at'];
    const csvRows = [headers.join(',')];

    linksToExport.forEach((link) => {
      const row = [
        link.platform,
        `"${link.username.replace(/"/g, '""')}"`,
        `"${link.coverage_url.replace(/"/g, '""')}"`,
        `"${link.mention_or_caption.replace(/"/g, '""')}"`,
        link.content_type,
        `"${(link.campaign_name || '').replace(/"/g, '""')}"`,
        link.status,
        `"${(link.notes || '').replace(/"/g, '""')}"`,
        link.created_at,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coverage_links_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setSelectMode(false);
    setSelectedForExport(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedForExport.size === coverageLinks.length) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(coverageLinks.map((l) => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedForExport);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForExport(newSet);
  };

  const handleOpenModal = (link?: CoverageLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        platform: link.platform,
        username: link.username,
        mention_or_caption: link.mention_or_caption,
        content_type: link.content_type,
        coverage_url: link.coverage_url,
        campaign_name: link.campaign_name || '',
        notes: link.notes || '',
        status: link.status,
      });
    } else {
      setEditingLink(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setScrapePreview(null);
    setUrlVerification(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLink(null);
    setFormData(initialFormData);
    setFormErrors({});
    setScrapePreview(null);
    setUrlVerification(null);
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    if (!formData.mention_or_caption.trim()) {
      errors.mention_or_caption = 'Mention or caption is required';
    }
    if (!formData.coverage_url.trim()) {
      errors.coverage_url = 'Coverage URL is required';
    } else {
      try {
        new URL(formData.coverage_url);
      } catch {
        errors.coverage_url = 'Please enter a valid URL';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        platform: formData.platform,
        username: formData.username.trim(),
        mention_or_caption: formData.mention_or_caption.trim(),
        content_type: formData.content_type,
        coverage_url: formData.coverage_url.trim(),
        campaign_name: formData.campaign_name.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
      };

      if (editingLink) {
        const { error: updateError } = await supabase
          .from('coverage_links')
          .update(payload)
          .eq('id', editingLink.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('coverage_links')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      handleCloseModal();
      fetchCoverageLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save coverage link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('coverage_links')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      setDeleteConfirmId(null);
      fetchCoverageLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete coverage link');
    }
  };

  const handleCopyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Failed to copy URL');
    }
  };

  const handlePlatformChange = (platform: Platform) => {
    const validContentTypes = getContentTypeOptions(platform);
    setFormData((prev) => ({
      ...prev,
      platform,
      content_type: validContentTypes.includes(prev.content_type)
        ? prev.content_type
        : validContentTypes[0],
    }));
  };

  // Auto-scrape when URL changes
  const debouncedScrape = useCallback((url: string) => {
    if (url && url.startsWith('http')) {
      handleScrapeUrl(url);
      handleVerifyUrl(url);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.coverage_url) {
        debouncedScrape(formData.coverage_url);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.coverage_url, debouncedScrape]);

  const stats = {
    total: coverageLinks.length,
    active: coverageLinks.filter((l) => l.status === 'active').length,
    pending: coverageLinks.filter((l) => l.status === 'pending').length,
    instagram: coverageLinks.filter((l) => l.platform === 'instagram').length,
    snapchat: coverageLinks.filter((l) => l.platform === 'snapchat').length,
    tiktok: coverageLinks.filter((l) => l.platform === 'tiktok').length,
  };

  const activeResults = discoveryTab === 'scraper' ? scrapedUrls : searchResults;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-500 shadow-lg">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Coverage URL Manager</h1>
                <p className="text-xs text-slate-500">Social media coverage tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsDiscoveryOpen(true)} className="btn-secondary hidden sm:flex">
                <Globe className="h-4 w-4" />
                <span>Discover</span>
              </button>
              <button onClick={() => setIsBulkImportOpen(true)} className="btn-secondary hidden sm:flex">
                <Upload className="h-4 w-4" />
                <span>Import</span>
              </button>
              <button onClick={handleExportCsv} className="btn-secondary hidden sm:flex">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button onClick={() => handleOpenModal()} className="btn-primary">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Coverage</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Total</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-slate-500">Active</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-500">Pending</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pink-500" />
              <span className="text-xs font-medium text-slate-500">Instagram</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-pink-600">{stats.instagram}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-medium text-slate-500">Snapchat</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.snapchat}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-slate-800" />
              <span className="text-xs font-medium text-slate-500">TikTok</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.tiktok}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by username, caption, URL, or campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectMode(!selectMode)}
                className={`btn-secondary ${selectMode ? 'ring-2 ring-primary-500' : ''}`}
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Select</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary sm:w-auto"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="card animate-fade-in grid gap-4 p-4 sm:grid-cols-3">
              <div>
                <label className="label">Platform</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
                  className="select"
                >
                  <option value="all">All Platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="snapchat">Snapchat</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
                  className="select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="label">Content Type</label>
                <select
                  value={contentTypeFilter}
                  onChange={(e) => setContentTypeFilter(e.target.value as ContentType | 'all')}
                  className="select"
                >
                  <option value="all">All Types</option>
                  <option value="post">Post</option>
                  <option value="story">Story</option>
                  <option value="video">Video</option>
                  <option value="snap">Snap</option>
                  <option value="reel">Reel</option>
                </select>
              </div>
            </div>
          )}

          {/* Selection actions */}
          {selectMode && (
            <div className="flex items-center gap-3 rounded-xl bg-primary-50 px-4 py-3 animate-slide-up">
              <button onClick={toggleSelectAll} className="text-sm font-medium text-primary-700 hover:text-primary-800">
                {selectedForExport.size === coverageLinks.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-slate-500">
                {selectedForExport.size} selected
              </span>
              <div className="ml-auto flex gap-2">
                <button onClick={handleExportCsv} disabled={selectedForExport.size === 0} className="btn-primary text-sm py-2">
                  <Download className="h-4 w-4" />
                  Export Selected
                </button>
              </div>
            </div>
          )}

          {/* Mobile action buttons */}
          <div className="flex gap-2 sm:hidden">
            <button onClick={() => setIsDiscoveryOpen(true)} className="btn-secondary flex-1 justify-center">
              <Globe className="h-4 w-4" />
              <span>Discover</span>
            </button>
            <button onClick={() => setIsBulkImportOpen(true)} className="btn-secondary flex-1 justify-center">
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
            <button onClick={handleExportCsv} className="btn-secondary flex-1 justify-center">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700 animate-slide-up">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : coverageLinks.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-slate-100 p-4 mb-4">
              <Link2 className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No coverage links yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              Add your first social media coverage link to get started
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleOpenModal()} className="btn-primary">
                <Plus className="h-4 w-4" />
                Add Coverage
              </button>
              <button onClick={() => setIsDiscoveryOpen(true)} className="btn-secondary">
                <Globe className="h-4 w-4" />
                Discover URLs
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coverageLinks.map((link) => {
              const platform = platformConfig[link.platform];
              const contentType = contentTypeConfig[link.content_type];
              const status = statusConfig[link.status];
              const Icon = platform.icon;
              const ContentIcon = contentType.icon;
              const StatusIcon = status.icon;

              return (
                <div key={link.id} className={`card group relative overflow-hidden animate-scale-in ${selectMode && selectedForExport.has(link.id) ? 'ring-2 ring-primary-500' : ''}`}>
                  {selectMode && (
                    <div className="absolute left-3 top-3 z-10">
                      <button
                        onClick={() => toggleSelect(link.id)}
                        className={`h-5 w-5 rounded border-2 transition-all ${
                          selectedForExport.has(link.id)
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selectedForExport.has(link.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className={`absolute inset-x-0 top-0 h-1 ${platform.color}`} />
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-2 ${platform.bgColor}`}>
                          <Icon className={`h-4 w-4 ${platform.textColor}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">@{link.username}</p>
                          <p className="text-xs text-slate-500">{platform.label}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>

                    {/* Content Type & Caption */}
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <ContentIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{contentType.label}</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{link.mention_or_caption}</p>
                    </div>

                    {/* URL */}
                    <div className="mb-4 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-400 mb-1">Coverage URL</p>
                      <p className="text-sm text-primary-600 font-medium truncate">{link.coverage_url}</p>
                    </div>

                    {/* Campaign */}
                    {link.campaign_name && (
                      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                        <Hash className="h-3 w-3" />
                        <span className="truncate">{link.campaign_name}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
                      <a
                        href={link.coverage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon flex-1 justify-center gap-1.5 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-xs font-medium">Open</span>
                      </a>
                      <button
                        onClick={() => handleCopyUrl(link.coverage_url, link.id)}
                        className="btn-icon flex-1 justify-center gap-1.5"
                      >
                        {copiedId === link.id ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span className="text-xs font-medium">Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenModal(link)}
                        className="btn-icon hover:bg-primary-50 hover:text-primary-600"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(link.id)}
                        className="btn-icon hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Discovery Modal - Expanded */}
      {isDiscoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDiscoveryOpen(false)} />
          <div className="relative w-full max-w-6xl max-h-[85vh] animate-scale-in">
            <div className="card overflow-hidden flex flex-col rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-primary-50 to-accent-50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-2.5 shadow-sm">
                    <Globe className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Discover Coverage URLs</h2>
                    <p className="text-xs text-slate-500">Search, scrape, and import social media coverage links</p>
                  </div>
                </div>
                <button onClick={() => setIsDiscoveryOpen(false)} className="btn-icon hover:bg-white/80">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50">
                <button
                  onClick={() => setDiscoveryTab('search')}
                  className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
                    discoveryTab === 'search'
                      ? 'border-primary-500 text-primary-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  Web Search
                </button>
                <button
                  onClick={() => setDiscoveryTab('scraper')}
                  className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
                    discoveryTab === 'scraper'
                      ? 'border-primary-500 text-primary-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  URL Scraper
                </button>
                <button
                  onClick={() => setDiscoveryTab('saved')}
                  className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-all ${
                    discoveryTab === 'saved'
                      ? 'border-primary-500 text-primary-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  Recent Searches
                  {savedSearches.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 rounded-full">
                      {savedSearches.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Search Tab */}
                {discoveryTab === 'search' && (
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Search Form */}
                    <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-5">
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="label">Search Query</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="username, campaign, hashtag..."
                            value={discoveryQuery}
                            onChange={(e) => setDiscoveryQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDiscoverySearch()}
                            className="input pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Platform</label>
                        <select
                          value={discoveryPlatform}
                          onChange={(e) => setDiscoveryPlatform(e.target.value as Platform | 'all')}
                          className="select"
                        >
                          <option value="all">All Platforms</option>
                          <option value="instagram">Instagram</option>
                          <option value="snapchat">Snapchat</option>
                          <option value="tiktok">TikTok</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Content Type</label>
                        <select
                          value={discoveryContentType}
                          onChange={(e) => setDiscoveryContentType(e.target.value as ContentType | 'all')}
                          className="select"
                        >
                          <option value="all">All Types</option>
                          <option value="post">Post</option>
                          <option value="story">Story</option>
                          <option value="video">Video</option>
                          <option value="reel">Reel</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Username</label>
                        <input
                          type="text"
                          placeholder="@username"
                          value={discoveryUsername}
                          onChange={(e) => setDiscoveryUsername(e.target.value)}
                          className="input"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={handleDiscoverySearch} disabled={isSearching} className="btn-primary">
                        {isSearching ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4" />
                            Search
                          </>
                        )}
                      </button>

                      {searchResults.length > 0 && (
                        <button onClick={handleExportAllResults} className="btn-secondary">
                          <Download className="h-4 w-4" />
                          Export All ({searchResults.length})
                        </button>
                      )}
                    </div>

                    {/* Results */}
                    {searchResults.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        {/* Results Header */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary-500" />
                              {searchResults.length} results found
                            </h3>
                            <div className="h-4 w-px bg-slate-200" />
                            <span className="text-xs text-slate-500">
                              {selectedResults.size} selected
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={toggleAllResults}
                              className="text-xs text-primary-600 hover:text-primary-700"
                            >
                              {selectedResults.size === searchResults.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <div className="h-4 w-px bg-slate-200" />
                            <button
                              onClick={() => setDiscoveryViewMode('grid')}
                              className={`p-1.5 rounded ${discoveryViewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              <Grid className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDiscoveryViewMode('list')}
                              className={`p-1.5 rounded ${discoveryViewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              <List className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Selected Actions */}
                        {selectedResults.size > 0 && (
                          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl animate-fade-in">
                            <span className="text-sm text-primary-700 font-medium">
                              {selectedResults.size} selected
                            </span>
                            <div className="ml-auto flex gap-2">
                              <button onClick={handleExportSelectedResults} className="btn-secondary text-sm py-2">
                                <Download className="h-3 w-3" />
                                Export Selected
                              </button>
                              <button
                                onClick={handleBatchImportSelected}
                                disabled={isImporting}
                                className="btn-primary text-sm py-2"
                              >
                                {isImporting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <PlusCircle className="h-3 w-3" />
                                )}
                                Import Selected
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Results Grid/List */}
                        <div className={
                          discoveryViewMode === 'grid'
                            ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
                            : 'space-y-2'
                        }>
                          {searchResults.map((result, idx) => {
                            const platformInfo = platformConfig[result.platform as Platform] || platformConfig.instagram;
                            const isSelected = selectedResults.has(idx);

                            if (discoveryViewMode === 'list') {
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-primary-500 bg-primary-50'
                                      : 'border-slate-200 hover:border-primary-300 bg-white'
                                  }`}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleResultSelection(idx);
                                    }}
                                    className={`h-5 w-5 rounded border-2 flex-shrink-0 transition-all ${
                                      isSelected
                                        ? 'border-primary-500 bg-primary-500'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </button>

                                  <div className={`rounded-lg p-1.5 ${platformInfo.bgColor} flex-shrink-0`}>
                                    <platformInfo.icon className={`h-4 w-4 ${platformInfo.textColor}`} />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                                    <p className="text-xs text-slate-500 truncate">{result.description}</p>
                                  </div>

                                  <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="btn-icon flex-shrink-0"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectSearchResult(result);
                                    }}
                                    className="btn-primary text-xs py-1 px-3 flex-shrink-0"
                                  >
                                    Add
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={idx}
                                onClick={() => toggleResultSelection(idx)}
                                className={`rounded-xl border p-4 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                    : 'border-slate-200 hover:border-primary-300 bg-white'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`rounded-lg p-2 ${platformInfo.bgColor} flex-shrink-0`}>
                                    <platformInfo.icon className={`h-4 w-4 ${platformInfo.textColor}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="font-medium text-slate-900 line-clamp-1">{result.title}</p>
                                      {isSelected && (
                                        <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{result.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        result.contentType === 'reel' ? 'bg-purple-100 text-purple-700' :
                                        result.contentType === 'video' ? 'bg-blue-100 text-blue-700' :
                                        result.contentType === 'story' ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-100 text-slate-700'
                                      }`}>
                                        {result.contentType || 'post'}
                                      </span>
                                      {result.username && (
                                        <span className="text-xs text-primary-600">@{result.username}</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-primary-500 truncate mt-2">{result.url}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                  <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="btn-secondary text-xs py-1.5 flex-1 justify-center"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Open
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectSearchResult(result);
                                    }}
                                    className="btn-primary text-xs py-1.5 flex-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add to List
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {!isSearching && searchResults.length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        <Globe className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">Search for usernames, campaigns, or hashtags to discover coverage URLs</p>
                      </div>
                    )}
                  </div>
                )}

                {/* URL Scraper Tab */}
                {discoveryTab === 'scraper' && (
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                      <label className="label">Paste URLs to Scrape (one per line or comma-separated)</label>
                      <textarea
                        value={urlScraper}
                        onChange={(e) => setUrlScraper(e.target.value)}
                        placeholder="https://instagram.com/p/xxx&#10;https://tiktok.com/@user/video/xxx"
                        rows={3}
                        className="input font-mono text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button onClick={handleAddScrapedUrl} disabled={isScraping || !urlScraper.trim()} className="btn-primary">
                        {isScraping ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Scraping...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Scrape URL
                          </>
                        )}
                      </button>

                      {scrapedUrls.length > 0 && (
                        <button
                          onClick={() => exportDiscoveryResults(scrapedUrls, `scraped_urls_${new Date().toISOString().split('T')[0]}.csv`)}
                          className="btn-secondary"
                        >
                          <Download className="h-4 w-4" />
                          Export ({scrapedUrls.length})
                        </button>
                      )}

                      {scrapedUrls.length > 0 && (
                        <button
                          onClick={() => {
                            const insertData = scrapedUrls.map((r) => ({
                              platform: r.platform as Platform || 'instagram',
                              username: r.username || 'unknown',
                              mention_or_caption: r.title || '',
                              content_type: r.contentType as ContentType || 'post',
                              coverage_url: r.url,
                              status: 'pending' as Status,
                            }));
                            supabase.from('coverage_links').insert(insertData).then(({ error }) => {
                              if (error) setError(error.message);
                              else {
                                setScrapedUrls([]);
                                setIsDiscoveryOpen(false);
                                fetchCoverageLinks();
                              }
                            });
                          }}
                          className="btn-primary"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Import All
                        </button>
                      )}
                    </div>

                    {/* Scraped URLs */}
                    {scrapedUrls.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Scraped URLs ({scrapedUrls.length})
                        </h3>
                        <div className="space-y-2">
                          {scrapedUrls.map((result, idx) => {
                            const platformInfo = platformConfig[result.platform as Platform] || platformConfig.instagram;
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white"
                              >
                                <div className={`rounded-lg p-2 ${platformInfo.bgColor}`}>
                                  <platformInfo.icon className={`h-4 w-4 ${platformInfo.textColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900">{result.title}</p>
                                  <p className="text-xs text-slate-500 truncate">{result.url}</p>
                                </div>
                                <button
                                  onClick={() => handleSelectSearchResult(result)}
                                  className="btn-primary text-sm py-2"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setScrapedUrls(prev => prev.filter((_, i) => i !== idx))}
                                  className="btn-icon hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {scrapedUrls.length === 0 && !isScraping && (
                      <div className="text-center py-12 text-slate-500">
                        <Zap className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">Paste social media URLs to extract metadata</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Saved Searches Tab */}
                {discoveryTab === 'saved' && (
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {savedSearches.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-700">Recent Searches</h3>
                          <button onClick={handleClearSavedSearches} className="text-xs text-red-600 hover:text-red-700">
                            Clear All
                          </button>
                        </div>
                        <div className="space-y-2">
                          {savedSearches.map((saved, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleLoadSavedSearch(saved)}
                              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-primary-300 cursor-pointer transition-all"
                            >
                              <Clock className="h-4 w-4 text-slate-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">{saved.query || 'All results'}</p>
                                <p className="text-xs text-slate-500">
                                  {saved.platform === 'all' ? 'All platforms' : saved.platform} - {new Date(saved.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        <Bookmark className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">No saved searches yet</p>
                        <p className="text-xs text-slate-400 mt-1">Your recent searches will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsBulkImportOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] animate-scale-in">
            <div className="card overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent-100 p-2">
                    <Upload className="h-5 w-5 text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Import Coverage Links</h2>
                    <p className="text-xs text-slate-500">Upload CSV or paste data</p>
                  </div>
                </div>
                <button onClick={() => setIsBulkImportOpen(false)} className="btn-icon">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* File Upload */}
                <div>
                  <label className="label">Upload CSV File</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-primary-300 hover:bg-primary-50/50 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-1">CSV file with: platform, username, url, caption, content_type, campaign, status</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Text Import */}
                <div>
                  <label className="label">Or paste CSV data</label>
                  <textarea
                    value={bulkImportText}
                    onChange={(e) => {
                      setBulkImportText(e.target.value);
                      parseImportPreview(e.target.value);
                    }}
                    placeholder="platform,username,url,caption,content_type,campaign,status&#10;instagram,@user1,https://...,Post caption,post,Campaign A,active&#10;tiktok,@user2,https://...,Video title,video,Campaign B,pending"
                    rows={5}
                    className="input resize-none font-mono text-xs"
                  />
                </div>

                {/* Preview */}
                {importPreview.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview ({importPreview.length} items)
                    </h3>
                    <div className="max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 space-y-2">
                      {importPreview.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            item.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                            item.platform === 'tiktok' ? 'bg-gray-200 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.platform}
                          </span>
                          <span className="text-slate-600">@{item.username}</span>
                          <span className="text-primary-600 truncate flex-1">{item.coverage_url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsBulkImportOpen(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={isImporting || importPreview.length === 0}
                    className="btn-primary flex-1"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Import {importPreview.length} Items
                      </>
                    )}
                  </button>
                </div>

                {/* Template */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      const template = 'platform,username,url,caption,content_type,campaign,status\ninstagram,@username,https://instagram.com/p/xxx,Caption text,post,Campaign Name,active';
                      const blob = new Blob([template], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'coverage_import_template.csv';
                      a.click();
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-lg animate-scale-in">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingLink ? 'Edit Coverage' : 'Add Coverage'}
                </h2>
                <button onClick={handleCloseModal} className="btn-icon">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
                {/* Platform Selection */}
                <div>
                  <label className="label">Platform</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(platformConfig) as Platform[]).map((p) => {
                      const config = platformConfig[p];
                      const Icon = config.icon;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePlatformChange(p)}
                          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                            formData.platform === p
                              ? `${config.bgColor} ${config.textColor} ring-2 ring-offset-2 ${
                                  p === 'snapchat' ? 'ring-yellow-400' : `ring-primary-500`
                                }`
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="label">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username"
                      className="input pl-8"
                    />
                  </div>
                  {formErrors.username && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.username}</p>
                  )}
                </div>

                {/* Content Type */}
                <div>
                  <label className="label">Content Type</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) =>
                      setFormData({ ...formData, content_type: e.target.value as ContentType })
                    }
                    className="select"
                  >
                    {getContentTypeOptions(formData.platform).map((ct) => (
                      <option key={ct} value={ct}>
                        {contentTypeConfig[ct].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mention/Caption */}
                <div>
                  <label className="label">Mention / Caption</label>
                  <textarea
                    value={formData.mention_or_caption}
                    onChange={(e) =>
                      setFormData({ ...formData, mention_or_caption: e.target.value })
                    }
                    placeholder="Enter the mention or caption text..."
                    rows={3}
                    className="input resize-none"
                  />
                  {formErrors.mention_or_caption && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.mention_or_caption}</p>
                  )}
                </div>

                {/* Coverage URL */}
                <div>
                  <label className="label">Coverage URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.coverage_url}
                      onChange={(e) => setFormData({ ...formData, coverage_url: e.target.value })}
                      placeholder="https://..."
                      className="input pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : urlVerification ? (
                        urlVerification.valid ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleScrapeUrl(formData.coverage_url)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {formErrors.coverage_url && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.coverage_url}</p>
                  )}

                  {/* URL Scrape Preview */}
                  {isScraping && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching preview...
                    </div>
                  )}

                  {scrapePreview && !isScraping && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-3 space-y-2">
                      {scrapePreview.image && (
                        <img src={scrapePreview.image} alt="" className="w-full h-32 object-cover rounded-lg" />
                      )}
                      <p className="text-sm font-medium text-slate-900">{scrapePreview.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">{scrapePreview.description}</p>
                      {scrapePreview.username && (
                        <p className="text-xs text-primary-600">@{scrapePreview.username} detected</p>
                      )}
                      <button
                        type="button"
                        onClick={handleUseScrapedData}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Use scraped data
                      </button>
                    </div>
                  )}
                </div>

                {/* Campaign Name */}
                <div>
                  <label className="label">Campaign Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.campaign_name}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                    placeholder="Campaign name..."
                    className="input"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                    className="select"
                  >
                    {(Object.keys(statusConfig) as Status[]).map((s) => (
                      <option key={s} value={s}>
                        {statusConfig[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                    className="input resize-none"
                  />
                </div>
              </form>

              <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {editingLink ? 'Update' : 'Add Coverage'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm animate-scale-in">
            <div className="card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Coverage?</h3>
              <p className="text-sm text-slate-500 mb-6">
                This action cannot be undone. The coverage link will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
