import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users } from "lucide-react";
import { db } from "@/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  // FacebookAuthProvider,
  onAuthStateChanged 
} from "firebase/auth";
import blIcon from "@/assets/blIcon.png";

const SignUpPage = () => {
  const [step, setStep] = useState('auth'); // 'auth' or 'group'
  const [user, setUser] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Always allow creating new groups, skip to group creation step
        setStep('group');
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // const handleFacebookSignIn = async () => {
  //   setAuthLoading(true);
  //   setError("");
  //   try {
  //     const provider = new FacebookAuthProvider();
  //     provider.addScope('email');
  //     
  //     await signInWithPopup(auth, provider);
  //   } catch (error) {
  //     console.error("Facebook sign-in error:", error);
  //     setError("Failed to sign in with Facebook. Please try again.");
  //   } finally {
  //     setAuthLoading(false);
  //   }
  // };

  const generateGroupId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    
    if (!groupName || groupName.length < 2) {
      setError("Group name must be at least 2 characters");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Check if group name already exists
      const groupQuery = query(
        collection(db, "groups"), 
        where("name", "==", groupName.trim())
      );
      const existingGroups = await getDocs(groupQuery);
      
      if (!existingGroups.empty) {
        setError("This group name is already taken. Please choose another one.");
        setIsSubmitting(false);
        return;
      }

      // Generate unique group ID
      let groupId = generateGroupId();
      let groupIdExists = true;
      
      // Ensure group ID is unique
      while (groupIdExists) {
        const idQuery = query(
          collection(db, "groups"), 
          where("groupId", "==", groupId)
        );
        const existingIds = await getDocs(idQuery);
        if (existingIds.empty) {
          groupIdExists = false;
        } else {
          groupId = generateGroupId();
        }
      }

      // Create new group
      const groupData = {
        name: groupName.trim(),
        groupId: groupId,
        adminName: user.displayName || 'Admin',
        adminEmail: user.email,
        adminUid: user.uid,
        authProvider: user.providerData[0]?.providerId || 'unknown',
        coAdmins: [],
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await addDoc(collection(db, "groups"), groupData);
      
      // Store group info in localStorage
      localStorage.setItem("myGroupId", groupId);
      localStorage.setItem("myGroupName", groupName.trim());
      localStorage.setItem("myAdminEmail", user.email);
      
      alert(`Group created successfully! Your Group ID is: ${groupId}`);
      
      // Redirect to admin dashboard
      window.location.href = '/admin';
      
    } catch (error) {
      console.error("Error creating group: ", error);
      setError("Error creating group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = '/'}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={blIcon} className="w-8 h-8 mr-2" alt="Basketball Logo" />
          <h1 className="text-xl font-semibold">basketbo-lista</h1>
        </div>

        <Card className="p-6">
          {step === 'auth' ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign Up as Admin</h2>
                <p className="text-gray-600">Choose your preferred sign-in method</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <Button 
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  variant="google"
                  className="w-full py-3"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {authLoading ? "Signing in..." : "Sign up with Google"}
                </Button>

                {/* <Button 
                  onClick={handleFacebookSignIn}
                  disabled={authLoading}
                  className="w-full py-3 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {authLoading ? "Signing in..." : "Sign up with Facebook"}
                </Button> */}
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your Group</h2>
                <p className="text-gray-600">Welcome, {user?.displayName || 'Admin'}!</p>
                <p className="text-sm text-gray-500 mt-2">Enter a unique name for your basketball group</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleGroupSubmit} className="space-y-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 mr-2" />
                    Group Name
                  </label>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Downtown Basketball League"
                    className={error ? "border-red-500" : ""}
                  />
                  <p className="text-xs text-gray-500 mt-1">This name must be unique across all groups</p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full py-3 mt-6 bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Group..." : "Create Group"}
                </Button>
              </form>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> After creating your group, you'll receive a unique Group ID that you can share with other admins if needed.
                </p>
              </div>
            </>
          )}
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By signing up, you can create and manage your own basketball events
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;