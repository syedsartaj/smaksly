'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Globe,
  TrendingUp,
  DollarSign,
  Clock,
  ChevronDown,
  X,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react';

interface WebsiteListing {
  id: string;
  name: string;
  domain: string;
  niche: string;
  language: string;
  metrics: {
    da: number;
    dr: number;
    traffic: number;
  };
  pricing: {
    price: number;
    turnaround: number;
  };
  guidelines: {
    contentGuidelines?: string;
    linkType: string;
    maxLinks: number;
    sampleUrl?: string;
  };
}

interface Filters {
  niches: string[];
  languages: string[];
}

interface CartItem {
  websiteId: string;
  name: string;
  domain: string;
  price: number;
}

export default function MarketplacePage() {
  const [websites, setWebsites] = useState<WebsiteListing[]>([]);
  const [filters, setFilters] = useState<Filters>({ niches: [], languages: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [niche, setNiche] = useState('');
  const [minDa, setMinDa] = useState('');
  const [maxDa, setMaxDa] = useState('');
  const [minDr, setMinDr] = useState('');
  const [maxDr, setMaxDr] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('da');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchWebsites = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (niche) params.append('niche', niche);
      if (minDa) params.append('minDa', minDa);
      if (maxDa) params.append('maxDa', maxDa);
      if (minDr) params.append('minDr', minDr);
      if (maxDr) params.append('maxDr', maxDr);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const res = await fetch(`/api/partner/marketplace?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWebsites(data.data);
        setFilters(data.filters);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch marketplace:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, niche, minDa, maxDa, minDr, maxDr, minPrice, maxPrice, sortBy, sortOrder]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  const addToCart = (website: WebsiteListing) => {
    if (!cart.find((item) => item.websiteId === website.id)) {
      setCart([
        ...cart,
        {
          websiteId: website.id,
          name: website.name,
          domain: website.domain,
          price: website.pricing.price,
        },
      ]);
    }
  };

  const removeFromCart = (websiteId: string) => {
    setCart(cart.filter((item) => item.websiteId !== websiteId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWebsites();
  };

  const clearFilters = () => {
    setSearch('');
    setNiche('');
    setMinDa('');
    setMaxDa('');
    setMinDr('');
    setMaxDr('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-500">Browse and purchase guest post opportunities</p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors relative"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart ({cart.length})
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="da-desc">DA: High to Low</option>
            <option value="da-asc">DA: Low to High</option>
            <option value="dr-desc">DR: High to Low</option>
            <option value="dr-asc">DR: Low to High</option>
            <option value="guestPostPrice-asc">Price: Low to High</option>
            <option value="guestPostPrice-desc">Price: High to Low</option>
          </select>
        </form>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niche</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Niches</option>
                {filters.niches.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DA Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minDa}
                  onChange={(e) => setMinDa(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxDa}
                  onChange={(e) => setMaxDa(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DR Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minDr}
                  onChange={(e) => setMinDr(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxDr}
                  onChange={(e) => setMaxDr(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range ($)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listings */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : websites.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No websites found</h3>
          <p className="text-gray-500">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((website) => {
            const inCart = cart.some((item) => item.websiteId === website.id);
            return (
              <div
                key={website.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{website.name}</h3>
                      <p className="text-sm text-gray-500">{website.domain}</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {website.niche}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">DA</p>
                      <p className="text-lg font-bold text-blue-700">{website.metrics.da}</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600 mb-1">DR</p>
                      <p className="text-lg font-bold text-purple-700">{website.metrics.dr}</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 mb-1">Traffic</p>
                      <p className="text-lg font-bold text-green-700">
                        {website.metrics.traffic >= 1000
                          ? `${(website.metrics.traffic / 1000).toFixed(0)}K`
                          : website.metrics.traffic}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{website.pricing.turnaround} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="capitalize">{website.guidelines.linkType}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-xl font-bold text-gray-900">
                        {website.pricing.price}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/partner/marketplace/${website.id}`}
                        className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Details
                      </Link>
                      <button
                        onClick={() => inCart ? removeFromCart(website.id) : addToCart(website)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          inCart
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {inCart ? 'In Cart' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Your Cart ({cart.length})</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.websiteId}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.domain}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">${item.price}</span>
                      <button
                        onClick={() => removeFromCart(item.websiteId)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-700">Total</span>
                  <span className="text-2xl font-bold text-gray-900">${cartTotal}</span>
                </div>
                <Link
                  href={`/partner/checkout?items=${encodeURIComponent(JSON.stringify(cart.map((i) => ({ websiteId: i.websiteId }))))}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Proceed to Checkout
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
