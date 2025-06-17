import React, { useEffect, useState } from "react";
import { List, CalendarPlus, Share, Link, Trash, Pencil, Copy, CalendarArrowDown } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
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
  orderBy,
  setDoc,
} from "firebase/firestore";
import blIcon from "@/assets/blIcon.png";

const ListingApp = () => {
  const [name, setName] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDateModal, setSelectedDateModal] = useState("");
  const [selectedDateModalDetails, setSelectedDateModalDetails] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showListEventModal, setShowListEventModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isOpenForRegistration, setIsOpenForRegistration] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get("date");
    const venue = urlParams.get("venue");
    const startTime = urlParams.get("startTime");
    const endTime = urlParams.get("endTime");

    if (date && venue && startTime && endTime) {
      const matchedEvent = dates.find(
        (event) =>
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
      const querySnapshot = await getDocs(query(collection(db, "dates"), orderBy("date", "desc")));
      const fetchedDates = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDates(fetchedDates);
    };
    fetchDates();
  }, []);


  useEffect(() => {
    if (selectedDate) {
      const fetchRegistrations = async () => {
        const docRef = doc(db, "dates", selectedDate);
        const regSnap = await getDocs(collection(docRef, "registrations"));
        const regData = regSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((doc) => doc.id);
        setRegistrations(regData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        const dateDetails = dates.find((date) => date.id === selectedDate);
        setSelectedDateDetails(dateDetails);
      };
      fetchRegistrations();
    }
  }, [selectedDate, dates]);

  const sendEmail = async (subjectSuffix, regData, isCancellation) => {
    try{
      const toEmail = regData.email ? regData.email : 'boss.basketbolista@gmail.com';
      const regEmailDoc = {
        to: toEmail,
        message: {
          subject: `[basketbo-lista] ${subjectSuffix}`,
          html: `<b>Date</b>: ${new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
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
        const adminsSnapshot = await getDocs(collection(db, "admins"));
        const adminEmails = adminsSnapshot.docs
                          .map(doc => doc.data().email)
                          .filter(email => email);
        if(adminEmails){
          regEmailDoc.bcc = adminEmails;
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
          const toEmail = regData.email ? regData.email : 'boss.basketbolista@gmail.com';
          const regEmailDoc = {
            to: toEmail,
            message: {
              subject: `[basketbo-lista] Waitlist upgraded to registered`,
              html: `<b>Date</b>: ${new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
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

          const adminsSnapshot = await getDocs(collection(db, "admins"));
          const adminEmails = adminsSnapshot.docs
                            .map(doc => doc.data().email)
                            .filter(email => email);
          if(adminEmails){
            regEmailDoc.bcc = adminEmails;
          }
          regEmailDoc.message.html += `<br><br><b>Link</b>: ${window.location.href}`;
          addDoc(collection(db, "mail"), regEmailDoc);
        }
      }else{
        console.log("No waitlist to notify...")
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

    if (!name || name.length < 1 || name.length > 20) {
      alert("Name is required and must be 1-20 chars");
      return;
    }
    localStorage.setItem("myRegName", name);
    if (!regPin || regPin.length < 4 || regPin.length > 10) {
      alert("PIN is required and must be 4-10 chars");
      return;
    }
    localStorage.setItem("myRegPin", regPin);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (regEmail && !emailRegex.test(regEmail)){
      alert("Email format is invalid");
      return;
    } else if(regEmail){
      localStorage.setItem("myRegEmail", regEmail);
    }

    try {
      const docRef = doc(db, "dates", selectedDate);
      const registrationsSnapshot = await getDocs(collection(docRef, "registrations"));
      const fetchedRegistrations = registrationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRegistrations(fetchedRegistrations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      
      if (fetchedRegistrations.some((reg) => reg.name.toLowerCase() === name.toLowerCase())) {
        alert("Name already exists!");
        return;
      }

      const newRegistration = {
        name,
        timestamp: new Date().toISOString(),
        pin: regPin,
        email: regEmail,
      };

      setIsSubmitting(true);

      let addedDocRef;
      addedDocRef = await addDoc(collection(docRef, "registrations"), newRegistration);
      setRegistrations([...fetchedRegistrations, { id: addedDocRef.id, ...newRegistration }].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      alert("Registered successfuly!");

      if(regEmail){
        sendEmail('Registration Completed', newRegistration, false);
      }
      setTimeout(() => setIsSubmitting(false), 1000);
    } catch (error) {
      console.error("Error registering: ", error);
    }
  };

  const handleCancel = async (id, isWaitlist) => { 
    try {

      const docRef = doc(db, "dates", selectedDate, "registrations", id);
      const registrationDoc = await getDoc(docRef);

      if(isPastDate(selectedDateDetails?.date)){
        const pin = prompt("Only Admin can cancel same or past date events, Enter Admin PIN:");
        if (!pin) return;
        const adminsSnapshot = await getDocs(collection(db, "admins"));
        const isAdmin = adminsSnapshot.docs.some((doc) => doc.data().pin === pin);
        if (!isAdmin) {
          alert("Invalid Admin PIN!");
          return;
        }
        localStorage.setItem("myAdminPin", pin);
      }else{
        const pin = prompt("Enter Registration PIN or Admin PIN to cancel:");
        if (!pin) return;

        const adminsSnapshot = await getDocs(collection(db, "admins"));
        const isAdmin = adminsSnapshot.docs.some((doc) => doc.data().pin === pin);

        if (!isAdmin && !registrationDoc.data().pin) {
          alert("Registration has no PIN, only Admin can cancel");
          return;
        }

        const isPinMatching = registrationDoc.data().pin === pin;

        if (!isAdmin && !isPinMatching) {
          alert("Invalid PIN!");
          return;
        }

        if(isAdmin){
          localStorage.setItem("myAdminPin", pin);
        }
      }

      sendEmail(`${isWaitlist ? 'Waitlist ' : ''}Cancellation`, registrationDoc.data(), true);

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

      const pin = prompt("Enter Registration PIN or Admin PIN to update payment:");
      if (!pin) return;

      const adminsSnapshot = await getDocs(collection(db, "admins"));
      const isAdmin = adminsSnapshot.docs.some((doc) => doc.data().pin === pin);
      const docRef = doc(db, "dates", selectedDate, "registrations", id);
      const registrationDoc = await getDoc(docRef);

      if (!isAdmin && !registrationDoc.data().pin) {
        alert("Registration has no PIN, only Admin can update payment status");
        return;
      }

      const isPinMatching = registrationDoc.data().pin === pin;

      if (!isAdmin && !isPinMatching) {
        alert("Invalid PIN!");
        return;
      }

      if(isAdmin){
        localStorage.setItem("myAdminPin", pin);
      }

      await updateDoc(docRef, { paid: !isPaid });
      setRegistrations(registrations.map((reg) =>
        reg.id === id ? { ...reg, paid: !isPaid } : reg
      ));
    } catch (error) {
      console.error("Error updating payment status: ", error);
    }
  };

  const handleAddEvent = async () => {
    const pin = prompt("Enter Admin PIN:", localStorage.getItem("myAdminPin") || '');
    if (!pin) return;
    const adminsSnapshot = await getDocs(collection(db, "admins"));
    const validAdmin = adminsSnapshot.docs.find((doc) => doc.data().pin === pin);
    if (validAdmin) {
      setIsEditMode(false);
      setShowEventModal(true);
      localStorage.setItem("myAdminPin", pin);
    } else {
      alert("Invalid Admin PIN!");
    }
  };

  const handleListEvent = async () => {
    const pin = prompt("Enter Admin PIN:", localStorage.getItem("myAdminPin") || '');
    if (!pin) return;
    const adminsSnapshot = await getDocs(collection(db, "admins"));
    const validAdmin = adminsSnapshot.docs.find((doc) => doc.data().pin === pin);
    if (validAdmin) {
      const fetchDates = async () => {
        const querySnapshot = await getDocs(query(collection(db, "dates"), orderBy("date", "desc")));
        const fetchedDates = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDates(fetchedDates);
        if (fetchedDates.length > 0) {
          setSelectedDateModal(fetchedDates[0].id);
          setSelectedDateModalDetails(fetchedDates[0]);
        }
      };
      fetchDates();
      setShowListEventModal(true);
      localStorage.setItem("myAdminPin", pin);
    } else {
      alert("Invalid Admin PIN!");
    }
  };

  const handleEditEvent = async () => {
    setShowListEventModal(false);
    setIsEditMode(true);
    setShowEventModal(true);
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    const date = event.target.date.value;
    const venue = event.target.venue.value;
    const maxPlayers = parseInt(event.target.maxPlayers.value, 10);
    const payTo = event.target.payTo.value;
    const startTime = event.target.startTime.value;
    const endTime = event.target.endTime.value;
    const isOpen = event.target.isOpen.checked;
    if (date && venue && maxPlayers && payTo && startTime && endTime) {
      try {
        const querySnapshot = await getDocs(collection(db, "dates"));
        const existingEvents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const isDuplicate = existingEvents.some(event => {
          const eventDate = new Date(event.date).toISOString().split("T")[0];
          const inputDate = new Date(date).toISOString().split("T")[0];
          return (
              eventDate === inputDate &&
              event.venue === venue &&
              event.startTime === startTime &&
              event.endTime === endTime &&
              (!isEditMode || event.id !== selectedDateModal)
          );
        });

        if (isDuplicate) {
          alert("An event with the same date, venue, and time already exists!");
          return;
        }

        const eventDetails = {
          date: new Date(date).toISOString().split("T")[0],
          venue: venue,
          max: maxPlayers,
          pay_to: payTo,
          startTime: startTime,
          endTime: endTime,
          isOpenForRegistration: isOpen,
        }

        if (isEditMode) {
          await updateDoc(doc(db, "dates", selectedDateModal), eventDetails);
          alert("Event updated successfully!");
          eventDetails.id = selectedDateModal;
          setSelectedDateDetails(eventDetails);
        } else {
          const newDateAdded = await addDoc(collection(db, "dates"), eventDetails);
          alert("Event added successfully!");
          setSelectedDate(newDateAdded.id);
          eventDetails.id = newDateAdded.id;
          setSelectedDateDetails(eventDetails);
        }
        
        setIsOpenForRegistration(isOpen);
        setShowEventModal(false);
        const fetchDates = async () => {
          const querySnapshot = await getDocs(query(collection(db, "dates"), orderBy("date", "desc")));
          const fetchedDates = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setDates(fetchedDates);
        };
        await fetchDates();
      } catch (error) {
        console.error("Error adding/updating event: ", error);
      }
    } else {
      alert("All fields are required!");
    }
  };

  const generateShareableLink = () => {
    if (selectedDateModalDetails) {
      const url = new URL(window.location.href);
      url.searchParams.set("date", selectedDateModalDetails.date);
      url.searchParams.set("venue", selectedDateModalDetails.venue);
      url.searchParams.set("startTime", selectedDateModalDetails.startTime);
      url.searchParams.set("endTime", selectedDateModalDetails.endTime);
      navigator.clipboard.writeText(url.toString());
      alert("Shareable link copied to clipboard!");
    }
  };

  const goToRegistrationsList = () => {
    if (selectedDateModalDetails) {
      const url = new URL(window.location.href);
      url.searchParams.set("date", selectedDateModalDetails.date);
      url.searchParams.set("venue", selectedDateModalDetails.venue);
      url.searchParams.set("startTime", selectedDateModalDetails.startTime);
      url.searchParams.set("endTime", selectedDateModalDetails.endTime);
      window.location.href = url;
    }
  };

  const copyDetails = () => {
    if (selectedDateDetails) {
      const text = `Link: ${window.location.href}
      
Date: ${new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
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
    <div className="p-1">
      <div className="flex items-center justify-between bg-blue-200 text-gray py-4 px-6 mb-4 rounded-md shadow-md">
        <div className="flex justify-start">
          <img src={blIcon} className="w-8 mr-2" />
          <h1 className="text-xl font-semibold">basketbo-lista</h1>
          <RouterLink to="/app" className="ml-4 text-blue-700 underline">Go to App</RouterLink>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleListEvent} size="sm" className="text-sm bg-gray-500 p-2 rounded-full" title="List Events (For Admin)">
            <List className="w-4 h-4" />
          </Button>
          <Button onClick={handleAddEvent} size="sm" className="text-sm bg-gray-500 p-2 rounded-full ml-2" title="Add Event (For Admin)">
            <CalendarPlus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {selectedDateDetails && (
        <Card className="mb-4 text-sm">
          <div className="mt-2 mb-4">
            <p><strong>Date:</strong> {new Date(selectedDateDetails.date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        weekday: "short",
      }).toUpperCase().replace(",", "")}</p>
            <p><strong>Venue:</strong> {selectedDateDetails.venue}</p>
            <p><strong>Max:</strong> {selectedDateDetails.max} players</p>
            <p><strong>Time:</strong> {new Date(`1970-01-01T${selectedDateDetails.startTime}:00`).toLocaleTimeString("en-GB", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true}).toUpperCase()} - {new Date(`1970-01-01T${selectedDateDetails.endTime}:00`).toLocaleTimeString("en-GB", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true}).toUpperCase()}</p>
            <p><strong>Pay To:</strong> {selectedDateDetails.pay_to}</p>
          </div>
          <div className="flex">
            <Button onClick={copyDetails} size="sm" className="flex items-center text-sm bg-white text-xs p-2 rounded-full" title="Copy Details">
              <Copy className="w-6 h-6 text-blue-500" />
            </Button>
            <Button onClick={downloadIcs} size="sm" className="flex items-center text-sm bg-white text-xs p-2 rounded-full ml-2" title="Download Calendar">
              <CalendarArrowDown className="w-6 h-6 text-blue-500" />
            </Button>
          </div>
        </Card>
      )}
      
      {showEventModal && (
        <div className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center text-sm">
          <div className="bg-white p-6 rounded shadow-md max-w-sm w-full">
            <h2 className="text-lg mb-4">{isEditMode ? "Edit Event" : "Add New Event"}</h2>
            <form onSubmit={submitEvent} className="flex flex-col">
              <label className="text-xs mb-1">Date</label>
              <Input type="date" name="date" className="mb-2" required defaultValue={isEditMode ? selectedDateModalDetails?.date?.split("T")[0] : ""} />
              <label className="text-xs mb-1">Venue</label>
              <Input name="venue" className="mb-3" required defaultValue={isEditMode ? selectedDateModalDetails?.venue : ""} />
              <label className="text-xs mb-1">Max Players</label>
              <Input name="maxPlayers" type="number" className="mb-3" required defaultValue={isEditMode ? selectedDateModalDetails?.max : ""} />
              <label className="text-xs mb-1">Pay To</label>
              <Input name="payTo" className="mb-3" required defaultValue={isEditMode ? selectedDateModalDetails?.pay_to : ""} />
              {/* <label className="text-xs mb-1">Time (e.g., 7-10 PM)</label>
              <Input name="time" className="mb-5" required defaultValue={isEditMode ? selectedDateModalDetails?.time : ""} /> */}
              <label className="text-xs mb-1">Start Time</label>
              <Input type="time" name="startTime" className="mb-2" required defaultValue={isEditMode ? selectedDateModalDetails?.startTime?.split("T")[0] : ""} />
              <label className="text-xs mb-1">End Time</label>
              <Input type="time" name="endTime" className="mb-2" required defaultValue={isEditMode ? selectedDateModalDetails?.endTime?.split("T")[0] : ""} />
              <Input
                type="checkbox"
                label="Registration Open"
                defaultChecked={selectedDateModalDetails?.isOpenForRegistration}
                name="isOpen"
                className="mb-4"
              />
              <div className="flex justify-end space-x-2">
                <Button type="submit" className="p-2 rounded-xl">Submit</Button>
                <Button type="button" className="p-2 bg-gray-400 rounded-xl" onClick={() => setShowEventModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showListEventModal && (
        <div className="fixed inset-0 bg-gray-300 bg-opacity-50 flex items-center justify-center text-sm">
          <div className="bg-white p-6 rounded shadow-md max-w-sm w-full">
            <h2 className="text-lg mb-4">Events Listing</h2>     
            <div className="flex items-center space-x-2 mb-6">
              {dates.length > 0 ? (
                <select
                  value={selectedDateModal}
                  onChange={(e) => {
                    const selected = dates.find((date) => date.id === e.target.value);
                    setSelectedDateModal(e.target.value);
                    setSelectedDateModalDetails(selected);
                  }}
                  className="p-2 border rounded text-md w-full"
                >
                  {dates.map((date) => (
                    <option key={date.id} value={date.id}>
                      {new Date(date.date).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      }).toUpperCase().replace(",", "")} / {date.venue.split(" ")[0]}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No available dates.</p>
              )}
              
            </div>
            <div className="flex items-center text-xs">
              <Button onClick={generateShareableLink} size="sm" className="flex items-center text-sm bg-orange-400 text-xs p-2 rounded-xl" title="Share Link">
                Copy Link<Share className="ml-1 w-4 h-4" />
              </Button>
              <Button onClick={handleEditEvent} size="sm" className="flex items-center text-sm bg-orange-400 ml-2 text-xs p-2 rounded-xl" title="Edit Event">
                Edit<Pencil className="ml-1 w-4 h-4" />
              </Button>
              <Button onClick={goToRegistrationsList} size="sm" className="flex items-center text-sm bg-blue-400 ml-2 text-xs p-2 rounded-xl" title="View Registrations">
                View<List className="ml-1 w-4 h-4" />
              </Button>
            </div>
            <hr className="my-4"/>
            <div className="flex justify-end space-x-2 mt-4">
              <Button type="button" className="bg-gray-400 p-2 rounded-xl" onClick={() => setShowListEventModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {selectedDate && isOpenForRegistration && !isPastDate(selectedDateDetails?.date) && (
        <Card className="mb-4 text-sm">
          <label className="text-xs text-gray-500 italic">* Name (1-20 chars)</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-2 w-full"
          />
          <label className="text-xs text-gray-500 italic">* Set own PIN (4-10 chars) to protect your registration</label>
          <Input
            type="password"
            value={regPin}
            onChange={(e) => setRegPin(e.target.value)}
            className="mb-2 w-full"
          />
          <label className="text-xs text-gray-500 italic">Set email for notifications (optional)</label>
          <Input
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            className="mb-2 w-full"
          />
          <Button onClick={handleRegister} size="md" className="text-md p-2 mt-2 rounded-xl" disabled={isSubmitting}>{isSubmitting ? "Registering..." : "Register"}</Button>
        </Card>
      )}

      {isOpenForRegistration && registrations.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-md font-semibold my-3">Registrations</h2>
          {registrations.slice(0, selectedDateDetails.max).map((reg, index) => (
            <li key={`reg-${reg.id}`} className="flex justify-between items-center mb-1">
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
                <Button onClick={() => handleTogglePaid(reg.id, reg.paid)} size="xs" variant={reg.paid ? "secondary" : "outline"} className="text-xs px-2 py-1 w-18 rounded-md w-14">
                  {reg.paid ? "Paid" : "Unpaid"}
                </Button>
                <Button onClick={() => handleCancel(reg.id, false)} size="xs" title="Cancel Registration" className="bg-white text-xs p-1 rounded-full">
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </li>
          ))}
          {registrations.length > selectedDateDetails.max && (
            <>
              <h3 className="text-md font-semibold mt-6 mb-2">Waitlist</h3>
              {registrations.slice(selectedDateDetails.max, registrations.length).map((reg, index) => (
                <li key={`wait-${reg.id}`} className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm" onClick={() => alert(reg.name + " wailisted on " + new Date(reg.timestamp).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                      hour12: true
                    }))}>{index + 1}. {reg.name}</span>
                  </div>
                  <Button onClick={() => handleCancel(reg.id, true)} size="xs" className="bg-white text-xs p-1 rounded-full" title="Cancel Registration">
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </>
          )}
        </Card>
      )}
      {selectedDateDetails && !isOpenForRegistration && (
        <Card className="mb-4 text-sm">
          <p className="italic">Not open for registration yet</p>
        </Card>
      )}
    </div>
  );
};

export default ListingApp;
