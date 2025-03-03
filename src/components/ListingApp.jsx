import React, { useEffect, useState } from "react";
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
  orderBy
} from "firebase/firestore";

const ListingApp = () => {
  const [name, setName] = useState("");
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);


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
    if (registrations.some((reg) => reg.name.toLowerCase() === name.toLowerCase()) ||
        waitlist.some((reg) => reg.name.toLowerCase() === name.toLowerCase())) {
      alert("Name already exists!");
      return;
    }
    try {
      const docRef = doc(db, "dates", selectedDate);
      const newRegistration = {
        name,
        timestamp: new Date().toISOString(),
      };
      let addedDocRef;
      if (registrations.length < selectedDateDetails.max) {
        addedDocRef = await addDoc(collection(docRef, "registrations"), newRegistration);
        setRegistrations([...registrations, { id: addedDocRef.id, ...newRegistration }].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      } else {
        addedDocRef = await addDoc(collection(docRef, "waitlist"), newRegistration);
        setWaitlist([...waitlist, { id: addedDocRef.id, ...newRegistration }].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
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
          const waitlistRef = doc(db, "dates", selectedDate, "waitlist", earliestWaitlist.id);
          await deleteDoc(waitlistRef);
          await addDoc(collection(db, "dates", selectedDate, "registrations"), earliestWaitlist);
          setRegistrations([...registrations.filter((reg) => reg.id !== id), earliestWaitlist].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
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

  return (
    <div className="p-1">
      <Card className="mb-4 text-sm">
        {dates.length > 0 ? (
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded mb-4"
          >
            {dates.map((date) => (
              <option key={date.id} value={date.id}>
                {new Date(date.date).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  weekday: "long",
                }).toUpperCase().replace(",", "")}
              </option>
            ))}
          </select>
        ) : (
          <p>No available dates.</p>
        )}
        {selectedDateDetails && (
          <div className="mt-2">
            <p><strong>Venue:</strong> {selectedDateDetails.venue} (Max: {selectedDateDetails.max} players)</p>
            <p><strong>Pay To:</strong> {selectedDateDetails.pay_to}</p>
          </div>
        )}
      </Card>

      {selectedDate && (
        <Card className="mb-4 text-sm">
          <Input
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            className="mb-2"
          />
          <Button onClick={handleRegister} size="md" className="text-md ml-2">Register</Button>
        </Card>
      )}

      {(registrations.length > 0 || waitlist.length > 0) && (
        <Card className="mb-4">
          <h2 className="text-md font-semibold my-3">Registrations</h2>
          {registrations.map((reg, index) => (
            <li key={`reg-${reg.id}`} className="flex justify-between items-center mb-1">
              <div>
                <span className="text-xs">{index + 1}. {reg.name}</span>
                <span className="text-[10px] text-gray-500 ml-2 italic">
                  {new Date(reg.timestamp).toLocaleString("en-GB", { hour12: true, hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}
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
                }} size="sm" className="bg-red-400 text-xs py-1 mr-1">Cancel</Button>
              </div>
            </li>
          ))}
          {waitlist.length > 0 && (
            <>
              <h3 className="text-md font-semibold mt-4 mb-2">Waitlist</h3>
              {waitlist.map((reg, index) => (
                <li key={`wait-${reg.id}`} className="flex justify-between items-center mb-1">
                  <div>
                  <span className="text-xs">{index + 1}. {reg.name}</span>
                    <span className="text-[10px] text-gray-500 ml-2 italic">
                      {new Date(reg.timestamp).toLocaleString("en-GB", { hour12: true, hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <Button onClick={() => {
                  if (window.confirm(`Sure to cancel ${reg.name}'s waitlist registration?`)) {
                    handleCancel(reg.id, true);
                  }
                }} size="sm" className="bg-red-400 text-xs py-1">Cancel</Button>
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
