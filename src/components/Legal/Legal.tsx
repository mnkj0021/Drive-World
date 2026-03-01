import React from 'react';

export function Legal() {
  return (
    <div className="min-h-screen bg-black text-gray-300 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">Legal Information</h1>
        
        <section>
          <h2 className="text-xl font-bold text-white mb-2">Privacy Policy</h2>
          <p className="text-sm leading-relaxed">
            DriveWorld respects your privacy. We collect location data only when you explicitly enable "Session Mode" or "Run Recording". 
            This data is used solely for the purpose of real-time sharing with your selected crew members and for generating your personal run statistics.
            We do not sell your location data to third parties. You can delete your account and data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">Terms of Service</h2>
          <p className="text-sm leading-relaxed">
            By using DriveWorld, you agree to drive safely and obey all local traffic laws. 
            DriveWorld is a game/utility app and should not be used in a way that distracts you from operating a vehicle.
            Do not use this app to race on public roads.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">Google Maps Attribution</h2>
          <p className="text-sm leading-relaxed">
            This application uses Google Maps Platform services. Map data ©2024 Google.
          </p>
        </section>
      </div>
    </div>
  );
}
