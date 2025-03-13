import React, { useEffect, useState } from "react";
import { List, CalendarPlus, Share, Link, Trash, Pencil, Copy } from "lucide-react";
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get("date");
    const venue = urlParams.get("venue");
    const time = urlParams.get("time");

    if (date && venue && time) {
      const matchedEvent = dates.find(
        (event) =>
          event.date === date &&
          event.venue === venue &&
          event.time === time
      );
      if (matchedEvent) {
        setSelectedDate(matchedEvent.id);
        setSelectedDateDetails(matchedEvent);
        setIsOpenForRegistration(matchedEvent.isOpenForRegistration ?? false);
      }
    }
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

  const handleRegister = async () => {
    if (!name || name.length < 1 || name.length > 20) {
      alert("Name is required and must be 1-20 chars");
      return;
    }
    if (!regPin || regPin.length < 4 || regPin.length > 10) {
      alert("PIN is required and must be 4-10 chars");
      return;
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
      };

      let addedDocRef;
      addedDocRef = await addDoc(collection(docRef, "registrations"), newRegistration);
      setRegistrations([...fetchedRegistrations, { id: addedDocRef.id, ...newRegistration }].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      setName("");
    } catch (error) {
      console.error("Error registering: ", error);
    }
  };

  const handleCancel = async (id) => { 
    try {
      const pin = prompt("Enter Registration PIN or Admin PIN to cancel:");
      if (!pin) return;

      const adminsSnapshot = await getDocs(collection(db, "admins"));
      const isAdmin = adminsSnapshot.docs.some((doc) => doc.data().pin === pin);

      const docRef = doc(db, "dates", selectedDate, "registrations", id);
      const registrationDoc = await getDoc(docRef);

      if (!isAdmin && !registrationDoc.data().pin) {
        alert("Registration has no PIN, only Admin can cancel");
        return;
      }

      const isPinMatching = registrationDoc.data().pin === pin;

      if (!isAdmin && !isPinMatching) {
        alert("Invalid PIN!");
        return;
      }

      await deleteDoc(docRef);
      setRegistrations(registrations.filter((reg) => reg.id !== id));
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

      await updateDoc(docRef, { paid: !isPaid });
      setRegistrations(registrations.map((reg) =>
        reg.id === id ? { ...reg, paid: !isPaid } : reg
      ));
    } catch (error) {
      console.error("Error updating payment status: ", error);
    }
  };

  const handleAddEvent = async () => {
    const pin = prompt("Enter Admin PIN:");
    if (!pin) return;
    const adminsSnapshot = await getDocs(collection(db, "admins"));
    const validAdmin = adminsSnapshot.docs.find((doc) => doc.data().pin === pin);
    if (validAdmin) {
      setIsEditMode(false);
      setShowEventModal(true);
    } else {
      alert("Invalid Admin PIN!");
    }
  };

  const handleListEvent = async () => {
    const pin = prompt("Enter Admin PIN:");
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
    const time = event.target.time.value;
    const isOpen = event.target.isOpen.checked;
    if (date && venue && maxPlayers && payTo && time) {
      try {
        const querySnapshot = await getDocs(collection(db, "dates"));
        const existingEvents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const isDuplicate = existingEvents.some(event => {
          const eventDate = new Date(event.date).toISOString().split("T")[0];
          const inputDate = new Date(date).toISOString().split("T")[0];
          return (
              eventDate === inputDate &&
              event.venue === venue &&
              event.time === time &&
              (!isEditMode || event.id !== selectedDateModal)
          );
        });

        if (isDuplicate) {
          alert("An event with the same date, venue, and time already exists!");
          return;
        }

        if (isEditMode) {
          await updateDoc(doc(db, "dates", selectedDateModal), {
            date: new Date(date).toISOString(),
            venue: venue,
            max: maxPlayers,
            pay_to: payTo,
            time: time,
            isOpenForRegistration: isOpen,
          });
          alert("Event updated successfully!");
          setSelectedDateDetails({ id: selectedDateModal, date: new Date(date).toISOString(), venue: venue, max: maxPlayers, pay_to: payTo, time: time, isOpenForRegistration: isOpenForRegistration });
        } else {
          const newDateAdded = await addDoc(collection(db, "dates"), {
            date: new Date(date).toISOString(),
            venue: venue,
            max: maxPlayers,
            pay_to: payTo,
            time: time,
            isOpenForRegistration: isOpen,
          });
          alert("Event added successfully!");
          setSelectedDate(newDateAdded.id);
          setSelectedDateDetails({ id: newDateAdded.id, date: new Date(date).toISOString(), venue: venue, max: maxPlayers, pay_to: payTo, time: time, isOpenForRegistration: isOpenForRegistration });
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
      url.searchParams.set("time", selectedDateModalDetails.time);
      navigator.clipboard.writeText(url.toString());
      alert("Shareable link copied to clipboard!");
    }
  };

  const goToRegistrationsList = () => {
    if (selectedDateModalDetails) {
      const url = new URL(window.location.href);
      url.searchParams.set("date", selectedDateModalDetails.date);
      url.searchParams.set("venue", selectedDateModalDetails.venue);
      url.searchParams.set("time", selectedDateModalDetails.time);
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
Time: ${selectedDateDetails.time || ''}
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
          <img src={blIcon} className="w-7 mr-2" />
          <h1 className="text-xl font-semibold">basketbo-lista</h1>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleListEvent} size="sm" className="text-sm bg-gray-500" title="List Events (For Admin)">
            <List className="w-4 h-4" />
          </Button>
          <Button onClick={handleAddEvent} size="sm" className="text-sm bg-gray-500 ml-2" title="Add Event (For Admin)">
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
            <p><strong>Time:</strong> {selectedDateDetails.time}</p>
            <p><strong>Pay To:</strong> {selectedDateDetails.pay_to}</p>
          </div>
          <Button onClick={copyDetails} size="sm" className="flex items-center text-sm bg-gray-400 text-xs" title="Copy Details">
            Copy Details<Copy className="ml-1 w-4 h-4" />
          </Button>
        </Card>
      )}
      
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center text-sm">
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
              <label className="text-xs mb-1">Time (e.g., 7-10 PM)</label>
              <Input name="time" className="mb-5" required defaultValue={isEditMode ? selectedDateModalDetails?.time : ""} />
              <Input
                type="checkbox"
                label="Registration Open"
                defaultChecked={selectedDateModalDetails?.isOpenForRegistration}
                name="isOpen"
                className="mb-4"
              />
              <div className="flex justify-end space-x-2">
                <Button type="submit">Submit</Button>
                <Button type="button" className="bg-gray-400" onClick={() => setShowEventModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showListEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center text-sm">
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
                      }).toUpperCase().replace(",", "")} / {date.venue.split(" ")[0]} / {date.time}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No available dates.</p>
              )}
              
            </div>
            <div className="flex items-center text-xs">
              <Button onClick={generateShareableLink} size="sm" className="flex items-center text-sm bg-orange-400 text-xs" title="Share Link">
                Copy Link<Share className="ml-1 w-4 h-4" />
              </Button>
              <Button onClick={handleEditEvent} size="sm" className="flex items-center text-sm bg-orange-400 ml-2 text-xs" title="Edit Event">
                Edit<Pencil className="ml-1 w-4 h-4" />
              </Button>
              <Button onClick={goToRegistrationsList} size="sm" className="flex items-center text-sm bg-blue-400 ml-2 text-xs" title="View Registrations">
                View<List className="ml-1 w-4 h-4" />
              </Button>
            </div>
            <hr className="my-4"/>
            <div className="flex justify-end space-x-2 mt-4">
              <Button type="button" className="bg-gray-400" onClick={() => setShowListEventModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {selectedDate && isOpenForRegistration && !isPastDate(selectedDateDetails?.date) && (
        <Card className="mb-4 text-sm">
          <label className="text-xs text-gray-500 italic">Name (1-20 chars)</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            className="mb-2 w-full"
          />
          <label className="text-xs text-gray-500 italic">Set own PIN (4-10 chars) to protect your registration</label>
          <Input
            value={regPin}
            onChange={(e) => setRegPin(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            className="mb-2 w-full"
          />
          <Button onClick={handleRegister} size="md" className="text-md">Register</Button>
        </Card>
      )}

      {isOpenForRegistration && registrations.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-md font-semibold my-3">Registrations</h2>
          {registrations.slice(0, selectedDateDetails.max).map((reg, index) => (
            <li key={`reg-${reg.id}`} className="flex justify-between items-center mb-1">
              <div>
                <span className="text-sm">{index + 1}. {reg.name}</span>
                <span className="text-[10px] text-gray-500 ml-2 italic">
                  {new Date(reg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Button onClick={() => handleTogglePaid(reg.id, reg.paid)} size="xs" variant={reg.paid ? "secondary" : "outline"} className="text-xs py-1 w-20">
                  {reg.paid ? "Paid" : "Unpaid"}
                </Button>
                <Button onClick={() => handleCancel(reg.id)} size="sm" className="bg-red-400 text-xs py-1 mr-1" title="Cancel Registration" disabled={isPastDate(selectedDateDetails?.date)}>
                  <Trash className="ml-1 w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
          {registrations.length > selectedDateDetails.max && (
            <>
              <h3 className="text-md font-semibold mt-4 mb-2">Waitlist</h3>
              {registrations.slice(selectedDateDetails.max, registrations.length).map((reg, index) => (
                <li key={`wait-${reg.id}`} className="flex justify-between items-center mb-1">
                  <div>
                  <span className="text-sm">{index + 1}. {reg.name}</span>
                  <span className="text-[10px] text-gray-500 ml-2 italic">
                    {new Date(reg.timestamp).toLocaleTimeString()}
                  </span>
                  </div>
                  <Button onClick={() => handleCancel(reg.id)} size="sm" className="bg-red-400 text-xs py-1" title="Cancel Registration" disabled={isPastDate(selectedDateDetails?.date)}>
                  <Trash className="ml-1 w-4 h-4" /></Button>
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
