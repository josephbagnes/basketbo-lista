import {addDoc, collection, getDocs} from "firebase/firestore";
import {db} from "@/firebase";

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

const copyDetails = (selectedDateDetails, registrations) => {
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

export { sendEmail, notifyNextInWaitlist, downloadIcs, copyDetails };