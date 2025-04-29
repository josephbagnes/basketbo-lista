export default function Home() {

    const handleGoogleClick = () => {
        //TODO: Google login
        alert("TO DO")
    }
    return (
        <div className={"flex flex-col justify-center items-center"}>
            <div
                className={"w-full sm:w-[300px] flex flex-col items-center justify-center bg-gray-100 gap-10 px-4 py-20"}>
                <h1 className={"font-bold text-2xl"}>
                    BASKETBO-<span className={"italic text-orange-900"}>LISTA</span>
                </h1>
                <button
                    className={"bg-white px-4 py-2 border rounded"}
                    onClick={handleGoogleClick}>Login with Google
                </button>
                <button
                    className={"bg-white px-4 py-2 border rounded"}
                    onClick={handleGoogleClick}>Login with Facebook
                </button>
            </div>
        </div>
    );
}