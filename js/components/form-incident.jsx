// IncidentView Component
// Extracted from forms.jsx

function IncidentView({ onSubmit, onUpdate, editingForm }) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};

  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [formData, setFormData] = useState({
    type: editData.type || '', date: editData.date || localDateStr(), time: editData.time || new Date().toTimeString().slice(0, 5),
    location: editData.location || '', description: editData.description || '', injuries: editData.injuries || 'none', injuryDetails: editData.injuryDetails || '', witnesses: editData.witnesses || '', immediateActions: editData.immediateActions || '', reportedBy: editData.reportedBy || '',
  });
  const [reporterSignature, setReporterSignature] = useState(editData.reporterSignature || null);
  const [signingReporter, setSigningReporter] = useState(false);
  const [validationError, setValidationError] = useState('');

  const incidentTypes = [
    { id: 'nearmiss', label: 'Near Miss', description: 'Could have caused injury', color: 'bg-yellow-500' },
    { id: 'injury', label: 'Injury', description: 'Resulted in injury', color: 'bg-red-500' },
    { id: 'damage', label: 'Property Damage', description: 'Equipment/property damage', color: 'bg-orange-500' },
    { id: 'environmental', label: 'Environmental', description: 'Spill/leak/environmental', color: 'bg-green-500' },
  ];

  useEffect(() => {
    const data = editingForm?.data || {};
    setStep(editingForm ? 2 : 1);
    setFormData({
      type: data.type || '', date: data.date || localDateStr(), time: data.time || new Date().toTimeString().slice(0, 5),
      // Use ?? (nullish coalesce) for fields where '' is a meaningful value the
      // user might have set deliberately. With || an empty string was being
      // silently replaced — e.g. cleared "injuries" turned back into 'none' on
      // edit, changing the audit trail without the user knowing.
      location: data.location ?? '', description: data.description ?? '', injuries: data.injuries ?? 'none', injuryDetails: data.injuryDetails ?? '', witnesses: data.witnesses ?? '', immediateActions: data.immediateActions ?? '', reportedBy: data.reportedBy ?? '',
    });
    setReporterSignature(data.reporterSignature || null);
    setSigningReporter(false);
    setValidationError('');
  }, [editingForm]);

  const handleIncidentSubmit = () => {
    // Use centralized validator for comprehensive WHS-compliant checks
    const validationData = { ...formData, reporterSignature, incidentType: formData.type, incidentDate: formData.date, incidentTime: formData.time };
    const errors = window.formValidator ? window.formValidator.validateIncident(validationData) : [];
    if (errors.length > 0) {
      setValidationError(errors.join('. '));
      return;
    }
    setValidationError('');
    const submitData = { ...formData, reporterSignature };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'incident', submitData);
    } else {
      onSubmit(submitData);
      setStep(4);
    }
  };

  const isNotifiable = formData.type === 'injury' || (formData.type === 'damage' && formData.description && formData.description.toLowerCase().match(/collapse|fall|electr|explos|gas|chemical|asbestos|confined|trench/));

  if (step === 4) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{isEditing ? 'Report Updated!' : 'Report Submitted!'}</h2>
        <p className="text-gray-600 mb-6">Reference: INC-{Date.now().toString().slice(-6)}</p>
        {isNotifiable && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 mx-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-800 text-lg">Possible Notifiable Incident</h3>
                <p className="text-red-700 text-sm mt-1">Under the WHS Act 2011, serious injuries, dangerous incidents, and deaths must be reported to SafeWork NSW immediately.</p>
                <div className="mt-3 space-y-1 text-sm text-red-800">
                  <p className="font-semibold">You must:</p>
                  <p>1. Call SafeWork NSW: <a href="tel:131050" className="underline font-bold">13 10 50</a></p>
                  <p>2. Preserve the scene (do not disturb unless preventing further injury)</p>
                  <p>3. Written notification within 48 hours</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <button onClick={() => {
          setStep(1);
          setFormData({
            type: '', date: localDateStr(), time: new Date().toTimeString().slice(0, 5),
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

      {isEditing && (
        <div className="bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2">
          <span className="text-blue-600 text-xl">✏️</span>
          <div>
            <p className="text-blue-800 font-semibold">Editing Mode</p>
            <p className="text-blue-600 text-sm">Modify this report and save your changes</p>
          </div>
        </div>
      )}

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
