import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import DrillLibrary from "./pages/DrillLibrary";
import SessionBuilder from "./pages/SessionBuilder";
import MySessions from "./pages/MySessions";
import Players from "./pages/Players";

export default function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="min-h-screen">
      <Sidebar page={page} setPage={setPage} />
      <main className="ml-60 p-8 max-w-[1600px]">
        {page === "dashboard" && <Dashboard setPage={setPage} />}
        {page === "library" && <DrillLibrary />}
        {page === "builder" && <SessionBuilder />}
        {page === "sessions" && <MySessions />}
        {page === "players" && <Players />}
      </main>
    </div>
  );
}
