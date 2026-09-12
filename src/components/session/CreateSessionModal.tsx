import React, { useState } from 'react';
import { Project, User, PlanningSession, SessionAgendaItem } from '../../types';
import { Calendar, Clock, Plus, Trash2, Tag, ShieldCheck } from 'lucide-react';

interface CreateSessionModalProps {
  project: Project;
  currentUser: User;
  onClose: () => void;
  onSubmit: (sessionData: Omit<PlanningSession, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  project,
  currentUser,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('September 24 Backlog Prioritization');
  const [date, setDate] = useState('2026-09-24');
  const [timeZone, setTimeZone] = useState('America/New_York (EDT)');
  const [objective, setObjective] = useState('Agree on next delivery priorities and resolve ownership gaps.');
  const [deliveryHorizon, setDeliveryHorizon] = useState(project.targetHorizon || 'June 2027 Milestone');
  const [agenda, setAgenda] = useState<SessionAgendaItem[]>([
    { id: 'ag-1', title: '1. Welcome & Alignment on Workshop Rules', completed: false, allocatedMinutes: 10 },
    { id: 'ag-2', title: '2. Review High-Priority Deliverables & Clear Blockers', completed: false, allocatedMinutes: 35 },
    { id: 'ag-3', title: '3. Voting Round on Controversial Items', completed: false, allocatedMinutes: 20 },
    { id: 'ag-4', title: '4. Record Agreed Dispositions & Finalize Backlog Export', completed: false, allocatedMinutes: 15 },
  ]);
  const [newAgendaTitle, setNewAgendaTitle] = useState('');
  const [newAgendaMins, setNewAgendaMins] = useState(15);

  const handleAddAgendaItem = () => {
    if (!newAgendaTitle.trim()) return;
    setAgenda([
      ...agenda,
      {
        id: `ag-${Date.now()}`,
        title: newAgendaTitle.trim(),
        completed: false,
        allocatedMinutes: Number(newAgendaMins) || 15,
      },
    ]);
    setNewAgendaTitle('');
  };

  const handleRemoveAgendaItem = (id: string) => {
    setAgenda(agenda.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      projectId: project.id,
      name: name.trim(),
      date,
      timeZone,
      objective: objective.trim(),
      deliveryHorizon: deliveryHorizon.trim(),
      agenda,
      stage: 'live',
      facilitatorId: currentUser.id,
      facilitatorName: currentUser.name,
      activeCardId: undefined,
      activeWorkstreamId: project.workstreams[0]?.id,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Create Planning Session</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Preserves session-specific assessments without duplicating cards.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Session Title *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Meeting Date (PRD Separate Setting) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Time Zone
              </label>
              <input
                type="text"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Target Delivery Horizon (Separate from Meeting Date) *
            </label>
            <input
              type="text"
              required
              value={deliveryHorizon}
              onChange={(e) => setDeliveryHorizon(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Objective & Key Outcomes
            </label>
            <textarea
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          {/* Agenda items list */}
          <div className="space-y-2 pt-1">
            <label className="block font-semibold text-stone-700 dark:text-stone-300">
              Workshop Agenda & Schedule ({agenda.length} items)
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1.5 border border-stone-200 dark:border-stone-700 rounded-lg p-2 bg-stone-50 dark:bg-[#18191c]">
              {agenda.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded bg-white dark:bg-[#20222a] border border-stone-200 dark:border-stone-700 text-xs"
                >
                  <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-stone-400">
                      {item.allocatedMinutes}m
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAgendaItem(item.id)}
                      className="text-stone-400 hover:text-rose-500 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add item row */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add agenda topic..."
                value={newAgendaTitle}
                onChange={(e) => setNewAgendaTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs"
              />
              <input
                type="number"
                min={5}
                max={120}
                value={newAgendaMins}
                onChange={(e) => setNewAgendaMins(Number(e.target.value))}
                className="w-16 px-2 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#18191c] text-stone-900 dark:text-stone-100 text-xs text-center"
              />
              <button
                type="button"
                onClick={handleAddAgendaItem}
                className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 font-semibold text-xs text-stone-800 dark:text-stone-100"
              >
                Add
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 font-bold shadow-md transition-colors"
            >
              Launch Session Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
