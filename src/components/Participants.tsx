import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';

type Member = {
  id: string;
  name: string;
  color: string;
  avatar: string;
};

type Props = {
  members: Member[];
  transactions: any[];
  savingsTransactions?: any[];
  addMember: (member: { name: string; color: string; avatar: string }) => void;
  updateMember: (memberId: string, name: string) => void;
  deleteMember: (memberId: string, reassignToMemberId?: string) => void;
};

export default function Participants({
  members,
  transactions,
  savingsTransactions = [],
  addMember,
  updateMember,
  deleteMember,
}: Props) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const MEMBER_COLORS = [
  '#3b82f6',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#64748b',
];

const [newColor, setNewColor] = useState(MEMBER_COLORS[0]);

  const handleAdd = () => {
  const cleanName = newName.trim();
  if (!cleanName) return;

  addMember({
    name: cleanName,
    color: newColor,
    avatar: cleanName.charAt(0).toUpperCase() || '?',
  });

  setNewName('');
  setNewColor(MEMBER_COLORS[0]);
};

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setEditingName(member.name);
  };

  const saveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    updateMember(editingId, editingName);
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (member: Member) => {
    const memberTransactions = transactions.filter((tx) => tx.member === member.id);
    const memberSavings = savingsTransactions.filter((tx) => tx.member === member.id);
    const totalOperations = memberTransactions.length + memberSavings.length;

    if (members.length <= 1) {
      alert('Нельзя удалить последнего участника.');
      return;
    }

    if (totalOperations === 0) {
      const ok = confirm(`Удалить участника "${member.name}"?`);
      if (ok) deleteMember(member.id);
      return;
    }

    const otherMembers = members.filter((m) => m.id !== member.id);

    const names = otherMembers
      .map((m, index) => `${index + 1}. ${m.name}`)
      .join('\n');

    const choice = prompt(
      `У участника "${member.name}" есть операции: ${totalOperations}.\n\nКому передать операции?\n\n${names}\n\nВведи номер участника:`
    );

    if (!choice) return;

    const selectedIndex = Number(choice) - 1;
    const selectedMember = otherMembers[selectedIndex];

    if (!selectedMember) {
      alert('Неверный номер участника.');
      return;
    }

    const ok = confirm(
      `Передать все операции участника "${member.name}" участнику "${selectedMember.name}" и удалить?`
    );

    if (ok) {
      deleteMember(member.id, selectedMember.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Участники</h1>
        <p className="text-muted-foreground mt-1">
          Добавляй, редактируй и удаляй людей, которые участвуют в бюджете.
        </p>
      </div>

      <div className="bg-card rounded-2xl p-4 border space-y-3">
        <h2 className="font-semibold">Добавить участника</h2>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Например: Артём, Лена, Иван"
            className="flex-1 rounded-xl border bg-background px-3 py-2"
          />

          <button
            onClick={handleAdd}
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2 flex items-center gap-2"
          >
            <Plus size={18} />
            Добавить
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">

  {MEMBER_COLORS.map((color) => (

    <button

      key={color}

      type="button"

      onClick={() => setNewColor(color)}

      className={`w-8 h-8 rounded-full border-2 ${

        newColor === color ? 'border-slate-900' : 'border-transparent'

      }`}

      style={{ backgroundColor: color }}

    />

  ))}

</div>
      </div>

      <div className="bg-card rounded-2xl p-4 border space-y-3">
        <h2 className="font-semibold">Список участников</h2>

        {members.map((member) => {
          const operationsCount =
            transactions.filter((tx) => tx.member === member.id).length +
            savingsTransactions.filter((tx) => tx.member === member.id).length;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 border rounded-xl p-3"
            >
              <div className="flex-1">
                {editingId === member.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2"
                  />
                ) : (
                  <>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Операций: {operationsCount}
                    </div>
                  </>
                )}
              </div>

              {editingId === member.id ? (
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="p-2 rounded-lg border">
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 rounded-lg border"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(member)}
                    className="p-2 rounded-lg border"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(member)}
                    className="p-2 rounded-lg border text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}