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
        const docSnap = await getDocs(collection(docRef, "registrations"));
        const data = docSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRegistrations(data.filter((d) => d.status === "confirmed").sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        setWaitlist(data.filter((d) => d.status === "waitlist"));
      };
      fetchRegistrations();
    }
  }, [selectedDate]);

  const handleRegister = async () => {
    if (!name) return alert("Please enter your name");
    if (registrations.some((reg) => reg.name.toLowerCase() === name.toLowerCase()) ||
        waitlist.some((reg) => reg.name.toLowerCase() === name.toLowerCase())) {
      return alert("Name already exists!");
    }
    try {
      const docRef = doc(db, "dates", selectedDate);
      const registrationRef = collection(docRef, "registrations");
      const newRegistration = {
        name,
        timestamp: new Date().toISOString(),
        status: registrations.length < 25 ? "confirmed" : "waitlist"
      };
      await addDoc(registrationRef, newRegistration);
      setName("");
      alert("Registered successfully!");
      setRegistrations([...registrations, newRegistration].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    } catch (error) {
      console.error("Error registering: ", error);
    }
  };

  const handleCancel = async (id) => {
    try {
      const docRef = doc(db, "dates", selectedDate, "registrations", id);
      await deleteDoc(docRef);
      setRegistrations(registrations.filter((reg) => reg.id !== id));
      setWaitlist(waitlist.filter((reg) => reg.id !== id));
      alert("Registration cancelled.");
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
          {registrations.length > 0 ? (
            <ul className="mb-4">
              {registrations.map((reg, index) => (
                <li key={reg.id} className="flex justify-between">
                  {index + 1}. {reg.name} - {new Date(reg.timestamp).toLocaleString()}
                  <Button onClick={() => handleCancel(reg.id)} size="sm">Cancel</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No confirmed registrations.</p>
          )}
          {waitlist.length > 0 && (
            <>
              <h3 className="font-semibold mb-2">Waitlist</h3>
              <ul>
                {waitlist.map((reg) => (
                  <li key={reg.id} className="flex justify-between">
                    {reg.name} (Waitlist) - {new Date(reg.timestamp).toLocaleString()}
                    <Button onClick={() => handleCancel(reg.id)} size="sm">Cancel</Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default ListingApp;
