// ToolboxView Component
// Extracted from forms.jsx

function ToolboxView({ onSubmit, sites = [] }) {
  const [step, setStep] = useState(1);
  const [signingWorker, setSigningWorker] = useState(null);
  const [siteConducted, setSiteConducted] = useState('');
  const [builder, setBuilder] = useState('');
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [preparedBy, setPreparedBy] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [otherTopic, setOtherTopic] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [feedbackResponses, setFeedbackResponses] = useState('');
  const [signatures, setSignatures] = useState(FORM_CONSTANTS.emptySignatures());
  const [validationErrors, setValidationErrors] = useState([]);

  const todayDate = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const teamMembers = FORM_CONSTANTS.teamMembers;
  const preparers = FORM_CONSTANTS.supervisors;
  const builders = FORM_CONSTANTS.builders;
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');

  const topics = [
    'Manual Handling', 'Working at Heights', 'Hot Work Safety', 'PPE Requirements',
    'Emergency Procedures', 'Electrical Safety', 'Housekeeping', 'Slips, Trips & Falls',
    'Fire Safety', 'First Aid', 'Hazard Identification', 'Risk Assessment',
    'Confined Spaces', 'Scaffolding Safety', 'Crane & Lifting Operations', 'Welding Safety',
    'Chemical Handling', 'Noise & Hearing Protection', 'Sun & Heat Safety', 'Mental Health & Wellbeing',
    'Tool Safety', 'Mobile Plant Safety', 'Traffic Management', 'Asbestos Awareness',
    'Lock Out Tag Out (LOTO)', 'Incident Reporting', 'Near Miss Reporting', 'Safe Work Method Statements (SWMS)'
  ];

  const signedCount = Object.values(signatures).filter(s => s !== null).length;

  const toggleTopic = (topic) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await response.json();
            setAddress(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
          } catch (e) {
            setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
          }
          setIsLocating(false);
        },
        () => { alert('Unable to get location'); setIsLocating(false); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const handleSubmit = () => {
    const errors = window.formValidator.validateToolbox({
      siteConducted, preparedBy, topics: selectedTopics, signatures
    });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    onSubmit({
      siteConducted, builder, address, preparedBy,
      topics: selectedTopics, otherTopic, correctiveAction, feedbackResponses,
      signatures, date: new Date().toISOString()
    });
    setStep(3);
  };

  const resetForm = () => {
    setStep(1);
    setSiteConducted(''); setBuilder(''); setAddress(''); setPreparedBy('');
    setSelectedTopics([]); setOtherTopic(''); setCorrectiveAction(''); setFeedbackResponses('');
    setSignatures(FORM_CONSTANTS.emptySignatures());
  };

  if (step === 3) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Toolbox Talk Recorded!</h2>
        <p className="text-gray-600 mb-6">{signedCount} attendees signed on</p>
        <button onClick={resetForm} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">Record Another</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signingWorker && <SignaturePad name={signingWorker} onSave={(data) => { setSignatures({...signatures, [signingWorker]: data}); setSigningWorker(null); }} onCancel={() => setSigningWorker(null)} />}

      {/* Date Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="font-bold text-lg">{todayDate}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">👥 Toolbox Talk</h2>
        <p className="text-gray-500 text-sm mt-1">Daily safety briefing record</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {/* Site Details */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-800">Site Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Conducted *</label>
              <select value={siteConducted} onChange={(e) => setSiteConducted(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
                <option value="">Select Site</option>
                {sitesList.map((site) => <option key={site} value={site}>{site}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Builder *</label>
              <select value={builder} onChange={(e) => setBuilder(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
                <option value="">Select Builder</option>
                {builders.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📍 Site Address *</label>
              <div className="flex gap-2">
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg p-3" placeholder="Enter site address" />
                <button onClick={getLocation} disabled={isLocating}
                  className="bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400">
                  {isLocating ? '...' : '📍'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prepared By *</label>
              <select value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
                <option value="">Select Preparer</option>
                {preparers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Topics Discussed */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">📋 Topics Discussed</h3>
            <p className="text-sm text-gray-500 mb-3">Select all topics covered in this toolbox talk</p>
            <div className="grid grid-cols-2 gap-2">
              {topics.map((topic) => (
                <button key={topic} onClick={() => toggleTopic(topic)}
                  className={`p-2 rounded-lg text-sm text-left border-2 ${selectedTopics.includes(topic) ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-gray-200 text-gray-700'}`}>
                  {selectedTopics.includes(topic) ? '✓ ' : ''}{topic}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Other Topics</label>
              <textarea value={otherTopic} onChange={(e) => setOtherTopic(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm" rows={2}
                placeholder="Enter any other topics discussed..." />
            </div>
          </div>

          {/* Corrective Action Required */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h4 className="font-semibold text-gray-800 text-orange-600 mb-3">Corrective Action Required</h4>
            <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]"
              placeholder="Enter any corrective actions required..." />
          </div>

          {/* Feedback and Responses */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h4 className="font-semibold text-gray-800 text-orange-600 mb-3">Feedback and Responses</h4>
            <textarea value={feedbackResponses} onChange={(e) => setFeedbackResponses(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]"
              placeholder="Enter feedback and responses from attendees..." />
          </div>

          <button onClick={() => setStep(2)}
            disabled={!siteConducted || !builder || !address || !preparedBy || selectedTopics.length === 0}
            className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300">
            Next: Attendance & Signatures →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Attendance & Signatures</h2>
              <button onClick={() => setStep(1)} className="text-gray-500">← Back</button>
            </div>
            <p className="text-gray-500 text-sm mt-1">Tap on a signature box to sign</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-sm text-purple-800"><strong>Topics:</strong> {selectedTopics.join(', ')}</p>
            {otherTopic && <p className="text-sm text-purple-800 mt-1"><strong>Other:</strong> {otherTopic}</p>}
          </div>

          <div className="bg-white rounded-xl shadow-sm divide-y">
            {teamMembers.map((name) => (
              <div key={name} className="p-4 flex items-center justify-between">
                <span className="font-medium text-gray-800">{name}</span>
                {signatures[name] ? (
                  <div className="relative">
                    <div className="border-2 border-green-500 rounded-lg p-2 bg-green-50 h-16 w-32">
                      <img src={signatures[name]} alt="signature" className="h-full w-full object-contain" />
                    </div>
                    <button onClick={() => setSignatures({...signatures, [name]: null})}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setSigningWorker(name)}
                    className="h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-500">
                    Tap to sign
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 font-medium">{signedCount} of {teamMembers.length} attendees signed</p>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-semibold mb-2">Please fix the following:</p>
              {validationErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold">← Back</button>
            <button onClick={handleSubmit} disabled={signedCount === 0} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300">
              ✓ Complete Toolbox Talk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcontractor Site Inspection View
window.ToolboxView = ToolboxView;
