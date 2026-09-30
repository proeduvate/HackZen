import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const fileSeed = [
  { name: 'prototype_v2.fig', type: 'FIG', size: '11.8 MB' },
  { name: 'demo_script.mp4', type: 'VIDEO', size: '24.4 MB' },
  { name: 'pitch_deck.pdf', type: 'PDF', size: '3.2 MB' },
];

const StudentFileSharing = () => {
  const navigate = useNavigate();
  const [files] = useState(fileSeed);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Share</p>
          <h1 className="mt-2 text-3xl font-bold text-white">File Sharing</h1>
        </div>
        <button className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white">
          Upload file
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {files.map((file) => (
            <div key={file.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-4 text-3xl">📁</div>
              <h3 className="text-lg font-bold text-white">{file.name}</h3>
              <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-gray-400">
                <span>{file.type}</span>
                <span>{file.size}</span>
              </div>
              <button onClick={() => navigate('/student/materials')} className="mt-5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white">
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentFileSharing;
