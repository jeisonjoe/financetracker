import Link from "next/link";
import SignupForm from "./components/SignupForm";
import LoginForm from "./components/LoginForm";

export default function Page() {
  return (
    <main className="p-6 flex w-full h-screen">
      <div className="w-1/2 h-full flex items-center justify-start p-16 pb-32">
        <div className="">
          <h1 className="text-lg text-accent font-medium">FinTrack</h1>
          <div className="flex flex-col gap-5 mt-24">
            <span className="text-6xl text-accent-mild">Get started with</span>
            <h2 className="text-6xl font-bold text-accent">FinTrack.</h2>
          </div>
          <div className="text-xl text-sec-96 mt-12 max-w-xl leading-[1.35]">
            ”Your money, organized and optimized for smarter spending and
            stronger financial growth.”
          </div>
        </div>
      </div>
      <div className="w-1/2 h-full bg-app-bg rounded-2xl p-16 px-20">
        <LoginForm />
      </div>
    </main>
  );
}
