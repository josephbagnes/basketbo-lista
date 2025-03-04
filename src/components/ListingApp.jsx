import React, { useEffect, useState } from "react";
import { CalendarPlus, Share, Link, Trash, Pencil } from "lucide-react";
import { db } from "@/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";

const ListingApp = () => {
  const [name, setName] = useState("");
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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
      }
    }
  }, [dates]);

  useEffect(() => {
    const fetchDates = async () => {
      const querySnapshot = await getDocs(query(collection(db, "dates"), orderBy("date", "desc")));
      const fetchedDates = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDates(fetchedDates);
      if (fetchedDates.length > 0) {
        setSelectedDate(fetchedDates[0].id);
        setSelectedDateDetails(fetchedDates[0]);
      }
    };
    fetchDates();
  }, []);


  useEffect(() => {
    if (selectedDate) {
      const fetchRegistrations = async () => {
        const docRef = doc(db, "dates", selectedDate);
        const regSnap = await getDocs(collection(docRef, "registrations"));
        const waitSnap = await getDocs(collection(docRef, "waitlist"));
        const regData = regSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((doc) => doc.id);
        const waitData = waitSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((doc) => doc.id);
        setRegistrations(regData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        setWaitlist(waitData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        const dateDetails = dates.find((date) => date.id === selectedDate);
        setSelectedDateDetails(dateDetails);
      };
      fetchRegistrations();
    }
  }, [selectedDate, dates]);

  const handleRegister = async () => {
    if (!name) return;
    if (name.length < 1 || name.length > 20) {
      alert("Name must be between 1 and 20 characters long.");
      return;
    }

    try {
      const docRef = doc(db, "dates", selectedDate);

      // Re-fetch the latest registrations and waitlist from Firestore
      const registrationsSnapshot = await getDocs(collection(docRef, "registrations"));
      const fetchedRegistrations = registrationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const waitlistSnapshot = await getDocs(collection(docRef, "waitlist"));
      const fetchedWaitlist = waitlistSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRegistrations(fetchedRegistrations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      setWaitlist(fetchedWaitlist.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));

      if (fetchedRegistrations.some((reg) => reg.name.toLowerCase() === name.toLowerCase()) ||
          fetchedWaitlist.some((reg) => reg.name.toLowerCase() === name.toLowerCase())) {
        alert("Name already exists!");
        return;
      }

      const newRegistration = {
        name,
        timestamp: new Date().toISOString(),
      };
      let addedDocRef;
      if (fetchedRegistrations.length < selectedDateDetails.max) {
        addedDocRef = await addDoc(collection(docRef, "registrations"), newRegistration);
        setRegistrations([...fetchedRegistrations, { id: addedDocRef.id, ...newRegistration }].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      } else {
        addedDocRef = await addDoc(collection(docRef, "waitlist"), newRegistration);
        setWaitlist([...fetchedWaitlist, { id: addedDocRef.id, ...newRegistration }].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      }
      setName("");
    } catch (error) {
      console.error("Error registering: ", error);
    }
  };

  const handleCancel = async (id, isWaitlist = false) => {
    try {
      const collectionName = isWaitlist ? "waitlist" : "registrations";
      const docRef = doc(db, "dates", selectedDate, collectionName, id);
      await deleteDoc(docRef);

      if (isWaitlist) {
        setWaitlist(waitlist.filter((reg) => reg.id !== id));
      } else {
        setRegistrations(registrations.filter((reg) => reg.id !== id));
        if (waitlist.length > 0) {
          const earliestWaitlist = waitlist[0];
          await deleteDoc(doc(db, "dates", selectedDate, "waitlist", earliestWaitlist.id));
          const newRegRef = doc(db, "dates", selectedDate, "registrations", earliestWaitlist.id);
          await setDoc(newRegRef, earliestWaitlist);
          setRegistrations((prev) => [
              ...prev.filter((reg) => reg.id !== id),
              { id: earliestWaitlist.id, ...earliestWaitlist },
          ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));

          setWaitlist(waitlist.slice(1));
        }
      }
    } catch (error) {
      console.error("Error cancelling registration: ", error);
    }
  };

  const handleTogglePaid = async (id, isPaid) => {
    try {
      const docRef = doc(db, "dates", selectedDate, "registrations", id);
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

  const handleEditEvent = async () => {
    const pin = prompt("Enter Admin PIN:");
    if (!pin) return;
    const adminsSnapshot = await getDocs(collection(db, "admins"));
    const validAdmin = adminsSnapshot.docs.find((doc) => doc.data().pin === pin);
    if (validAdmin) {
      setIsEditMode(true);
      setShowEventModal(true);
    } else {
      alert("Invalid Admin PIN!");
    }
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    const date = event.target.date.value;
    const venue = event.target.venue.value;
    const maxPlayers = parseInt(event.target.maxPlayers.value, 10);
    const payTo = event.target.payTo.value;
    const time = event.target.time.value;
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
              (!isEditMode || event.id !== selectedDate)
          );
        });

        if (isDuplicate) {
          alert("An event with the same date, venue, and time already exists!");
          return;
        }

        if (isEditMode) {
          await updateDoc(doc(db, "dates", selectedDate), {
            date: new Date(date).toISOString(),
            venue: venue,
            max: maxPlayers,
            pay_to: payTo,
            time: time
          });
          alert("Event updated successfully!");
          setSelectedDateDetails({ id: selectedDate, date: new Date(date).toISOString(), venue: venue, max: maxPlayers, pay_to: payTo, time: time });
        } else {
          const newDateAdded = await addDoc(collection(db, "dates"), {
            date: new Date(date).toISOString(),
            venue: venue,
            max: maxPlayers,
            pay_to: payTo,
            time: time
          });
          alert("Event added successfully!");
          setSelectedDate(newDateAdded.id);
          setSelectedDateDetails({ id: newDateAdded.id, date: new Date(date).toISOString(), venue: venue, max: maxPlayers, pay_to: payTo, time: time });
        }
        
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
    if (selectedDateDetails) {
      const url = new URL(window.location.href);
      url.searchParams.set("date", selectedDateDetails.date);
      url.searchParams.set("venue", selectedDateDetails.venue);
      url.searchParams.set("time", selectedDateDetails.time);
      navigator.clipboard.writeText(url.toString());
      alert("Shareable link copied to clipboard!");
    }
  };

  const isPastDate = (date) => new Date(date) < new Date();

  return (
    <div className="p-1">
      <div className="flex items-center justify-between bg-blue-200 text-gray py-4 px-6 mb-4 rounded-md shadow-md">
        <h1 className="text-xl font-semibold">Basketbo-Lista&trade;</h1>
        <Button onClick={handleAddEvent} size="sm" className="text-sm bg-gray-500" title="Add Event (For Admin)">
          <CalendarPlus className="w-4 h-4" />
        </Button>
      </div>

      <Card className="mb-4 text-sm">
        <div className="flex items-center space-x-2 mb-6">
          {dates.length > 0 ? (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded text-md"
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
        {selectedDateDetails && (
          <div className="mt-2 mb-4">
            <p><strong>Venue:</strong> {selectedDateDetails.venue}</p>
            <p><strong>Max:</strong> {selectedDateDetails.max} players</p>
            <p><strong>Time:</strong> {selectedDateDetails.time}</p>
            <p><strong>Pay To:</strong> {selectedDateDetails.pay_to}</p>
          </div>
        )}
        {selectedDateDetails && (
          <div className="flex items-center">
            <Button onClick={generateShareableLink} size="sm" className="flex items-center text-sm bg-orange-400 text-xs" title="Share Link">
              Share Link<Share className="ml-1 w-4 h-4" />
            </Button>
              <Button onClick={handleEditEvent} size="sm" className="flex items-center text-sm bg-orange-300 ml-2 text-xs" title="Edit Event">
              Admin Edit<Pencil className="ml-1 w-4 h-4" />
            </Button>
          </div>
          )}
      </Card>

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center text-sm">
          <div className="bg-white p-6 rounded shadow-md max-w-sm w-full">
            <h2 className="text-lg mb-4">{isEditMode ? "Edit Event" : "Add New Event"}</h2>
            <form onSubmit={submitEvent} className="flex flex-col">
              <Input type="date" name="date" className="mb-2" required defaultValue={isEditMode ? selectedDateDetails?.date?.split("T")[0] : ""} />
              <Input placeholder="Venue" name="venue" className="mb-3" required defaultValue={isEditMode ? selectedDateDetails?.venue : ""} />
              <Input placeholder="Max Players" name="maxPlayers" type="number" className="mb-3" required defaultValue={isEditMode ? selectedDateDetails?.max : ""} />
              <Input placeholder="Pay To" name="payTo" className="mb-3" required defaultValue={isEditMode ? selectedDateDetails?.pay_to : ""} />
              <Input placeholder="Time (e.g., 7-10 PM)" name="time" className="mb-5" required defaultValue={isEditMode ? selectedDateDetails?.time : ""} />
              <div className="flex justify-end space-x-2">
                <Button type="submit">Submit</Button>
                <Button type="button" className="bg-gray-400" onClick={() => setShowEventModal(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDate && (
        <Card className="mb-4 text-sm">
          <Input
            placeholder="Enter name here"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            className="mb-2 w-full"
          />
          <Button onClick={handleRegister} size="md" className="text-md">Register</Button>
        </Card>
      )}

      {(registrations.length > 0 || waitlist.length > 0) && (
        <Card className="mb-4">
          <h2 className="text-md font-semibold my-3">Registrations</h2>
          {registrations.map((reg, index) => (
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
                <Button onClick={() => {
                  if (window.confirm(`Sure to cancel ${reg.name}'s registration?`)) {
                    handleCancel(reg.id);
                  }
                }} size="sm" className="bg-red-400 text-xs py-1 mr-1" title="Cancel Registration" disabled={isPastDate(selectedDateDetails?.date)}>
                  <Trash className="ml-1 w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
          {waitlist.length > 0 && (
            <>
              <h3 className="text-md font-semibold mt-4 mb-2">Waitlist</h3>
              {waitlist.map((reg, index) => (
                <li key={`wait-${reg.id}`} className="flex justify-between items-center mb-1">
                  <div>
                  <span className="text-sm">{index + 1}. {reg.name}</span>
                    <span className="text-[10px] text-gray-500 ml-2 italic">
                      {new Date(reg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <Button onClick={() => {
                  if (window.confirm(`Sure to cancel ${reg.name}'s waitlist registration?`)) {
                    handleCancel(reg.id, true);
                  }
                }} size="sm" className="bg-red-400 text-xs py-1" title="Cancel Registration" disabled={isPastDate(selectedDateDetails?.date)}>
                  <Trash className="ml-1 w-4 h-4" /></Button>
                </li>
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default ListingApp;
