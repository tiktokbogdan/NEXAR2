import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileText, TrendingUp, AlertTriangle, 
  Check, X, Eye, Edit, Trash2, Search, Filter,
  BarChart3, PieChart, Activity, DollarSign, Shield,
  RefreshCw, ExternalLink
} from 'lucide-react';
import { admin, supabase } from '../lib/supabase';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated, activeTab]);

  const checkAdminAccess = async () => {
    try {
      setIsLoading(true);
      
      // Verificăm dacă utilizatorul este autentificat
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      // Verificăm dacă utilizatorul este admin
      const isAdminUser = await admin.isAdmin();
      
      if (!isAdminUser) {
        alert('Nu aveți permisiuni de administrator!');
        navigate('/');
        return;
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoadingData(true);
      
      if (activeTab === 'listings' || activeTab === 'dashboard') {
        const { data: listingsData, error: listingsError } = await admin.getAllListings();
        
        if (listingsError) {
          console.error('Error loading listings:', listingsError);
        } else {
          setAllListings(listingsData || []);
        }
      }
      
      if (activeTab === 'users' || activeTab === 'dashboard') {
        const { data: usersData, error: usersError } = await admin.getAllUsers();
        
        if (usersError) {
          console.error('Error loading users:', usersError);
        } else {
          setAllUsers(usersData || []);
        }
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleListingAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        if (!confirm('Ești sigur că vrei să ștergi acest anunț?')) return;
        
        const { error } = await admin.deleteListing(id);
        
        if (error) {
          console.error('Error deleting listing:', error);
          alert('Eroare la ștergerea anunțului');
          return;
        }
        
        alert('Anunțul a fost șters cu succes!');
      } else {
        const status = action === 'approve' ? 'active' : 'rejected';
        const { error } = await admin.updateListingStatus(id, status);
        
        if (error) {
          console.error('Error updating listing status:', error);
          alert('Eroare la actualizarea statusului');
          return;
        }
        
        alert(`Anunțul a fost ${action === 'approve' ? 'aprobat' : 'respins'} cu succes!`);
      }
      
      // Reîncărcăm datele
      await loadAdminData();
    } catch (error) {
      console.error('Error handling listing action:', error);
      alert('A apărut o eroare');
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedListings.length === 0) {
      alert('Selectează cel puțin un anunț');
      return;
    }
    
    if (!confirm(`Ești sigur că vrei să ${action === 'approve' ? 'aprobi' : action === 'reject' ? 'respingi' : 'ștergi'} ${selectedListings.length} anunțuri?`)) {
      return;
    }
    
    try {
      for (const listingId of selectedListings) {
        await handleListingAction(listingId, action);
      }
      
      setSelectedListings([]);
      alert(`${selectedListings.length} anunțuri au fost procesate cu succes!`);
    } catch (error) {
      console.error('Error with bulk action:', error);
      alert('A apărut o eroare la procesarea anunțurilor');
    }
  };

  const toggleListingSelection = (id: string) => {
    setSelectedListings(prev => 
      prev.includes(id) 
        ? prev.filter(listingId => listingId !== id)
        : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activ';
      case 'pending': return 'În așteptare';
      case 'rejected': return 'Respins';
      case 'sold': return 'Vândut';
      default: return status;
    }
  };

  // Filtrare anunțuri
  const filteredListings = allListings.filter(listing => {
    const matchesSearch = !searchQuery || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.seller_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Statistici pentru dashboard
  const stats = {
    totalUsers: allUsers.length,
    activeListings: allListings.filter(l => l.status === 'active').length,
    pendingListings: allListings.filter(l => l.status === 'pending').length,
    totalListings: allListings.length,
    rejectedListings: allListings.filter(l => l.status === 'rejected').length
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <div className="w-16 h-16 border-4 border-nexar-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Se verifică accesul de administrator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexar-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-nexar-primary mb-4">
              Panou de Administrare
            </h1>
            <p className="text-gray-600 text-lg">
              Gestionează platforma Nexar și monitorizează activitatea
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('user');
              navigate('/');
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Deconectează-te
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-nexar-primary text-white'
                      : 'text-gray-700 hover:bg-nexar-light'
                  }`}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Dashboard</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('listings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === 'listings'
                      ? 'bg-nexar-primary text-white'
                      : 'text-gray-700 hover:bg-nexar-light'
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  <span>Anunțuri</span>
                  {stats.pendingListings > 0 && (
                    <span className="bg-nexar-accent text-white text-xs px-2 py-1 rounded-full">
                      {stats.pendingListings}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-nexar-primary text-white'
                      : 'text-gray-700 hover:bg-nexar-light'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>Utilizatori</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Utilizatori Totali</p>
                        <p className="text-2xl font-bold text-nexar-primary">{stats.totalUsers}</p>
                      </div>
                      <Users className="h-8 w-8 text-nexar-accent" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Anunțuri Active</p>
                        <p className="text-2xl font-bold text-nexar-primary">{stats.activeListings}</p>
                      </div>
                      <FileText className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">În Așteptare</p>
                        <p className="text-2xl font-bold text-nexar-primary">{stats.pendingListings}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Anunțuri</p>
                        <p className="text-2xl font-bold text-nexar-primary">{stats.totalListings}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-nexar-accent" />
                    </div>
                  </div>
                </div>

                {/* Charts Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-nexar-primary mb-4">Activitate Recentă</h3>
                    <div className="space-y-4">
                      {allListings.slice(0, 5).map((listing) => (
                        <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{listing.title}</p>
                            <p className="text-sm text-gray-600">de {listing.seller_name}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(listing.status)}`}>
                            {getStatusText(listing.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-nexar-primary mb-4">Statistici Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Active</span>
                        <span className="font-semibold text-green-600">{stats.activeListings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">În așteptare</span>
                        <span className="font-semibold text-yellow-600">{stats.pendingListings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Respinse</span>
                        <span className="font-semibold text-red-600">{stats.rejectedListings}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
                    <h3 className="text-xl font-semibold text-nexar-primary">Gestionare Anunțuri</h3>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => loadAdminData()}
                        disabled={isLoadingData}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                        <span>Reîncarcă</span>
                      </button>
                      
                      {selectedListings.length > 0 && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleBulkAction('approve')}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center space-x-2"
                          >
                            <Check className="h-4 w-4" />
                            <span>Aprobă ({selectedListings.length})</span>
                          </button>
                          <button
                            onClick={() => handleBulkAction('reject')}
                            className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                          >
                            <X className="h-4 w-4" />
                            <span>Respinge ({selectedListings.length})</span>
                          </button>
                          <button
                            onClick={() => handleBulkAction('delete')}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center space-x-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Șterge ({selectedListings.length})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Search and Filter */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Caută anunțuri..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    </div>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    >
                      <option value="all">Toate statusurile</option>
                      <option value="active">Active</option>
                      <option value="pending">În așteptare</option>
                      <option value="rejected">Respinse</option>
                      <option value="sold">Vândute</option>
                    </select>
                  </div>

                  {/* Listings Table */}
                  {isLoadingData ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 border-4 border-nexar-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Se încarcă anunțurile...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedListings(filteredListings.map(l => l.id));
                                  } else {
                                    setSelectedListings([]);
                                  }
                                }}
                                className="rounded border-gray-300 text-nexar-accent focus:ring-nexar-accent"
                              />
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Anunț</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Vânzător</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Preț</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Acțiuni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredListings.map((listing) => (
                            <tr key={listing.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={selectedListings.includes(listing.id)}
                                  onChange={() => toggleListingSelection(listing.id)}
                                  className="rounded border-gray-300 text-nexar-accent focus:ring-nexar-accent"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={listing.images && listing.images[0] ? listing.images[0] : "https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg"}
                                    alt={listing.title}
                                    className="w-12 h-12 rounded-lg object-cover"
                                  />
                                  <div>
                                    <div className="font-semibold text-nexar-primary">{listing.title}</div>
                                    <div className="text-sm text-gray-600">{new Date(listing.created_at).toLocaleDateString('ro-RO')}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium text-gray-900">{listing.seller_name}</div>
                                  <div className="text-sm text-gray-600">{listing.seller_type === 'dealer' ? 'Dealer' : 'Individual'}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-semibold text-nexar-accent">€{listing.price.toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(listing.status)}`}>
                                  {getStatusText(listing.status)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => window.open(`/anunt/${listing.id}`, '_blank')}
                                    className="p-1 text-nexar-primary hover:bg-nexar-light rounded"
                                    title="Vezi anunțul"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </button>
                                  {listing.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => handleListingAction(listing.id, 'approve')}
                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        title="Aprobă"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleListingAction(listing.id, 'reject')}
                                        className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                        title="Respinge"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleListingAction(listing.id, 'delete')}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Șterge"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {filteredListings.length === 0 && (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Nu s-au găsit anunțuri</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-nexar-primary">Gestionare Utilizatori</h3>
                  <button
                    onClick={() => loadAdminData()}
                    disabled={isLoadingData}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                    <span>Reîncarcă</span>
                  </button>
                </div>
                
                {isLoadingData ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-nexar-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Se încarcă utilizatorii...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Utilizator</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Tip</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Membru din</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-nexar-primary rounded-full flex items-center justify-center text-white font-semibold">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-nexar-primary">{user.name}</div>
                                  {user.verified && (
                                    <div className="text-xs text-green-600">Verificat</div>
                                  )}
                                  {user.is_admin && (
                                    <div className="text-xs text-nexar-accent font-bold">ADMIN</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-700">{user.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                user.seller_type === 'dealer' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.seller_type === 'dealer' ? 'Dealer' : 'Individual'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700">
                              {new Date(user.created_at).toLocaleDateString('ro-RO')}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                Activ
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {allUsers.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Nu s-au găsit utilizatori</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;