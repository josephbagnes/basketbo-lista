import React, { useState } from 'react';
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Outlet } from 'react-router-dom';

const BaseLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();

    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:translate-x-0 md:w-64 md:block`}
            >
                <div className="p-4">
                    <h2 className="font-bold text-lg mb-4">BASKETBO-LISTA</h2>

                        <div className="mb-4">
                            <p className="text-gray-700">
                                Hello{user.displayName ? `, ${user.displayName}` : user.email ? `, ${user.email}` : "!"}
                            </p>
                        </div>
                        <button
                            className="bg-red-500 text-white px-4 py-2 rounded"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                </div>
                <nav className="mt-4">
                    <ul className="space-y-2">
                        <li>
                            <a href="/app/home" className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Home</a>
                        </li>
                        <li>
                            <a href="/app/games" className="block px-4 py-2 text-gray-700 hover:bg-gray-200">Games</a>
                        </li>
                    </ul>
                </nav>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                <button
                    className="p-2 m-2 text-2xl md:hidden z-40"
                    aria-label="Toggle sidebar"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    ☰
                </button>
                <main className="flex-1 p-4"><Outlet/></main>
            </div>
        </div>
    );
};

export default BaseLayout;