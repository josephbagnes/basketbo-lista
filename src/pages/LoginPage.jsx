import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider, signInWithPopup } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            navigate("/app/home", { replace: true });
        }
    }, [user, loading, navigate]);

    const handleGoogleClick = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            alert("Authentication failed");
        }
    };

    return (
        <div className={"flex flex-col justify-center items-center"}>
            <div className={"w-full sm:w-[300px] flex flex-col items-center justify-center bg-gray-100 gap-10 px-4 py-20"}>
                <h1 className={"font-bold text-2xl"}>
                    BASKETBO-<span className={"italic text-orange-900"}>LISTA</span>
                </h1>
                <button
                    className={"bg-white px-4 py-2 border rounded"}
                    onClick={handleGoogleClick}>Login with Google
                </button>
            </div>
        </div>
    );
}