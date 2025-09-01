import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Users, MapPin, Clock } from "lucide-react";
import blIcon from "@/assets/blIcon.png";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img src={blIcon} className="w-16 h-16 mr-4" alt="Basketball Logo" />
            <h1 className="text-4xl font-bold text-gray-800">basketbo-lista</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The easiest way to organize and manage basketball games for your league or group
          </p>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Ready to get started?</h2>
          <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:justify-center">
            <Button 
              size="lg" 
              className="w-full md:w-auto px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.href = '/signup'}
            >
              Start Managing Your League
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full md:w-auto px-8 py-3 text-lg border-blue-600 text-blue-600 hover:bg-blue-50"
              onClick={() => window.location.href = '/admin'}
            >
              Admin Login
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full md:w-auto px-8 py-3 text-lg border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => window.location.href = '/user'}
            >
              My Games
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 text-center">
            <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Schedule Games</h3>
            <p className="text-gray-600 text-sm">Create and manage basketball game schedules with ease</p>
          </Card>
          
          <Card className="p-6 text-center">
            <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Player Registration</h3>
            <p className="text-gray-600 text-sm">Allow players to register for games with waitlist support</p>
          </Card>
          
          <Card className="p-6 text-center">
            <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Venue Management</h3>
            <p className="text-gray-600 text-sm">Track different venues and locations for your games</p>
          </Card>
          
          <Card className="p-6 text-center">
            <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Real-time Updates</h3>
            <p className="text-gray-600 text-sm">Get instant notifications and updates on game status</p>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Sign Up as Admin</h3>
              <p className="text-gray-600">Create your admin account to start managing your basketball league</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Events</h3>
              <p className="text-gray-600">Set up games with venue, time, and player limits</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Share & Play</h3>
              <p className="text-gray-600">Share game links with players and manage registrations</p>
            </div>
          </div>
        </div>

        <footer className="text-center text-gray-600 text-sm">
          <p>&copy; 2025 basketbo-lista. Making basketball organization simple.</p>
          <div className="mt-2 space-x-4">
            <button 
              onClick={() => window.location.href = '/privacy'}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Privacy Policy
            </button>
            <span className="text-gray-400">•</span>
            <button 
              onClick={() => window.location.href = 'mailto:boss.basketbolista@gmail.com'}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Contact Us
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;