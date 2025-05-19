import React from 'react';

function HomePage() {
  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-gray-100">
        <div className="container mx-auto p-8 flex justify-center items-center min-h-screen">
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-slate-700/50 text-center max-w-2xl">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              VS Recorder
            </h1>
            <div className="text-6xl mb-6">⚔️</div>
            <p className="text-xl mb-8 text-gray-300">
              Professional Pokémon VGC Analytics
            </p>

            <div className="bg-slate-700/30 rounded-lg p-6 mt-8 border border-slate-600/30">
              <h3 className="text-xl font-semibold mb-2 text-emerald-400">
                Ready to Analyze
              </h3>
              <p className="text-lg text-gray-300">
                Import your Showdown replays and gain insights to elevate your competitive gameplay.
              </p>
            </div>

            <div className="flex gap-4 mt-8 justify-center">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors duration-200 shadow-lg">
                Get Started
              </button>
              <button className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors duration-200 shadow-lg border border-slate-600">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}

export default HomePage;