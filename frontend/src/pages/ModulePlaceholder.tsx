import React from 'react';

const ModulePlaceholder: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
    <div className="p-6 bg-blue-50 rounded-full text-blue-600">
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </div>
    <h3 className="text-2xl font-bold text-gray-900">{name} Module</h3>
    <p className="text-gray-500 max-w-md text-center">
      This module is currently under development. It will include full enterprise-grade features for {name.toLowerCase()} management.
    </p>
    <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
      View Roadmap
    </button>
  </div>
);

export default ModulePlaceholder;
