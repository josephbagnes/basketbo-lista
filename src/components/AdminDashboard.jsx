import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Plus, 
  Edit, 
  Trash, 
  Eye,
  LogOut,
  Settings,
  ExternalLink,
  Home,
  ChevronLeft,
  ChevronRight,
  List,
  Menu,
  X
} from "lucide-react";
import { db } from "@/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy 
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  // FacebookAuthProvider,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import blIcon from "@/assets/blIcon.png";

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    groupName: "",
    coAdmins: []
  });
  const [eventFormData, setEventFormData] = useState({
    date: "",
    venue: "",
    maxPlayers: "",
    payTo: "",
    startTime: "",
    endTime: "",
    isOpenForRegistration: true
  });

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await loadUserGroups(user.email);
      } else {
        setShowLoginModal(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const loadUserGroups = async (email) => {
    try {
      // Load groups where user is admin
      const adminGroupQuery = query(
        collection(db, "groups"), 
        where("adminEmail", "==", email)
      );
      const adminGroupSnapshot = await getDocs(adminGroupQuery);
      
      // Load groups where user is co-admin
      const coAdminGroupQuery = query(
        collection(db, "groups"), 
        where("coAdmins", "array-contains", email)
      );
      const coAdminGroupSnapshot = await getDocs(coAdminGroupQuery);
      
      const allGroups = [];
      
      adminGroupSnapshot.docs.forEach(doc => {
        allGroups.push({ 
          id: doc.id, 
          ...doc.data(), 
          role: 'admin' 
        });
      });
      
      coAdminGroupSnapshot.docs.forEach(doc => {
        // Avoid duplicates if user is both admin and co-admin
        if (!allGroups.find(g => g.id === doc.id)) {
          allGroups.push({ 
            id: doc.id, 
            ...doc.data(), 
            role: 'co-admin' 
          });
        }
      });
      
      setUserGroups(allGroups);
      
      if (allGroups.length > 0) {
        // Set current group from localStorage or first group
        const savedGroupId = localStorage.getItem("currentGroupId");
        const savedGroup = allGroups.find(g => g.id === savedGroupId) || allGroups[0];
        setCurrentGroup(savedGroup);
        await loadEvents(savedGroup.groupId);
        setShowLoginModal(false);
      } else {
        setCurrentGroup(null);
        setShowLoginModal(true);
      }
    } catch (error) {
      console.error("Error loading user groups:", error);
      setShowLoginModal(true);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // const handleFacebookSignIn = async () => {
  //   setAuthLoading(true);
  //   setError("");
  //   try {
  //     const provider = new FacebookAuthProvider();
  //     provider.addScope('email');
  //     
  //     await signInWithPopup(auth, provider);
  //   } catch (error) {
  //     console.error("Facebook sign-in error:", error);
  //     setError("Failed to sign in with Facebook. Please try again.");
  //   } finally {
  //     setAuthLoading(false);
  //   }
  // };

  const loadEvents = async (groupId) => {
    try {
      const eventsQuery = query(
        collection(db, "dates"), 
        where("groupId", "==", groupId),
        orderBy("date", "desc")
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ensure events are sorted by latest date first (newest to oldest)
      const sortedEvents = eventsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEvents(sortedEvents);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSwitchGroup = async (group) => {
    setCurrentGroup(group);
    localStorage.setItem("currentGroupId", group.id);
    await loadEvents(group.groupId);
    setShowGroupSwitcher(false);
  };

  const handleOpenSettings = () => {
    if (currentGroup) {
      setSettingsForm({
        groupName: currentGroup.name,
        coAdmins: currentGroup.coAdmins || []
      });
      setShowSettingsModal(true);
    }
  };

  const handleAddCoAdmin = () => {
    const email = prompt("Enter co-admin email address:");
    if (email && email.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        if (!settingsForm.coAdmins.includes(email) && email !== currentGroup.adminEmail) {
          setSettingsForm(prev => ({
            ...prev,
            coAdmins: [...prev.coAdmins, email]
          }));
        } else {
          alert("This email is already a co-admin or is the main admin.");
        }
      } else {
        alert("Please enter a valid email address.");
      }
    }
  };

  const handleRemoveCoAdmin = (emailToRemove) => {
    setSettingsForm(prev => ({
      ...prev,
      coAdmins: prev.coAdmins.filter(email => email !== emailToRemove)
    }));
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Check if group name is unique (if changed)
      if (settingsForm.groupName !== currentGroup.name) {
        const groupQuery = query(
          collection(db, "groups"), 
          where("name", "==", settingsForm.groupName.trim())
        );
        const existingGroups = await getDocs(groupQuery);
        
        if (!existingGroups.empty) {
          setError("This group name is already taken. Please choose another one.");
          return;
        }
      }

      // Update group document
      const groupRef = doc(db, "groups", currentGroup.id);
      await updateDoc(groupRef, {
        name: settingsForm.groupName.trim(),
        coAdmins: settingsForm.coAdmins,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setCurrentGroup(prev => ({
        ...prev,
        name: settingsForm.groupName.trim(),
        coAdmins: settingsForm.coAdmins
      }));
      
      // Update userGroups array
      setUserGroups(prev => prev.map(group => 
        group.id === currentGroup.id 
          ? { ...group, name: settingsForm.groupName.trim(), coAdmins: settingsForm.coAdmins }
          : group
      ));

      alert("Settings updated successfully!");
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Error updating settings:", error);
      setError("Error updating settings. Please try again.");
    }
  };

  const handleEventFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventFormData({
      date: "",
      venue: "",
      maxPlayers: "",
      payTo: "",
      startTime: "",
      endTime: "",
      isOpenForRegistration: true
    });
    setShowEventModal(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventFormData({
      date: event.date,
      venue: event.venue,
      maxPlayers: event.max.toString(),
      payTo: event.pay_to,
      startTime: event.startTime,
      endTime: event.endTime,
      isOpenForRegistration: event.isOpenForRegistration || false
    });
    setShowEventModal(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    
    if (!currentGroup) return;

    try {
      const eventData = {
        date: new Date(eventFormData.date).toISOString().split("T")[0],
        venue: eventFormData.venue,
        max: parseInt(eventFormData.maxPlayers, 10),
        pay_to: eventFormData.payTo,
        startTime: eventFormData.startTime,
        endTime: eventFormData.endTime,
        isOpenForRegistration: eventFormData.isOpenForRegistration,
        groupId: currentGroup.groupId,
        createdBy: currentGroup.adminEmail,
        createdAt: new Date().toISOString()
      };

      if (editingEvent) {
        await updateDoc(doc(db, "dates", editingEvent.id), eventData);
        alert("Event updated successfully!");
      } else {
        await addDoc(collection(db, "dates"), eventData);
        alert("Event created successfully!");
      }
      
      setShowEventModal(false);
      await loadEvents(currentGroup.groupId);
    } catch (error) {
      console.error("Error submitting event:", error);
      alert("Error saving event. Please try again.");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    try {
      await deleteDoc(doc(db, "dates", eventId));
      alert("Event deleted successfully!");
      await loadEvents(currentGroup.groupId);
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Error deleting event. Please try again.");
    }
  };

  const generateEventLink = (event) => {
    const url = new URL(window.location.origin);
    url.pathname = '/events';
    url.searchParams.set("groupId", event.groupId);
    url.searchParams.set("date", event.date);
    url.searchParams.set("venue", event.venue);
    url.searchParams.set("startTime", event.startTime);
    url.searchParams.set("endTime", event.endTime);
    return url.toString();
  };

  const copyEventLink = (event) => {
    const link = generateEventLink(event);
    navigator.clipboard.writeText(link);
    alert("Event link copied to clipboard!");
  };

  const redirectToEvent = (event) => {
    const link = generateEventLink(event);
    window.open(link, '_blank');
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date) => {
    // Format date as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const eventsForDay = events.filter(event => event.date === dateStr);
    return eventsForDay;
  };

  const navigateMonth = (direction) => {
    setCurrentCalendarMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentCalendarMonth(new Date());
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(currentCalendarMonth);
    const firstDay = getFirstDayOfMonth(currentCalendarMonth);
    const monthName = currentCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date in local timezone to avoid timezone shift issues
      const date = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth(), day);
      const eventsForDay = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      days.push(
        <div key={day} className={`h-24 md:h-32 border border-gray-200 p-1 md:p-2 overflow-hidden ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
          <div className={`text-sm md:text-base font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {eventsForDay.slice(0, 2).map((event, index) => (
              <div 
                key={index}
                className="text-xs bg-green-100 text-green-800 p-1 rounded cursor-pointer hover:bg-green-200 transition-colors"
                onClick={() => redirectToEvent(event)}
                title={`${event.venue} - ${event.startTime}`}
              >
                <div className="font-medium truncate">{event.venue}</div>
                <div className="truncate">
                  {new Date(`1970-01-01T${event.startTime}:00`).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                  })}
                </div>
              </div>
            ))}
            {eventsForDay.length > 2 && (
              <div className="text-xs text-gray-500">+{eventsForDay.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <Card className="p-4 md:p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg md:text-xl font-semibold">{monthName}</h3>
            <Button variant="outline" size="xs" onClick={goToToday} title="Go to current month">
              Today
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(dayName => (
            <div key={dayName} className="text-center text-sm font-medium text-gray-500 py-2">
              {dayName}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <img src={blIcon} className="w-16 h-16 mx-auto mb-4" alt="Basketball Logo" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showLoginModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <img src={blIcon} className="w-12 h-12 mx-auto mb-4" alt="Basketball Logo" />
            <h2 className="text-xl font-bold mb-2">Admin Login</h2>
            <p className="text-gray-600">Sign in to access your admin dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button 
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              variant="google"
              className="w-full py-3"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {authLoading ? "Signing in..." : "Continue with Google"}
            </Button>

            {/* <Button 
              onClick={handleFacebookSignIn}
              disabled={authLoading}
              className="w-full py-3 bg-blue-600 text-white hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {authLoading ? "Signing in..." : "Continue with Facebook"}
            </Button> */}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have a group?{" "}
              <button 
                onClick={() => window.location.href = '/signup'}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Create one here
              </button>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentGroup && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-4">No Group Found</h2>
          <p className="text-gray-600 mb-4">You don't have a group associated with this account. Please create one first.</p>
          <Button onClick={() => window.location.href = '/signup'}>
            Create Group
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center">
            <img src={blIcon} className="w-10 h-10 mr-4" alt="Basketball Logo" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{currentGroup.name}</h1>
              <p className="text-gray-600">ID: {currentGroup.groupId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              {userGroups.length > 1 ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowGroupSwitcher(!showGroupSwitcher)}
                  >
                    Switch Group ({userGroups.length})
                  </Button>
                  {showGroupSwitcher && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                      <div className="p-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Groups</h3>
                        {userGroups.map((group) => (
                          <button
                            key={group.id}
                            onClick={() => handleSwitchGroup(group)}
                            className={`w-full text-left p-2 rounded text-sm hover:bg-gray-50 ${
                              currentGroup.id === group.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            <div className="font-medium">{group.name}</div>
                            <div className="text-xs text-gray-500">
                              {group.role === 'admin' ? 'Admin' : 'Co-Admin'} • ID: {group.groupId}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="border-t p-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.location.href = '/signup'}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Group
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/signup'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Group
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleOpenSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <img src={blIcon} className="w-10 h-10 mr-4" alt="Basketball Logo" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{currentGroup.name}</h2>
                  <p className="text-gray-600">ID: {currentGroup.groupId}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <Card className="p-4 mb-4">
              <div className="grid grid-cols-1 gap-3">
                {userGroups.length > 1 ? (
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowGroupSwitcher(!showGroupSwitcher)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Switch Group ({userGroups.length})
                    </Button>
                    {showGroupSwitcher && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border z-50">
                        <div className="p-2">
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Groups</h3>
                          {userGroups.map((group) => (
                            <button
                              key={group.id}
                              onClick={() => handleSwitchGroup(group)}
                              className={`w-full text-left p-2 rounded text-sm hover:bg-gray-50 ${
                                currentGroup.id === group.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                              }`}
                            >
                              <div className="font-medium">{group.name}</div>
                              <div className="text-xs text-gray-500">
                                {group.role === 'admin' ? 'Admin' : 'Co-Admin'} • ID: {group.groupId}
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="border-t p-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => window.location.href = '/signup'}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Group
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.href = '/signup'}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Group
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={handleOpenSettings} className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/'} className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-500 mx-auto md:mx-0 mt-2 md:mt-0" />
            </div>
          </Card>
          
          <Card className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {events.filter(e => e.isOpenForRegistration).length}
                </p>
              </div>
              <Users className="w-6 h-6 md:w-8 md:h-8 text-green-500 mx-auto md:mx-0 mt-2 md:mt-0" />
            </div>
          </Card>
          
          <Card className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm font-medium text-gray-600">This Month</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {events.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).length}
                </p>
              </div>
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-orange-500 mx-auto md:mx-0 mt-2 md:mt-0" />
            </div>
          </Card>
          
          <Card className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="text-center md:text-left">
                <p className="text-xs md:text-sm font-medium text-gray-600">Group ID</p>
                <p className="text-sm md:text-lg font-bold text-gray-900 break-all">{currentGroup.groupId}</p>
              </div>
              <MapPin className="w-6 h-6 md:w-8 md:h-8 text-purple-500 mx-auto md:mx-0 mt-2 md:mt-0" />
            </div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="sm:flex-none"
            >
              <List />
            </Button>
            <Button 
              variant={viewMode === 'calendar' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="sm:flex-none"
            >
              <Calendar />
            </Button>
            <Button size="sm" onClick={handleCreateEvent} className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
              <Plus />
              Create Event
            </Button>
          </div>
        </div>

        {events.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No events yet</h3>
            <p className="text-gray-500 mb-4">Create your first basketball event to get started.</p>
            <Button onClick={handleCreateEvent}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Event
            </Button>
          </Card>
        ) : (
          <>
            {viewMode === 'calendar' ? (
              renderCalendarView()
            ) : (
              <div className="grid gap-4">
                {events.map((event) => (
                  <Card key={event.id} className="p-4 md:p-6">
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-2">{event.venue}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.isOpenForRegistration 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.isOpenForRegistration ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                        <p><strong>Max Players:</strong> {event.max}</p>
                        <p><strong>Pay To:</strong> {event.pay_to}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyEventLink(event)}
                          className="text-xs"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => redirectToEvent(event)}
                          className="text-xs"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditEvent(event)}
                          className="text-xs"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-xs hover:bg-red-50 hover:border-red-200"
                        >
                          <Trash className="w-4 h-4 mr-1 text-red-500" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-800 mr-3">{event.venue}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.isOpenForRegistration 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.isOpenForRegistration ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                            <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                          </div>
                          <div>
                            <p><strong>Max Players:</strong> {event.max}</p>
                            <p><strong>Pay To:</strong> {event.pay_to}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => copyEventLink(event)}
                          title="Copy Event Link"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => redirectToEvent(event)}
                          title="Go to Event Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditEvent(event)}
                          title="Edit Event"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="hover:bg-red-50 hover:border-red-200"
                          title="Delete Event"
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {showEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h2>
                <form onSubmit={handleSubmitEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <Input
                      type="date"
                      name="date"
                      value={eventFormData.date}
                      onChange={handleEventFormChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                    <Input
                      name="venue"
                      value={eventFormData.venue}
                      onChange={handleEventFormChange}
                      placeholder="Basketball Court Name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Players</label>
                    <Input
                      type="number"
                      name="maxPlayers"
                      value={eventFormData.maxPlayers}
                      onChange={handleEventFormChange}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pay To</label>
                    <Input
                      name="payTo"
                      value={eventFormData.payTo}
                      onChange={handleEventFormChange}
                      placeholder="Payment details"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <Input
                        type="time"
                        name="startTime"
                        value={eventFormData.startTime}
                        onChange={handleEventFormChange}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <Input
                        type="time"
                        name="endTime"
                        value={eventFormData.endTime}
                        onChange={handleEventFormChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isOpenForRegistration"
                      name="isOpenForRegistration"
                      checked={eventFormData.isOpenForRegistration}
                      onChange={handleEventFormChange}
                      className="mr-2"
                    />
                    <label htmlFor="isOpenForRegistration" className="text-sm text-gray-700">
                      Open for registration
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowEventModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingEvent ? "Update Event" : "Create Event"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Group Settings</h2>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                    <Input
                      value={settingsForm.groupName}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, groupName: e.target.value }))}
                      placeholder="Enter group name"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be unique across all groups</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Co-Admins</label>
                    <div className="space-y-2">
                      {settingsForm.coAdmins.map((email, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <span className="text-sm text-gray-700">{email}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveCoAdmin(email)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddCoAdmin}
                        className="w-full border-dashed"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Co-Admin
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Co-admins can manage events and settings for this group. They will receive notifications for registrations and cancellations.
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowSettingsModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Update Settings
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;