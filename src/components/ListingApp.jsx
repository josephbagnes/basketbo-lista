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
  query,
  orderBy
} from "firebase/firestore";

const ListingApp = () => {
  const [name, setName] = useState("");
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);

  useEffect(() => {
    const fetchDates = async () => {
      const querySnapshot = await getDocs(query(collection(db, "dates"), orderBy("date", "desc")));
      const fetchedDates = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDates(fetchedDates);
      if (fetchedDates.length > 0) {
        setSelectedDate(fetchedDates[0].id);
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
      };
      fetchRegistrations();
    }
  }, [selectedDate]);

  const handleRegister = async () => {
    if (!name) return;
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
      if (registrations.length < 25) {
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

  return (
    <div className="p-4">
      <Card className="mb-4">
        <label className="block mb-2">Select Date</label>
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
      </Card>

      {selectedDate && (
        <Card className="mb-4">
          <label className="block mb-2">Enter Your Name</label>
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
            className="mb-2"
          />
          <Button className="w-full" onClick={handleRegister}>Register</Button>
        </Card>
      )}

      {(registrations.length > 0 || waitlist.length > 0) && (
        <Card className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Registrations</h2>
          {registrations.map((reg, index) => (
            <li key={`reg-${reg.id}`} className="flex justify-between">
              {index + 1}. {reg.name} - {new Date(reg.timestamp).toLocaleString()}
              <Button onClick={() => handleCancel(reg.id)} size="sm">Cancel</Button>
            </li>
          ))}
          {waitlist.length > 0 && (
            <>
              <h3 className="font-semibold mb-2">Waitlist</h3>
              {waitlist.map((reg, index) => (
                <li key={`wait-${reg.id}`} className="flex justify-between">
                  {index + 1}. {reg.name} - {new Date(reg.timestamp).toLocaleString()}
                  <Button onClick={() => handleCancel(reg.id, true)} size="sm">Cancel</Button>
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
