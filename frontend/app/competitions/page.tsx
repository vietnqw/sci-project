"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { competitionsAPI } from "../api/competitions";

type AnyCompetition = Record<string, any>;

const DEFAULT_LIMIT = 12;

function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getFallbackImage(comp: AnyCompetition): string {
  const title = String(comp?.title ?? "").toLowerCase();
  if (title.includes("mathematical") || title.includes("imo")) return "/assets/logos/IMO_logo.svg";
  if (title.includes("robotics") || title.includes("first")) return "/assets/logos/FIRST_Robotics_Competition_(logo).svg.png";
  if (title.includes("isef") || title.includes("science and engineering")) return "/assets/logos/2021_ISEF_Logo.webp";
  if (title.includes("coding") || title.includes("programming")) return "/assets/logos/images.png";
  if (title.includes("vietnam") || title.includes("national")) return "/assets/images/image1.jpeg";
  return "/assets/logos/logoWeb.png";
}

function mapCompetitionToDisplay(competition: AnyCompetition) {
  const desc: string = competition?.description || competition?.introduction || competition?.overview || "No description available";
  const scaleRaw: string | undefined = competition?.scale;
  const formatRaw: string | undefined = competition?.format;

  const imageUrl = isValidImageUrl(competition?.background_image_url)
    ? competition.background_image_url
    : getFallbackImage(competition);

  const toTitle = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");

  return {
    id: competition.id,
    name: competition.title,
    overview: desc,
    scale: scaleRaw ? toTitle(scaleRaw) : "Unknown",
    location: competition?.location || "TBD",
    modes: formatRaw ? [toTitle(formatRaw)] : ["TBD"],
    homepage: competition?.competition_link || "#",
    image: imageUrl,
  };
}

