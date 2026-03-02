// EmergencyView Component
// Extracted from views.jsx

// Other views: Emergency, Settings, Recordings
// Extracted from index.html

function EmergencyView() {
  const contacts = [
    { name: 'Emergency Services', number: '000', desc: 'Police, Fire, Ambulance' },
    { name: 'SafeWork NSW', number: '13 10 50', desc: 'Report serious incidents' },
    { name: 'Poisons Information', number: '13 11 26', desc: '24/7 advice' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-red-600 rounded-xl p-4 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">📞 Emergency Information</h2>
        <p className="text-red-100 text-sm mt-1">Keep this information accessible</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm divide-y">
        {contacts.map((contact, idx) => (
          <a key={idx} href={`tel:${contact.number.replace(/\s/g, '')}`} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">{contact.name}</p>
              <p className="text-sm text-gray-500">{contact.desc}</p>
            </div>
            <span className="font-bold text-lg text-red-600">{contact.number}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
window.EmergencyView = EmergencyView;
