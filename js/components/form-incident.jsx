// IncidentView Component
// Extracted from forms.jsx

function IncidentView({ onSubmit }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    type: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5),
    location: '', description: '', injuries: 'none', injuryDetails: '', witnesses: '', immediateActions: '', reportedBy: '',
  });
  const [reporterSignature, setReporterSignature] = useState(null);
  const [signingReporter, setSigningReporter] = useState(false);
  const [validationError, setValidationError] = useState('');

  const incidentTypes = [
    { id: 'nearmiss', label: 'Near Miss', description: 'Could have caused injury', color: 'bg-yellow-500' },
    { id: 'injury', label: 'Injury', description: 'Resulted in injury', color: 'bg-red-500' },
    { id: 'damage', label: 'Property Damage', description: 'Equipment/property damage', color: 'bg-orange-500' },
    { id: 'environmental', label: 'Environmental', description: 'Spill/leak/environmental', color: 'bg-green-500' },
  ];

  const handleIncidentSubmit = () => {
    if (!reporterSignature) {
      setValidationError('Signature is required to submit an incident report');
      return;
    }
    if (!formData.reportedBy) {
      setValidationError('Reporter name is required');
      return;
    }
    if (!formData.immediateActions) {
      setValidationError('Immediate actions taken must be documented');
      return;
    }
    setValidationError('');
    onSubmit({ ...formData, reporterSignature });
    setStep(4);
  };

  if (step === 4) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Report Submitted!</h2>
        <p className="text-gray-600 mb-6">Reference: INC-{Date.now().toString().slice(-6)}</p>
        <button onClick={() => {
          setStep(1);
          setFormData({
            type: '', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5),
            location: '', description: '', injuries: 'none', injuryDetails: '', witnesses: '', immediateActions: '', reportedBy: '',
          });
          setReporterSignature(null);
          setValidationError('');
        }} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">Submit Another</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">⚠️ Incident / Near Miss Report</h2>
        <p className="text-gray-500 text-sm mt-1">Report all incidents within 24 hours</p>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          {incidentTypes.map((type) => (
            <button key={type.id} onClick={() => { setFormData({...formData, type: type.id}); setStep(2); }}
              className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 ${type.color} rounded-full flex items-center justify-center text-white text-xl`}>⚠️</div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">{type.label}</p>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-800">Incident Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border rounded-lg p-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
              <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full border rounded-lg p-3" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border rounded-lg p-3" placeholder="Where did this occur?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg p-3" rows={4} placeholder="Describe what happened..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg">Back</button>
            <button onClick={() => setStep(3)} disabled={!formData.location || !formData.description} className="flex-1 bg-orange-600 text-white py-3 rounded-lg disabled:bg-gray-300">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-800">Additional Information</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reported By *</label>
            <input type="text" value={formData.reportedBy} onChange={(e) => setFormData({...formData, reportedBy: e.target.value})} className="w-full border rounded-lg p-3" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Witnesses (if any)</label>
            <input type="text" value={formData.witnesses} onChange={(e) => setFormData({...formData, witnesses: e.target.value})} className="w-full border rounded-lg p-3" placeholder="Names of any witnesses" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Immediate Actions Taken *</label>
            <textarea value={formData.immediateActions} onChange={(e) => setFormData({...formData, immediateActions: e.target.value})} className="w-full border rounded-lg p-3" rows={3} placeholder="What actions were taken immediately after the incident?" />
          </div>

          {/* Reporter Signature - REQUIRED */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Reporter Signature * <span className="text-red-500 text-xs">(Required for submission)</span></label>
            {reporterSignature ? (
              <div className="relative inline-block">
                <div className="border-2 border-green-500 rounded-lg p-2 bg-green-50">
                  <img src={reporterSignature} alt="signature" className="h-16 object-contain" />
                </div>
                <button onClick={() => setReporterSignature(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm">✕</button>
              </div>
            ) : (
              <button onClick={() => setSigningReporter(true)}
                className="w-full h-20 border-2 border-dashed border-red-300 rounded-lg text-red-500 hover:border-red-500 bg-red-50 font-medium">
                ✍️ Tap to Sign (Required)
              </button>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
              <p className="text-red-700 text-sm">⚠️ {validationError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setValidationError(''); setStep(2); }} className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg">Back</button>
            <button onClick={handleIncidentSubmit} className="flex-1 bg-red-600 text-white py-3 rounded-lg">Submit Report</button>
          </div>
        </div>
      )}

      {/* Signature Pad Modal */}
      {signingReporter && (
        <SignaturePad
          name={formData.reportedBy || "Reporter"}
          onSave={(sig) => { setReporterSignature(sig); setSigningReporter(false); }}
          onCancel={() => setSigningReporter(false)}
        />
      )}
    </div>
  );
}

// Toolbox View
window.IncidentView = IncidentView;
