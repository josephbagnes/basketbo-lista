import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, 
  List, 
  LogOut,
  MapPin,
  Clock,
  Users,
  Home,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { db } from "@/firebase";
import { 
  collection, 
  getDocs
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

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await loadUserRegistrations(user.uid, user.email);
        setShowLoginModal(false);
      } else {
        setShowLoginModal(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const loadUserRegistrations = async (userUid, userEmail) => {
    try {
      // Get all events
      const eventsSnapshot = await getDocs(collection(db, "dates"));
      const userRegs = [];

      // Check each event for user registrations
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = { id: eventDoc.id, ...eventDoc.data() };
        const registrationsSnapshot = await getDocs(collection(eventDoc.ref, "registrations"));
        
        registrationsSnapshot.docs.forEach(regDoc => {
          const regData = regDoc.data();
          // Check if this registration belongs to the current user
          if (regData.userUid === userUid || regData.email === userEmail) {
            userRegs.push({
              ...regData,
              regId: regDoc.id,
              event: eventData
            });
          }
        });
      }

      // Sort by event date and remove duplicates based on event.id
      const sortedRegs = userRegs.sort((a, b) => new Date(b.event.date) - new Date(a.event.date));
      
      // Filter to only unique events (in case user registered multiple times for same event)
      const uniqueRegs = sortedRegs.filter((reg, index, array) => 
        index === array.findIndex(r => r.event.id === reg.event.id)
      );
      
      setRegistrations(uniqueRegs);
    } catch (error) {
      console.error("Error loading user registrations:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
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
  //     await signInWithPopup(auth, provider);
  //   } catch (error) {
  //     console.error("Facebook sign-in error:", error);
  //     setError("Failed to sign in with Facebook. Please try again.");
  //   } finally {
  //     setAuthLoading(false);
  //   }
  // };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setRegistrations([]);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isPastEvent = (date) => new Date(date) < new Date();
  const isUpcomingEvent = (date) => {
    const eventDate = new Date(date);
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return eventDate >= today && eventDate <= sevenDaysFromNow;
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
    
    const eventsForDay = registrations.filter(reg => reg.event.date === dateStr);
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
            {eventsForDay.slice(0, 2).map((reg, index) => (
              <div 
                key={index}
                className="text-xs bg-blue-100 text-blue-800 p-1 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                onClick={() => window.open(generateEventLink(reg.event), '_blank')}
                title={`${reg.event.venue} - ${reg.event.startTime}`}
              >
                <div className="font-medium truncate">{reg.event.venue}</div>
                <div className="truncate">
                  {new Date(`1970-01-01T${reg.event.startTime}:00`).toLocaleTimeString("en-US", {
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
            <h2 className="text-xl font-bold mb-2">Sign In</h2>
            <p className="text-gray-600">Sign in to view your registered events</p>
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
              Want to go back?{" "}
              <button 
                onClick={() => window.location.href = '/'}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Return to Home
              </button>
            </p>
          </div>
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
              <h1 className="text-2xl font-bold text-gray-800">My Games</h1>
              <p className="text-gray-600">{user?.displayName || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
            <div className="flex items-center mb-4">
              <img src={blIcon} className="w-10 h-10 mr-4" alt="Basketball Logo" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">My Games</h1>
                <p className="text-gray-600">{user?.displayName || user?.email}</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Controls Card */}
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3">
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
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div className="flex space-x-2">
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('list')}
              className="flex-1 sm:flex-none"
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button 
              variant={viewMode === 'calendar' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="flex-1 sm:flex-none"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>

        {registrations.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Events Registered</h3>
            <p className="text-gray-500 mb-4">You haven't registered for any events yet.</p>
            <Button onClick={() => window.location.href = '/'}>
              Find Events to Join
            </Button>
          </Card>
        ) : (
          <>
            {viewMode === 'calendar' ? (
              renderCalendarView()
            ) : (
              <div className="space-y-4">
                {registrations.map((reg) => (
                  <Card key={`${reg.event.id}-${reg.regId}`} className="p-4 md:p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{reg.event.venue}</h3>
                        {isUpcomingEvent(reg.event.date) && (
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">
                            Upcoming
                          </span>
                        )}
                        {isPastEvent(reg.event.date) && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full mt-1">
                            Past Event
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(reg.event.date).toLocaleDateString("en-US", {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(`1970-01-01T${reg.event.startTime}:00`).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        })} - {new Date(`1970-01-01T${reg.event.endTime}:00`).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {reg.event.venue}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Max {reg.event.max} players
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(generateEventLink(reg.event), '_blank')}
                        className="w-full"
                      >
                        View Event Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;