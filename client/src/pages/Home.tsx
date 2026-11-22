// client/src/pages/Home.tsx
import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <h1 className="text-4xl font-bold mb-4">HelpLoop</h1>
    <p className="mb-6 text-lg text-center max-w-md">
      Connecting people who need help with volunteers in their community.
    </p>
    <Link
      to="/login"
      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Get Started
    </Link>
  </div>
);

export default Home;