export default function CompetitionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AnyCompetition[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & query
  const [search, setSearch] = useState("");
  const [scaleFilter, setScaleFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Pagination via URL (?page, ?limit) to keep UI identical but enable server pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10));
  const skip = (page - 1) * limit;

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  function goToPage(p: number) {
    const clamped = Math.min(Math.max(1, p), totalPages);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("page", String(clamped));
    params.set("limit", String(limit));
    // Keep path the same
    router.push(`?${params.toString()}`);
  }

  function getPageNumbers(): (number | string)[] {
    const maxButtons = 7; // including first/last and ellipses
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    const showLeftEllipsis = page > 4;
    const showRightEllipsis = page < totalPages - 3;

    pages.push(1);
    if (showLeftEllipsis) pages.push("…");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let p = start; p <= end; p++) pages.push(p);

    if (showRightEllipsis) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  useEffect(() => {
    let ignore = false;
    async function fetchList() {
      setLoading(true);
      setError(null);
      try {
        const apiFormat = modeFilter ? modeFilter.toUpperCase() : undefined;
        const apiScale = scaleFilter ? scaleFilter.toUpperCase() : undefined;
        const resp: any = await competitionsAPI.getCompetitions({
          skip,
          limit,
          search: search || undefined,
          scale: apiScale as any,
          format: apiFormat as any,
          location: locationFilter || undefined,
        });
        if (!ignore) {
          setItems(Array.isArray(resp?.competitions) ? resp.competitions : []);
          setTotalCount(Number(resp?.total || 0));
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load competitions");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchList();
    return () => {
      ignore = true;
    };
  }, [skip, limit, search, scaleFilter, modeFilter, locationFilter]);

  // Build options from current page data (same behavior as old UI)
  const { scales, modes, locations } = useMemo(() => {
    if (!items?.length) return { scales: [] as string[], modes: [] as string[], locations: [] as string[] };
    const toTitle = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
    const s = Array.from(new Set(items.map((c) => (c?.scale ? toTitle(c.scale) : "")).filter(Boolean)));
    const m = Array.from(new Set(items.map((c) => (c?.format ? toTitle(c.format) : "")).filter(Boolean)));
    const l = Array.from(new Set(items.map((c) => c?.location).filter(Boolean)));
    return { scales: s, modes: m, locations: l };
  }, [items]);

  // Client-side filtering remains for identical UI behavior (on top of server filters)
  const filtered = useMemo(() => {
    const display = items.map(mapCompetitionToDisplay);
    return display.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.overview.toLowerCase().includes(search.toLowerCase());
      const matchesScale = !scaleFilter || c.scale === scaleFilter;
      const matchesMode = !modeFilter || c.modes.includes(modeFilter);
      const matchesLocation = !locationFilter || c.location === locationFilter;
      return matchesSearch && matchesScale && matchesMode && matchesLocation;
    });
  }, [items, search, scaleFilter, modeFilter, locationFilter]);

  // Loading state
  if (loading) {
    return (
      <section className="px-4 py-16 min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-blue-900 mb-4">Explore Competitions</h1>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto">Browse and filter science & technology competitions worldwide. Find the right challenge for you!</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="px-4 py-16 min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-blue-900 mb-4">Explore Competitions</h1>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto">Browse and filter science & technology competitions worldwide. Find the right challenge for you!</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl font-semibold mb-2 text-red-600">Error Loading Competitions</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={() => router.refresh()} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Try Again</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-16 min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-900 mb-4">Explore Competitions</h1>
          <p className="text-gray-600 text-xl max-w-3xl mx-auto">Browse and filter science & technology competitions worldwide. Find the right challenge for you!</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse competitions</h2>
            <p className="text-gray-600">Find the perfect competition for you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  placeholder="Search competitions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors bg-white hover:border-gray-400"
                  aria-label="Search competitions"
                />
              </div>
            </div>

            {/* Scale Filter */}
            <div className="space-y-2">
              <label htmlFor="scale-filter" className="block text-sm font-medium text-gray-700">Scale</label>
              <div className="relative">
                <select
                  id="scale-filter"
                  value={scaleFilter}
                  onChange={(e) => setScaleFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors bg-white hover:border-gray-400 appearance-none cursor-pointer"
                  aria-label="Filter by scale"
                >
                  <option value="">All scales</option>
                  {scales.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700">Location</label>
              <input
                id="location-filter"
                type="text"
                placeholder="Type or select location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors bg-white hover:border-gray-400"
                aria-label="Filter by location"
                list="location-options"
              />
              <datalist id="location-options">
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>

            {/* Mode Filter */}
            <div className="space-y-2">
              <label htmlFor="mode-filter" className="block text-sm font-medium text-gray-700">Mode</label>
              <div className="relative">
                <select
                  id="mode-filter"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors bg-white hover:border-gray-400 appearance-none cursor-pointer"
                  aria-label="Filter by mode"
                >
                  <option value="">All modes</option>
                  {modes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {(search || scaleFilter || locationFilter || modeFilter) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => { setSearch(""); setScaleFilter(""); setLocationFilter(""); setModeFilter(""); }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Competitions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-16 text-xl">
              <div className="bg-white rounded-xl shadow-lg p-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-semibold mb-2">No competitions found</h3>
                <p className="text-gray-600">Try adjusting your search criteria</p>
              </div>
            </div>
          ) : (
            filtered.map((c) => (
              <Link
                key={c.id}
                href={`/competitions/${c.id}`}
                className="block rounded-xl shadow-lg overflow-hidden hover:shadow-xl focus:shadow-xl transition-all duration-500 ease-out transform hover:scale-105 hover:-translate-y-3 focus:scale-105 focus:-translate-y-3 hover:shadow-2xl focus:shadow-2xl group cursor-pointer bg-white hover:bg-gray-50 focus:bg-gray-50 border border-gray-100 hover:border-blue-200 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                <div className="relative h-48 rounded-t-xl overflow-hidden">
                  {c.image && !imageErrors.has(c.id) ? (
                    <img
                      src={c.image}
                      alt={`${c.name} logo`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={() => { setImageErrors((prev) => new Set(prev).add(c.id)); }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">{c.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {/* Featured Star (top-right badge) */}
                  {Boolean((items.find(i => i.id === c.id) as any)?.is_featured) && (
                  <div className="absolute top-2 right-2 z-20" title="Featured Competition">
                    <div className="relative flex h-10 w-10 items-center justify-center transform transition-all duration-300 hover:scale-110 animate-pulse-slow">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 opacity-75 blur-md"></div>
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                </div>

                <div className="p-6 relative">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors duration-200">{c.name}</h2>
                  </div>
                  <p className="text-gray-700 text-base mb-4 leading-relaxed line-clamp-3">{c.overview}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 font-medium group-hover:bg-blue-200 transition-colors duration-200">{c.scale}</span>
                    <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 font-medium group-hover:bg-green-200 transition-colors duration-200">{c.location}</span>
                    {c.modes.map((m: string) => (
                      <span key={m} className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-800 font-medium group-hover:bg-purple-200 transition-colors duration-200">{m}</span>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <div className="inline-flex items-center text-blue-600 group-hover:text-blue-800 font-semibold text-sm transition-colors duration-200">
                      View Details
                      <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Results Count + Pagination */}
        <div className="mt-8 flex flex-col items-center gap-4 text-gray-600">
          {filtered.length > 0 && (
            <p className="text-lg">Showing {filtered.length} of {totalCount} competitions</p>
          )}
          {totalPages > 1 && (
            <nav className="flex items-center gap-2" aria-label="Pagination">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-2 rounded border border-gray-300 bg-white disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                Prev
              </button>
              {getPageNumbers().map((p, idx) => (
                typeof p === "number" ? (
                  <button
                    key={`p-${p}-${idx}`}
                    onClick={() => goToPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`px-3 py-2 rounded border cursor-pointer ${
                      p === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 bg-white hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={`e-${idx}`} className="px-2 select-none">{p}</span>
                )
              ))}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded border border-gray-300 bg-white disabled:opacity-50 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
