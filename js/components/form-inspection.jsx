// SubcontractorInspectionView Component
// Extracted from forms.jsx

function SubcontractorInspectionView({ onSubmit, sites = [] }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [siteConducted, setSiteConducted] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [completedBy, setCompletedBy] = useState('');
  const [completedBySignature, setCompletedBySignature] = useState(null);
  const [signingInspector, setSigningInspector] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Inspection items with Yes/No/N/A
  const [inspectionItems, setInspectionItems] = useState({
    siteBoxes: null,
    electricalLeads: null,
    toolsRetagging: null,
    exclusionZones: null,
    permitsCompleted: null,
    permitsActive: null,
    penetrationsCovered: null,
    equipmentInspection: null,
    workerSafetyConcerns: null,
    builderRequests: null,
  });

  const todayDate = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const preparers = FORM_CONSTANTS.supervisors;
  const inspectors = ['Scott Seeho', 'Davide Casolini'];
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');

  const inspectionQuestions = [
    { id: 'siteBoxes', text: 'Site boxes in good condition and lockable' },
    { id: 'electricalLeads', text: 'Electrical leads and tools are tagged and tested up to date' },
    { id: 'toolsRetagging', text: 'Tools or Equipment needed retagging or testing soon' },
    { id: 'exclusionZones', text: 'Exclusion zones set up around work areas (as required)' },
    { id: 'permitsCompleted', text: 'Permits are completed (as required)' },
    { id: 'permitsActive', text: 'Permits Active during inspection' },
    { id: 'penetrationsCovered', text: 'Penetrations are covered or have barriers around them' },
    { id: 'equipmentInspection', text: 'Equipment onsite has recent inspection completed' },
    { id: 'workerSafetyConcerns', text: 'Any worker reports of safety concerns or improvements' },
    { id: 'builderRequests', text: 'Any request from Builder' },
  ];

  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await response.json();
            setLocation(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
          } catch (e) {
            setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
          }
          setIsLocating(false);
        },
        () => { alert('Unable to get location'); setIsLocating(false); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const setInspectionValue = (id, value) => {
    setInspectionItems({ ...inspectionItems, [id]: value });
  };

  const allAnswered = Object.values(inspectionItems).every(v => v !== null);

  const handleSubmit = () => {
    const errors = window.formValidator.validateInspection({
      siteConducted, preparedBy, completedBy, inspectionItems
    });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    onSubmit({
      siteConducted, preparedBy, location, completedBy, completedBySignature, inspectionItems,
      date: new Date().toISOString()
    });
    setSubmitted(true);
  };

  const resetForm = () => {
    setSiteConducted(''); setPreparedBy(''); setLocation(''); setCompletedBy('');
    setCompletedBySignature(null); setSigningInspector(false);
    setInspectionItems({
      siteBoxes: null, electricalLeads: null, toolsRetagging: null, exclusionZones: null,
      permitsCompleted: null, permitsActive: null, penetrationsCovered: null,
      equipmentInspection: null, workerSafetyConcerns: null, builderRequests: null,
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Inspection Complete!</h2>
        <p className="text-gray-600 mb-6">Site inspection has been recorded.</p>
        <button onClick={resetForm} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">Start Another Inspection</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signingInspector && <SignaturePad name={completedBy || "Inspector"} onSave={(data) => { setCompletedBySignature(data); setSigningInspector(false); }} onCancel={() => setSigningInspector(false)} />}

      {/* Date Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="font-bold text-lg">{todayDate}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">🔍 Subcontractor Site Inspection</h2>
        <p className="text-gray-500 text-sm mt-1">Complete site safety inspection</p>
      </div>

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
          <label className="block text-sm font-medium text-gray-700 mb-2">Prepared By *</label>
          <select value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
            <option value="">Select Preparer</option>
            {preparers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">📍 Location *</label>
          <div className="flex gap-2">
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg p-3" placeholder="Enter location" />
            <button onClick={getLocation} disabled={isLocating}
              className="bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400">
              {isLocating ? '...' : '📍'}
            </button>
          </div>
        </div>
      </div>

      {/* Inspection Questions */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">📋 Inspection Checklist</h3>
        <div className="space-y-4">
          {inspectionQuestions.map((item, idx) => (
            <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <p className="text-gray-700 mb-2 text-sm">{idx + 1}. {item.text}</p>
              <div className="flex gap-2">
                <button onClick={() => setInspectionValue(item.id, 'yes')}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`}>
                  Yes
                </button>
                <button onClick={() => setInspectionValue(item.id, 'no')}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`}>
                  No
                </button>
                <button onClick={() => setInspectionValue(item.id, 'na')}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`}>
                  N/A
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inspection Completed By */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800">✅ Inspection Completed By *</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <select value={completedBy} onChange={(e) => { setCompletedBy(e.target.value); setCompletedBySignature(null); }} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
            <option value="">Select Inspector</option>
            {inspectors.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        {completedBy && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Signature *</label>
            {completedBySignature ? (
              <div className="relative inline-block">
                <div className="border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40">
                  <img src={completedBySignature} alt="inspector signature" className="h-full w-full object-contain" />
                </div>
                <button onClick={() => setCompletedBySignature(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm">✕</button>
              </div>
            ) : (
              <button onClick={() => setSigningInspector(true)}
                className="h-20 w-40 border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:border-blue-500">
                Tap to sign
              </button>
            )}
          </div>
        )}
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-semibold mb-2">Please fix the following:</p>
          {validationErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}
        </div>
      )}

      <button onClick={handleSubmit}
        disabled={!siteConducted || !preparedBy || !location || !allAnswered || !completedBy || !completedBySignature}
        className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300">
        ✓ Complete Inspection
      </button>
    </div>
  );
}

// ITP Form View
window.SubcontractorInspectionView = SubcontractorInspectionView;
