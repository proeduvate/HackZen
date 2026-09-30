import React from 'react';
import { useNavigate } from 'react-router-dom';

const materials = [
  { name: 'Research brief', type: 'PDF', updated: '2 days ago' },
  { name: 'UX storyboard', type: 'Figma', updated: 'Yesterday' },
  { name: 'Architecture notes', type: 'DOC', updated: '3 days ago' },
];

const StudentMaterials = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Resources</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Team Materials</h1>
        </div>
        <button onClick={() => navigate('/student/files')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
          File sharing
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {materials.map((item) => (
          <div key={item.name} className="glass rounded-[1.6rem] border border-white/10 p-5">
            <div className="mb-5 text-3xl">📄</div>
            <h3 className="text-lg font-bold text-white">{item.name}</h3>
            <p className="mt-2 text-sm text-gray-400">{item.type}</p>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs uppercase tracking-[0.2em] text-gray-400">
              <span>Updated</span>
              <span>{item.updated}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentMaterials;
