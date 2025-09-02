import React, { useEffect, useState } from "react";
import { Copy, CalendarArrowDown, Trash, Home, User, LogOut } from "lucide-react";
import { db } from "@/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
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

const ListingApp = () => {
  const [name, setName] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [isOpenForRegistration, setIsOpenForRegistration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);
  const [registrationMethod, setRegistrationMethod] = useState("pin"); // "pin" or "oauth"
  const [authLoading, setAuthLoading] = useState(false);
  const [groupName, setGroupName] = useState("");

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setName(user.displayName || "");
        setRegEmail(user.email || "");
      }
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get("groupId");
    const date = urlParams.get("date");
    const venue = urlParams.get("venue");
    const startTime = urlParams.get("startTime");
    const endTime = urlParams.get("endTime");

    if (groupId && date && venue && startTime && endTime) {
      const matchedEvent = dates.find(
        (event) =>
          event.groupId === groupId &&
          event.date === date &&
          event.venue === venue &&
          event.startTime === startTime &&
          event.endTime === endTime
      );
      if (matchedEvent) {
        setSelectedDate(matchedEvent.id);
        setSelectedDateDetails(matchedEvent);
        setIsOpenForRegistration(matchedEvent.isOpenForRegistration ?? false);
      }
    }

    setName(localStorage.getItem("myRegName") || "");
    setRegPin(localStorage.getItem("myRegPin") || "");
    setRegEmail(localStorage.getItem("myRegEmail") || "");
  }, [dates]);

  useEffect(() => {
    const fetchDates = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const groupId = urlParams.get("groupId");
      
      let eventsQuery;
      if (groupId) {
        // If groupId is provided, only fetch events from that group
        eventsQuery = query(
          collection(db, "dates"), 
          where("groupId", "==", groupId),
          orderBy("date", "desc")
        );
      } else {
        // If no groupId, fetch all events (backward compatibility)
        eventsQuery = query(collection(db, "dates"), orderBy("date", "desc"));
      }
      
      const querySnapshot = await getDocs(eventsQuery);
      const fetchedDates = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Ensure events are sorted by latest date first (newest to oldest)
      const sortedDates = fetchedDates.sort((a, b) => new Date(b.date) - new Date(a.date));
      setDates(sortedDates);
    };
    fetchDates();
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setRegistrationMethod("oauth");
    } catch (error) {
      console.error("Google sign-in error:", error);
      alert("Failed to sign in with Google. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // const handleFacebookSignIn = async () => {
  //   setAuthLoading(true);
  //   try {
  //     const provider = new FacebookAuthProvider();
  //     await signInWithPopup(auth, provider);
  //     setRegistrationMethod("oauth");
  //   } catch (error) {
  //     console.error("Facebook sign-in error:", error);
  //     alert("Failed to sign in with Facebook. Please try again.");
  //   } finally {
  //     setAuthLoading(false);
  //   }
  // };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setName("");
      setRegEmail("");
      setRegistrationMethod("pin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      const fetchRegistrations = async () => {
        const docRef = doc(db, "dates", selectedDate);
        const regSnap = await getDocs(collection(docRef, "registrations"));
        const regData = regSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((doc) => doc.id);
        setRegistrations(regData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        const dateDetails = dates.find((date) => date.id === selectedDate);
        setSelectedDateDetails(dateDetails);
        
        // Fetch group name if we have groupId
        if (dateDetails?.groupId) {
          try {
            const groupsSnapshot = await getDocs(collection(db, "groups"));
            const groupData = groupsSnapshot.docs
                              .filter(doc => doc.data().groupId === dateDetails.groupId)
                              .map(doc => doc.data())[0];
            setGroupName(groupData?.name || '');
          } catch (error) {
            console.error("Error fetching group name:", error);
            setGroupName('');
          }
        } else {
          setGroupName('');
        }
      };
      fetchRegistrations();
    }
  }, [selectedDate, dates]);

  const sendEmail = async (subjectSuffix, regData, isCancellation) => {
    try{
      // Get group name for email subject and content
      const groupsSnapshot = await getDocs(collection(db, "groups"));
      const groupData = groupsSnapshot.docs
                        .filter(doc => doc.data().groupId === selectedDateDetails.groupId)
                        .map(doc => doc.data())[0];
      
      const groupName = groupData?.name || 'basketbo-lista';
      
      const toEmail = regData.email ? regData.email : 'boss.basketbolista@gmail.com';
      const regEmailDoc = {
        to: toEmail,
        message: {
          subject: `[${groupName}] ${subjectSuffix}`,
          html: `<b>Group</b>: ${groupName}<br><b>Date</b>: ${new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        weekday: "short",
                      }).toUpperCase().replace(",", "") || ''}<br><b>Time</b>: ${new Date(`1970-01-01T${selectedDateDetails.startTime}:00`).toLocaleTimeString("en-GB", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true}).toUpperCase() + ' - ' + new Date(`1970-01-01T${selectedDateDetails.endTime}:00`).toLocaleTimeString("en-GB", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true}).toUpperCase() || ''}<br><b>Venue</b>: ${selectedDateDetails.venue || ''}<br><br><b>Name</b>: ${regData.name || ''}`
        }
      }

      if(!isCancellation){
        regEmailDoc.message.html += `<br><b>PIN</b>: ${regData.pin || ''}`;
      }
      if(isCancellation){
        const adminEmails = [];
        if (groupData) {
          // Add main admin email
          if (groupData.adminEmail) {
            adminEmails.push(groupData.adminEmail);
          }
          // Add co-admin emails
          if (groupData.coAdmins && Array.isArray(groupData.coAdmins)) {
            adminEmails.push(...groupData.coAdmins);
          }
        }
        
        if(adminEmails.length > 0){
          regEmailDoc.bcc = adminEmails.filter(email => email); // Remove any empty emails
        }
      }
      regEmailDoc.message.html += `<br><br><b>Link</b>: ${window.location.href}`;
      addDoc(collection(db, "mail"), regEmailDoc);
    }catch (error) {
      console.error("Error saving email: ", error);
    }
  };

  const notifyNextInWaitlist = async (updatedRegList) => {
    try{
      if(updatedRegList.length >= selectedDateDetails.max){
        const regData = updatedRegList[selectedDateDetails.max - 1];
        if(regData){
          // Get group name for email subject and content
          const groupsSnapshot = await getDocs(collection(db, "groups"));
          const groupData = groupsSnapshot.docs
                            .filter(doc => doc.data().groupId === selectedDateDetails.groupId)
                            .map(doc => doc.data())[0];
          
          const groupName = groupData?.name || 'basketbo-lista';
          
          const toEmail = regData.email ? regData.email : 'boss.basketbolista@gmail.com';
          const regEmailDoc = {
            to: toEmail,
            message: {
              subject: `[${groupName}] Waitlist upgraded to registered`,
              html: `<b>Group</b>: ${groupName}<br><b>Date</b>: ${new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            weekday: "short",
                          }).toUpperCase().replace(",", "") || ''}<br><b>Time</b>: ${new Date(`1970-01-01T${selectedDateDetails.startTime}:00`).toLocaleTimeString("en-GB", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true}).toUpperCase() + ' - ' + new Date(`1970-01-01T${selectedDateDetails.endTime}:00`).toLocaleTimeString("en-GB", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true}).toUpperCase() || ''}<br><b>Venue</b>: ${selectedDateDetails.venue || ''}<br><br><b>Name</b>: ${regData.name || ''}`
            }
          }

          const adminEmails = [];
          if (groupData) {
            // Add main admin email
            if (groupData.adminEmail) {
              adminEmails.push(groupData.adminEmail);
            }
            // Add co-admin emails
            if (groupData.coAdmins && Array.isArray(groupData.coAdmins)) {
              adminEmails.push(...groupData.coAdmins);
            }
          }
          
          if(adminEmails.length > 0){
            regEmailDoc.bcc = adminEmails.filter(email => email); // Remove any empty emails
          }
          regEmailDoc.message.html += `<br><br><b>Link</b>: ${window.location.href}`;
          addDoc(collection(db, "mail"), regEmailDoc);
        }
      }
    }catch (error) {
      console.error("Error saving email: ", error);
    }
  };

  const downloadIcs = async () => {
    const formatDateTime = (date, time) => {
      return new Date(`${date}T${time}:00`).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    const startDateTime = formatDateTime(selectedDateDetails.date, selectedDateDetails.startTime);
    const endDateTime = formatDateTime(selectedDateDetails.date, selectedDateDetails.endTime);
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//basketbo-lista.com//Game Schedule//EN
BEGIN:VEVENT
UID:${new Date().getTime()}@basketbo-lista.com
DTSTAMP:${startDateTime}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${selectedDateDetails.venue}
URL:${window.location.href}
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-${selectedDate}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRegister = async () => {
    if(isSubmitting) return;

    // Validation for PIN method
    if (registrationMethod === "pin") {
      if (!name || name.length < 1 || name.length > 20) {
        alert("Name is required and must be 1-20 chars");
        return;
      }
      if (!regPin || regPin.length < 4 || regPin.length > 10) {
        alert("PIN is required and must be 4-10 chars");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (regEmail && !emailRegex.test(regEmail)){
        alert("Email format is invalid");
        return;
      }
    } else if (registrationMethod === "oauth") {
      // For OAuth, we need the user to be signed in
      if (!user) {
        alert("Please sign in first");
        return;
      }
      if (!name || name.length < 1 || name.length > 20) {
        alert("Name is required and must be 1-20 chars");
        return;
      }
    }

    // Save to localStorage
    localStorage.setItem("myRegName", name);
    if (regPin) localStorage.setItem("myRegPin", regPin);
    if (regEmail) localStorage.setItem("myRegEmail", regEmail);

    try {
      const docRef = doc(db, "dates", selectedDate);
      const registrationsSnapshot = await getDocs(collection(docRef, "registrations"));
      const fetchedRegistrations = registrationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter((reg) => reg.id && reg.name); // Filter out invalid registrations

      setRegistrations(fetchedRegistrations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      
      // Improved name uniqueness check with better null/undefined handling
      const nameExists = fetchedRegistrations.some((reg) => {
        if (!reg.name || !name) return false;
        return reg.name.toLowerCase().trim() === name.toLowerCase().trim();
      });
      
      if (nameExists) {
        alert("Name already exists!");
        return;
      }

      const newRegistration = {
        name,
        timestamp: new Date().toISOString(),
        registrationMethod,
        ...(registrationMethod === "pin" && { pin: regPin, email: regEmail }),
        ...(registrationMethod === "oauth" && { 
          userUid: user.uid, 
          email: user.email,
          authProvider: user.providerData[0]?.providerId 
        }),
      };

      setIsSubmitting(true);

      let addedDocRef;
      addedDocRef = await addDoc(collection(docRef, "registrations"), newRegistration);
      setRegistrations([...fetchedRegistrations, { id: addedDocRef.id, ...newRegistration }].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      alert("Registered successfully!");

      if(regEmail || user?.email){
        sendEmail('Registration Completed', newRegistration, false);
      }
      setTimeout(() => setIsSubmitting(false), 1000);
    } catch (error) {
      console.error("Error registering: ", error);
    }
  };

  const isUserAdminForGroup = async (userEmail, groupId) => {
    if (!userEmail || !groupId) return false;
    
    try {
      const groupsSnapshot = await getDocs(collection(db, "groups"));
      const groupData = groupsSnapshot.docs
                        .filter(doc => doc.data().groupId === groupId)
                        .map(doc => doc.data())[0];
      
      if (!groupData) return false;
      
      // Check if user is main admin
      if (groupData.adminEmail === userEmail) return true;
      
      // Check if user is co-admin
      if (groupData.coAdmins && Array.isArray(groupData.coAdmins)) {
        return groupData.coAdmins.includes(userEmail);
      }
      
      return false;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  };

  const handleCancel = async (id, isWaitlist) => { 
    try {
      const docRef = doc(db, "dates", selectedDate, "registrations", id);
      const registrationDoc = await getDoc(docRef);

      if(isPastDate(selectedDateDetails?.date)){
        alert("Cannot cancel registrations for past events.");
        return;
      }

      const regData = registrationDoc.data();
      
      // Ask for confirmation before cancelling
      const confirmMessage = `Are you sure you want to cancel ${regData.name}'s ${isWaitlist ? 'waitlist ' : ''}registration?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      const currentUserEmail = user?.email;
      
      // Check if current user is admin/co-admin for this group
      const isAdmin = currentUserEmail ? await isUserAdminForGroup(currentUserEmail, selectedDateDetails.groupId) : false;
      
      // Check if current user's email matches the registration email
      const isOwner = currentUserEmail && regData.email === currentUserEmail;
      
      // Skip PIN verification if user is admin or owns the registration
      if (!isAdmin && !isOwner) {
        const pin = prompt("Enter Registration PIN to cancel:");
        if (!pin) return;

        if (!regData.pin) {
          alert("Registration has no PIN, cannot cancel");
          return;
        }

        const isPinMatching = regData.pin === pin;

        if (!isPinMatching) {
          alert("Invalid PIN!");
          return;
        }
      }

      sendEmail(`${isWaitlist ? 'Waitlist ' : ''}Cancellation`, regData, true);

      await deleteDoc(docRef);
      const updatedRegList = registrations.filter((reg) => reg.id !== id);
      setRegistrations(updatedRegList);
      if(!isWaitlist){
        setTimeout(() => notifyNextInWaitlist(updatedRegList), 1000);
      }
    } catch (error) {
      console.error("Error cancelling registration: ", error);
    }
  };

  const handleTogglePaid = async (id, isPaid) => {
    try {
      const docRef = doc(db, "dates", selectedDate, "registrations", id);
      const registrationDoc = await getDoc(docRef);
      const regData = registrationDoc.data();
      
      // Ask for confirmation before changing payment status
      const newStatus = isPaid ? "unpaid" : "paid";
      const confirmMessage = `Are you sure you want to mark ${regData.name}'s registration as ${newStatus}?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      const currentUserEmail = user?.email;
      
      // Check if current user is admin/co-admin for this group
      const isAdmin = currentUserEmail ? await isUserAdminForGroup(currentUserEmail, selectedDateDetails.groupId) : false;
      
      // Check if current user's email matches the registration email
      const isOwner = currentUserEmail && regData.email === currentUserEmail;
      
      // Skip PIN verification if user is admin or owns the registration
      if (!isAdmin && !isOwner) {
        const pin = prompt("Enter Registration PIN to update payment:");
        if (!pin) return;

        if (!regData.pin) {
          alert("Registration has no PIN, cannot update payment status");
          return;
        }

        const isPinMatching = regData.pin === pin;

        if (!isPinMatching) {
          alert("Invalid PIN!");
          return;
        }
      }

      await updateDoc(docRef, { paid: !isPaid });
      setRegistrations(registrations.map((reg) =>
        reg.id === id ? { ...reg, paid: !isPaid } : reg
      ));
    } catch (error) {
      console.error("Error updating payment status: ", error);
    }
  };

  const copyDetails = () => {
    if (selectedDateDetails) {
      const text = `Link: ${window.location.href}
      
${groupName ? `Group: ${groupName}\n` : ''}Date: ${new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        weekday: "short",
      }).toUpperCase().replace(",", "") || ''}
Venue: ${selectedDateDetails.venue || ''}
Max: ${selectedDateDetails.max + ' players' || ''}
Time: ${new Date(`1970-01-01T${selectedDateDetails.startTime}:00`).toLocaleTimeString("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true}).toUpperCase() + ' - ' + new Date(`1970-01-01T${selectedDateDetails.endTime}:00`).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true}).toUpperCase() || ''}
Pay To: ${selectedDateDetails.pay_to || ''}

Registrations:
${(registrations || []).slice(0, selectedDateDetails.max).map((r, i) => `${i + 1}. ${r.name} ${r.paid ? ' - Paid' : ''}`).join('\n')}

Waitlist:
${(registrations || []).slice(selectedDateDetails.max, registrations.length).map((w, i) => `${i + 1}. ${w.name}`).join('\n')}`;
      navigator.clipboard.writeText(text.toString());
      alert("Full details copied to clipboard!");
    }
  };

  const isPastDate = (date) => new Date(date) < new Date();

  return (
    <div className="p-2 md:p-4">
      <div className="flex items-center justify-between bg-blue-200 text-gray py-3 md:py-4 px-4 md:px-6 mb-4 rounded-md shadow-md">
        <div className="flex justify-start">
          <img src={blIcon} className="w-6 md:w-8 mr-2" />
          <h1 className="text-lg md:text-xl font-semibold">basketbo-lista</h1>
        </div>
        <div className="flex justify-end space-x-1 md:space-x-2">
          {user && (
            <Button onClick={handleSignOut} size="sm" className="text-xs md:text-sm bg-gray-500 p-1.5 md:p-2 rounded-full" title="Sign Out">
              <LogOut className="w-3 md:w-4 h-3 md:h-4" />
            </Button>
          )}
          <Button onClick={() => window.location.href = '/'} size="sm" className="text-xs md:text-sm bg-gray-500 p-1.5 md:p-2 rounded-full" title="Home">
            <Home className="w-3 md:w-4 h-3 md:h-4" />
          </Button>
        </div>
      </div>

      {selectedDateDetails && (
        <Card className="mb-4 p-4 md:p-6">
          <div className="space-y-2 md:space-y-3 mb-4 text-sm md:text-base">
            {groupName && (
              <p><strong>Group:</strong> {groupName}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <p><strong>Date:</strong> {new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        weekday: "short",
      }).toUpperCase().replace(",", "")}</p>
              <p><strong>Venue:</strong> {selectedDateDetails.venue}</p>
              <p><strong>Max:</strong> {selectedDateDetails.max} players</p>
              <p><strong>Pay To:</strong> {selectedDateDetails.pay_to}</p>
            </div>
            <p><strong>Time:</strong> {new Date(`1970-01-01T${selectedDateDetails.startTime}:00`).toLocaleTimeString("en-GB", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true}).toUpperCase()} - {new Date(`1970-01-01T${selectedDateDetails.endTime}:00`).toLocaleTimeString("en-GB", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true}).toUpperCase()}</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={copyDetails} size="sm" className="flex items-center text-xs md:text-sm bg-white px-3 py-2 rounded-lg border" title="Copy Details">
              <Copy className="w-4 h-4 text-blue-500 mr-1" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button onClick={downloadIcs} size="sm" className="flex items-center text-xs md:text-sm bg-white px-3 py-2 rounded-lg border" title="Download Calendar">
              <CalendarArrowDown className="w-4 h-4 text-blue-500 mr-1" />
              <span className="hidden sm:inline">Calendar</span>
            </Button>
          </div>
        </Card>
      )}

      {selectedDate && isOpenForRegistration && !isPastDate(selectedDateDetails?.date) && (
        <Card className="mb-4 p-4 md:p-6">
          <div className="mb-4">
            <h3 className="text-lg md:text-xl font-semibold mb-4 text-center md:text-left">Register for this Event</h3>
            
            {/* Registration Method Selection */}
            <div className="mb-4">
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-3">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="registrationMethod" 
                    value="pin" 
                    checked={registrationMethod === "pin"}
                    onChange={(e) => setRegistrationMethod(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Register with PIN & Email</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="registrationMethod" 
                    value="oauth" 
                    checked={registrationMethod === "oauth"}
                    onChange={(e) => setRegistrationMethod(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Sign in with Google</span>
                </label>
              </div>
            </div>

            {/* OAuth Sign-in Buttons */}
            {registrationMethod === "oauth" && !user && (
              <div className="mb-4 space-y-2">
                <Button 
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  variant="google"
                  size="sm"
                  className="w-full"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {authLoading ? "Signing in..." : "Sign in with Google"}
                </Button>
                {/* <Button 
                  onClick={handleFacebookSignIn}
                  disabled={authLoading}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {authLoading ? "Signing in..." : "Sign in with Facebook"}
                </Button> */}
              </div>
            )}

            {/* User Info Display for OAuth */}
            {registrationMethod === "oauth" && user && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-700">Signed in as: {user.displayName || user.email}</span>
                </div>
              </div>
            )}

            {/* Registration Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 italic mb-1">* Name (1-20 chars)</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  placeholder={user?.displayName || "Enter your name"}
                />
              </div>
              
              {registrationMethod === "pin" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 italic mb-1">* Set own PIN (4-10 chars) to protect your registration</label>
                    <Input
                      type="password"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      className="w-full"
                      placeholder="Create a secure PIN"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 italic mb-1">Set email for notifications (optional)</label>
                    <Input
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </>
              )}
            </div>

            <Button 
              onClick={handleRegister} 
              size="md" 
              className="text-md p-2 mt-4 rounded-xl w-full" 
              disabled={isSubmitting || (registrationMethod === "oauth" && !user)}
            >
              {isSubmitting ? "Registering..." : "Register for Event"}
            </Button>

            {registrationMethod === "oauth" && !user && (
              <p className="text-xs text-gray-500 mt-2 text-center">Please sign in first to register</p>
            )}
          </div>
        </Card>
      )}

      {isOpenForRegistration && registrations.length > 0 && (
        <Card className="mb-4 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Registrations</h2>
          {registrations.slice(0, selectedDateDetails.max).map((reg, index) => (
            <div key={`reg-${reg.id}`} className="flex justify-between items-center mb-1">
              <div className="flex items-center space-x-1">
                <span className="text-sm" onClick={() => alert(reg.name + " registered on " + new Date(reg.timestamp).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                  hour12: true
                }))}>{index + 1}. {reg.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button onClick={() => handleTogglePaid(reg.id, reg.paid)} size="sm" variant={reg.paid ? "secondary" : "outline"} className="text-xs px-2 py-1 rounded-md">
                  {reg.paid ? "Paid" : "Unpaid"}
                </Button>
                <Button onClick={() => handleCancel(reg.id, false)} size="sm" title="Cancel Registration" className="bg-white text-xs p-1 rounded-full">
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
          {registrations.length > selectedDateDetails.max && (
            <>
              <h3 className="text-lg font-semibold mt-6 mb-2">Waitlist</h3>
              {registrations.slice(selectedDateDetails.max, registrations.length).map((reg, index) => (
                <div key={`wait-${reg.id}`} className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm" onClick={() => alert(reg.name + " waitlisted on " + new Date(reg.timestamp).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                      hour12: true
                    }))}>{index + 1}. {reg.name}</span>
                  </div>
                  <Button onClick={() => handleCancel(reg.id, true)} size="sm" className="bg-white text-xs p-1 rounded-full" title="Cancel Registration">
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </>
          )}
        </Card>
      )}
      {selectedDateDetails && !isOpenForRegistration && (
        <Card className="mb-4 p-4 md:p-6 text-center">
          <p className="text-gray-600 italic">Registration is not open for this event</p>
        </Card>
      )}
      
      {!selectedDateDetails && (
        <Card className="mb-4 p-6 md:p-8 text-center">
          <h2 className="text-lg md:text-xl font-semibold mb-3">No Event Selected</h2>
          <p className="text-gray-600 mb-4 text-sm md:text-base">
            {new URLSearchParams(window.location.search).get("groupId") 
              ? "Please select an event from a valid shared link from your league admin." 
              : "Please select an event from a shared link or contact your league admin."
            }
          </p>
          <Button onClick={() => window.location.href = '/'} className="w-full sm:w-auto">
            Go to Home Page
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ListingApp;