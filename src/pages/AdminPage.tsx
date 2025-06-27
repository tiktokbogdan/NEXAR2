import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileText, TrendingUp, AlertTriangle, 
  Check, X, Eye, Edit, Trash2, Search, Filter,
  BarChart3, PieChart, Activity, DollarSign, Shield,
  RefreshCw, ExternalLink, Save, Plus, Minus, LogOut
} from 'lucide-react';
import { admin, supabase, auth, romanianCities } from '../lib/supabase';

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
  const [editingListing, setEditingListing] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
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
        console.log('🔄 Loading listings for admin...');
        
        // Încărcăm TOATE anunțurile pentru admin (inclusiv inactive)
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select(`
            *,
            profiles!listings_seller_id_fkey (
              name,
              email,
              seller_type,
              verified
            )
          `)
          .order('created_at', { ascending: false });
        
        if (listingsError) {
          console.error('❌ Error loading listings:', listingsError);
        } else {
          console.log(`✅ Loaded ${listingsData?.length || 0} listings for admin`);
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
      console.log(`🔄 Admin action: ${action} for listing ${id}`);
      
      if (action === 'delete') {
        if (!confirm('Ești sigur că vrei să ștergi acest anunț?')) return;
        
        console.log('🗑️ Deleting listing:', id);
        
        const { error } = await supabase
          .from('listings')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('❌ Error deleting listing:', error);
          alert(`Eroare la ștergerea anunțului: ${error.message}`);
          return;
        }
        
        console.log('✅ Listing deleted successfully');
        alert('Anunțul a fost șters cu succes!');
        
        // Actualizăm lista de anunțuri după ștergere
        setAllListings(prev => prev.filter(listing => listing.id !== id));
      } else {
        const status = action === 'approve' ? 'active' : 'rejected';
        
        console.log('📝 Updating listing status:', id, 'to', status);
        
        const { error } = await supabase
          .from('listings')
          .update({ status })
          .eq('id', id);
        
        if (error) {
          console.error('❌ Error updating listing status:', error);
          alert(`Eroare la actualizarea statusului: ${error.message}`);
          return;
        }
        
        console.log('✅ Listing status updated successfully');
        alert(`Anunțul a fost ${action === 'approve' ? 'aprobat' : 'respins'} cu succes!`);
        
        // Actualizăm lista de anunțuri după modificare
        setAllListings(prev => prev.map(listing => 
          listing.id === id ? { ...listing, status } : listing
        ));
      }
    } catch (error) {
      console.error('💥 Error handling listing action:', error);
      alert('A apărut o eroare neașteptată');
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (selectedListings.length === 0) {
      alert('Selectează cel puțin un anunț');
      return;
    }
    
    const actionText = action === 'approve' ? 'aprobi' : action === 'reject' ? 'respingi' : 'ștergi';
    
    if (!confirm(`Ești sigur că vrei să ${actionText} ${selectedListings.length} anunțuri?`)) {
      return;
    }
    
    try {
      console.log(`🔄 Bulk ${action} for ${selectedListings.length} listings`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const listingId of selectedListings) {
        try {
          await handleListingAction(listingId, action);
          successCount++;
        } catch (error) {
          console.error(`Error with listing ${listingId}:`, error);
          errorCount++;
        }
      }
      
      setSelectedListings([]);
      
      if (errorCount === 0) {
        alert(`${successCount} anunțuri au fost procesate cu succes!`);
      } else {
        alert(`${successCount} anunțuri procesate cu succes, ${errorCount} erori.`);
      }
      
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

  // Funcție pentru a deschide anunțul în același tab
  const handleViewListing = (listingId: string) => {
    console.log('👁️ Viewing listing:', listingId);
    navigate(`/anunt/${listingId}`);
  };

  // Funcție pentru a deschide modalul de editare
  const handleEditListing = (listing: any) => {
    console.log('✏️ Editing listing:', listing.id);
    setEditingListing({
      ...listing,
      // Convertim valorile pentru editare
      price: listing.price.toString(),
      year: listing.year.toString(),
      mileage: listing.mileage.toString(),
      engine_capacity: listing.engine_capacity.toString(),
    });
    setShowEditModal(true);
  };

  // Funcție pentru a șterge o imagine din anunț
  const handleRemoveImage = (imageUrl: string) => {
    if (!editingListing) return;
    
    if (!confirm('Ești sigur că vrei să ștergi această imagine?')) return;
    
    setEditingListing({
      ...editingListing,
      images: editingListing.images.filter((img: string) => img !== imageUrl)
    });
  };

  // Funcție pentru a gestiona schimbarea locației
  const handleLocationChange = (value: string) => {
    if (!editingListing) return;
    
    setEditingListing({
      ...editingListing,
      location: value
    });
    
    if (value.length > 0) {
      const filtered = romanianCities.filter(city =>
        city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limităm la 10 rezultate
      setFilteredCities(filtered);
      setShowLocationDropdown(true);
    } else {
      setFilteredCities([]);
      setShowLocationDropdown(false);
    }
  };

  // Funcție pentru a selecta un oraș din dropdown
  const selectCity = (city: string) => {
    if (!editingListing) return;
    
    setEditingListing({
      ...editingListing,
      location: city
    });
    setShowLocationDropdown(false);
    setFilteredCities([]);
  };

  // Funcție pentru a salva modificările anunțului
  const handleSaveListing = async () => {
    if (!editingListing) return;
    
    try {
      console.log('💾 Saving listing changes:', editingListing.id);
      
      // Asigurăm-ne că statusul este 'active' sau 'sold' pentru a fi vizibil
      let status = editingListing.status;
      if (status !== 'active' && status !== 'sold') {
        status = 'active'; // Forțăm statusul la active dacă nu este active sau sold
      }
      
      const { error } = await supabase
        .from('listings')
        .update({
          title: editingListing.title,
          description: editingListing.description,
          price: parseFloat(editingListing.price),
          year: parseInt(editingListing.year),
          mileage: parseInt(editingListing.mileage),
          location: editingListing.location,
          category: editingListing.category,
          brand: editingListing.brand,
          model: editingListing.model,
          engine_capacity: parseInt(editingListing.engine_capacity),
          fuel_type: editingListing.fuel_type,
          transmission: editingListing.transmission,
          condition: editingListing.condition,
          color: editingListing.color,
          status: status,
          images: editingListing.images,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingListing.id);
      
      if (error) {
        console.error('❌ Error updating listing:', error);
        alert(`Eroare la actualizarea anunțului: ${error.message}`);
        return;
      }
      
      console.log('✅ Listing updated successfully');
      alert('Anunțul a fost actualizat cu succes!');
      
      setShowEditModal(false);
      setEditingListing(null);
      
      // Actualizăm lista de anunțuri după modificare
      setAllListings(prev => prev.map(listing => 
        listing.id === editingListing.id ? {
          ...listing,
          title: editingListing.title,
          description: editingListing.description,
          price: parseFloat(editingListing.price),
          year: parseInt(editingListing.year),
          mileage: parseInt(editingListing.mileage),
          location: editingListing.location,
          category: editingListing.category,
          brand: editingListing.brand,
          model: editingListing.model,
          engine_capacity: parseInt(editingListing.engine_capacity),
          fuel_type: editingListing.fuel_type,
          transmission: editingListing.transmission,
          condition: editingListing.condition,
          color: editingListing.color,
          status: status,
          images: editingListing.images,
          updated_at: new Date().toISOString()
        } : listing
      ));
    } catch (error) {
      console.error('💥 Error saving listing:', error);
      alert('A apărut o eroare la salvarea modificărilor');
    }
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

  // Funcție îmbunătățită pentru deconectare
  const handleLogout = async () => {
    try {
      console.log('🔄 Admin logging out...');
      
      // Ștergem datele din localStorage ÎNAINTE de a face signOut
      localStorage.removeItem('user');
      
      // Deconectăm utilizatorul
      const { error } = await auth.signOut();
      
      if (error) {
        console.error('❌ Error during admin logout:', error);
        alert(`Eroare la deconectare: ${error.message}`);
      } else {
        console.log('✅ Admin logged out successfully');
        // Redirecționăm către pagina principală
        window.location.href = '/';
      }
    } catch (err) {
      console.error('💥 Unexpected error during admin logout:', err);
      alert('A apărut o eroare la deconectare. Te rugăm să încerci din nou.');
      
      // Forțăm redirecționarea în caz de eroare
      window.location.href = '/';
    }
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
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-nexar-primary mb-4">
              Panou de Administrare
            </h1>
            <p className="text-gray-600 text-lg">
              Gestionează platforma Nexar și monitorizează activitatea
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center space-x-2 self-start"
          >
            <LogOut className="h-4 w-4" />
            <span>Deconectează-te</span>
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
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => loadAdminData()}
                        disabled={isLoadingData}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                        <span>Reîncarcă</span>
                      </button>
                      
                      {selectedListings.length > 0 && (
                        <div className="flex flex-wrap gap-2">
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
                                    onClick={() => handleViewListing(listing.id)}
                                    className="p-1 text-nexar-primary hover:bg-nexar-light rounded"
                                    title="Vezi anunțul"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleEditListing(listing)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Editează"
                                  >
                                    <Edit className="h-4 w-4" />
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
          </div>
        </div>
      </div>

      {/* Modal de editare anunț */}
      {showEditModal && editingListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Editare Anunț</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Informații de bază */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informații de bază</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titlu
                    </label>
                    <input
                      type="text"
                      value={editingListing.title}
                      onChange={(e) => setEditingListing({...editingListing, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preț (EUR)
                    </label>
                    <input
                      type="number"
                      value={editingListing.price}
                      onChange={(e) => setEditingListing({...editingListing, price: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marcă
                    </label>
                    <input
                      type="text"
                      value={editingListing.brand}
                      onChange={(e) => setEditingListing({...editingListing, brand: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={editingListing.model}
                      onChange={(e) => setEditingListing({...editingListing, model: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      An fabricație
                    </label>
                    <input
                      type="number"
                      value={editingListing.year}
                      onChange={(e) => setEditingListing({...editingListing, year: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kilometraj
                    </label>
                    <input
                      type="number"
                      value={editingListing.mileage}
                      onChange={(e) => setEditingListing({...editingListing, mileage: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacitate motor (cc)
                    </label>
                    <input
                      type="number"
                      value={editingListing.engine_capacity}
                      onChange={(e) => setEditingListing({...editingListing, engine_capacity: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Locație
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editingListing.location}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        onFocus={() => {
                          if (editingListing.location.length > 0) {
                            const filtered = romanianCities.filter(city =>
                              city.toLowerCase().includes(editingListing.location.toLowerCase())
                            ).slice(0, 10);
                            setFilteredCities(filtered);
                            setShowLocationDropdown(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay pentru a permite click-ul pe opțiuni
                          setTimeout(() => setShowLocationDropdown(false), 200);
                        }}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                      />
                      
                      {/* Dropdown cu orașe */}
                      {showLocationDropdown && filteredCities.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCities.map((city, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectCity(city)}
                              className="w-full text-left px-4 py-2 hover:bg-nexar-accent hover:text-white transition-colors text-sm border-b border-gray-100 last:border-b-0"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Detalii tehnice */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalii tehnice</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categorie
                    </label>
                    <select
                      value={editingListing.category}
                      onChange={(e) => setEditingListing({...editingListing, category: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    >
                      <option value="sport">Sport</option>
                      <option value="touring">Touring</option>
                      <option value="cruiser">Cruiser</option>
                      <option value="adventure">Adventure</option>
                      <option value="naked">Naked</option>
                      <option value="enduro">Enduro</option>
                      <option value="scooter">Scooter</option>
                      <option value="chopper">Chopper</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Combustibil
                    </label>
                    <select
                      value={editingListing.fuel_type}
                      onChange={(e) => setEditingListing({...editingListing, fuel_type: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    >
                      <option value="benzina">Benzină</option>
                      <option value="electric">Electric</option>
                      <option value="hibrid">Hibrid</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transmisie
                    </label>
                    <select
                      value={editingListing.transmission}
                      onChange={(e) => setEditingListing({...editingListing, transmission: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    >
                      <option value="manuala">Manuală</option>
                      <option value="automata">Automată</option>
                      <option value="semi-automata">Semi-automată</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stare
                    </label>
                    <select
                      value={editingListing.condition}
                      onChange={(e) => setEditingListing({...editingListing, condition: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    >
                      <option value="noua">Nouă</option>
                      <option value="excelenta">Excelentă</option>
                      <option value="foarte_buna">Foarte bună</option>
                      <option value="buna">Bună</option>
                      <option value="satisfacatoare">Satisfăcătoare</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Culoare
                    </label>
                    <input
                      type="text"
                      value={editingListing.color || ''}
                      onChange={(e) => setEditingListing({...editingListing, color: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editingListing.status}
                      onChange={(e) => setEditingListing({...editingListing, status: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                    >
                      <option value="active">Activ</option>
                      <option value="sold">Vândut</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Notă: Doar statusurile "Activ" și "Vândut" sunt vizibile pentru utilizatori
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Descriere */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descriere
                </label>
                <textarea
                  value={editingListing.description || ''}
                  onChange={(e) => setEditingListing({...editingListing, description: e.target.value})}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-nexar-accent focus:border-transparent"
                ></textarea>
              </div>
              
              {/* Imagini */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Imagini</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {editingListing.images && editingListing.images.map((image: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Imagine ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.src = "https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg";
                        }}
                      />
                      {/* Buton de ștergere imagine */}
                      <button
                        onClick={() => handleRemoveImage(image)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Șterge imaginea"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Avertisment pentru imagini */}
                {editingListing.images && editingListing.images.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 flex items-center text-sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Atenție: Anunțul nu are nicio imagine! Anunțurile fără imagini sunt mai puțin vizibile.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={handleSaveListing}
                className="px-6 py-2 bg-nexar-accent text-white rounded-lg font-semibold hover:bg-nexar-gold transition-colors flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Salvează Modificările</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;