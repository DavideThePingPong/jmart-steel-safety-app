// PrestartView Component
// Extracted from forms.jsx

// Form views: Prestart, Incident, Toolbox, Inspection, ITP, SteelITP
// Extracted from index.html

function PrestartView({ onSubmit, onUpdate, editingForm, previousPrestarts = [], sites = [] }) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};

  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [checkType, setCheckType] = useState(editData.type || null);
  const [checks, setChecks] = useState(editData.checks || {});
  const [notes, setNotes] = useState(editData.notes || '');
  const [submitted, setSubmitted] = useState(false);
  const [signingWorker, setSigningWorker] = useState(null);
  const [showPreviousList, setShowPreviousList] = useState(false);
  const [supervisorName, setSupervisorName] = useState(editData.supervisorName || '');
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [builder, setBuilder] = useState(editData.builder || '');
  const [address, setAddress] = useState(editData.address || '');
  const [isLocating, setIsLocating] = useState(false);
  const [formDate, setFormDate] = useState(editData.date ? new Date(editData.date) : new Date());

  // Helper to ensure media fields have proper structure
  const ensureMediaStructure = (data) => ({
    value: data?.value || '',
    notes: Array.isArray(data?.notes) ? data.notes : [],
    media: Array.isArray(data?.media) ? data.media : []
  });

  const [workAreas, setWorkAreas] = useState(ensureMediaStructure(editData.workAreas));
  const [tasksThisShift, setTasksThisShift] = useState(ensureMediaStructure(editData.tasksThisShift));
  const [machineryControls, setMachineryControls] = useState(ensureMediaStructure(editData.machineryControls));
  const [siteHazards, setSiteHazards] = useState(ensureMediaStructure(editData.siteHazards));
  const [permitsRequired, setPermitsRequired] = useState(ensureMediaStructure(editData.permitsRequired));

  // New fields
  const [isPlantEquipmentUsed, setIsPlantEquipmentUsed] = useState(editData.isPlantEquipmentUsed ?? null); // yes/no
  const [highRiskWorks, setHighRiskWorks] = useState(editData.highRiskWorks ?? null); // yes/no/na
  const [worksCoveredBySWMS, setWorksCoveredBySWMS] = useState(editData.worksCoveredBySWMS ?? null); // yes/no/na
  const [hasSafetyIssues, setHasSafetyIssues] = useState(editData.hasSafetyIssues ?? null); // yes/no
  const [safetyIssuesPreviousShift, setSafetyIssuesPreviousShift] = useState(ensureMediaStructure(editData.safetyIssuesPreviousShift));
  const [translatorRequired, setTranslatorRequired] = useState(editData.translatorRequired ?? null); // yes/no
  const [translatorSignature, setTranslatorSignature] = useState(editData.translatorSignature || null);
  const [translatorName, setTranslatorName] = useState(editData.translatorName || '');
  const [signingTranslator, setSigningTranslator] = useState(false);

  const [signatures, setSignatures] = useState(editData.signatures || FORM_CONSTANTS.emptySignatures());

  const displayDate = formDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const displayTime = formDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const builders = FORM_CONSTANTS.builders;
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');
  const teamMembers = FORM_CONSTANTS.teamMembers;
  const checklistTypes = FORM_CONSTANTS.checklistTypes;
  const checklistItems = FORM_CONSTANTS.checklistItems;

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

  // Validation for Pre-Start form - WHS compliance required fields
  const [validationErrors, setValidationErrors] = useState([]);

  const validateForm = () => {
    // Use centralized validator for WHS-compliant checks
    if (window.formValidator) {
      return window.formValidator.validatePrestart({
        supervisorName, siteConducted, builder, address,
        highRiskWorks, worksCoveredBySWMS, isPlantEquipmentUsed,
        siteHazards, signatures, checks,
        checkType, checklistItems
      });
    }
    // Fallback: basic inline validation if validator not loaded
    const errors = [];
    if (!siteConducted) errors.push('Site/Location is required');
    if (!supervisorName) errors.push('Supervisor name is required');
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const formData = {
      type: checkType, checks, notes, signatures, supervisorName, siteConducted, builder, address,
      workAreas, tasksThisShift, machineryControls, siteHazards, permitsRequired,
      isPlantEquipmentUsed, highRiskWorks, worksCoveredBySWMS, hasSafetyIssues, safetyIssuesPreviousShift,
      translatorRequired, translatorSignature, translatorName,
      date: formDate.toISOString()
    };

    if (isEditing && onUpdate) {
      // When editing, the confirmation modal will handle the flow
      onUpdate(editingForm.id, 'prestart', formData);
      // Don't set submitted - the modal will handle navigation
    } else {
      onSubmit(formData);
      setSubmitted(true);
    }
  };

  const resetForm = () => {
    setStep(1); setCheckType(null); setChecks({}); setNotes('');
    setSupervisorName(''); setSiteConducted(''); setBuilder(''); setAddress('');
    setWorkAreas({ value: '', notes: [], media: [] });
    setTasksThisShift({ value: '', notes: [], media: [] });
    setMachineryControls({ value: '', notes: [], media: [] });
    setSiteHazards({ value: '', notes: [], media: [] });
    setPermitsRequired({ value: '', notes: [], media: [] });
    setIsPlantEquipmentUsed(null);
    setHighRiskWorks(null);
    setWorksCoveredBySWMS(null);
    setHasSafetyIssues(null);
    setSafetyIssuesPreviousShift({ value: '', notes: [], media: [] });
    setTranslatorRequired(null);
    setTranslatorSignature(null);
    setTranslatorName('');
    setSigningTranslator(false);
    setSignatures(FORM_CONSTANTS.emptySignatures());
    setSubmitted(false);
  };

  if (submitted) {
    const signedCount = Object.values(signatures).filter(s => s !== null).length;
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{isEditing ? 'Pre-Start Updated!' : 'Pre-Start Complete!'}</h2>
        <p className="text-gray-600 mb-2">{isEditing ? 'Your changes have been saved.' : 'Your checklist has been recorded.'}</p>
        <p className="text-sm text-gray-500 mb-6">{signedCount} worker(s) signed on</p>
        <button onClick={resetForm} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">{isEditing ? 'Back to Dashboard' : 'Start Another Check'}</button>
      </div>
    );
  }

  // Function to load data from a previous prestart
  const loadFromPrevious = (previousForm) => {
    const data = previousForm.data;

    // Set checklist type and move to step 2
    setCheckType(data.type);

    // Copy site details
    setSupervisorName(data.supervisorName || '');
    setSiteConducted(data.siteConducted || '');
    setBuilder(data.builder || '');
    setAddress(data.address || '');

    // Copy work context fields (with media)
    setWorkAreas(ensureMediaStructure(data.workAreas));
    setTasksThisShift(ensureMediaStructure(data.tasksThisShift));
    setMachineryControls(ensureMediaStructure(data.machineryControls));
    setSiteHazards(ensureMediaStructure(data.siteHazards));
    setPermitsRequired(ensureMediaStructure(data.permitsRequired));

    // Copy yes/no fields
    setIsPlantEquipmentUsed(data.isPlantEquipmentUsed ?? null);
    setHighRiskWorks(data.highRiskWorks ?? null);
    setWorksCoveredBySWMS(data.worksCoveredBySWMS ?? null);

    // Copy checklist checks
    setChecks(data.checks || {});

    // Reset fields that should be fresh for new form
    setFormDate(new Date()); // Current date/time
    setHasSafetyIssues(null); // Reset safety issues question
    setSafetyIssuesPreviousShift({ value: '', notes: [], media: [] }); // Clear safety issues
    setNotes(''); // Clear notes
    setTranslatorRequired(null);
    setTranslatorSignature(null);
    setTranslatorName('');
    setSignatures(FORM_CONSTANTS.emptySignatures()); // Clear all signatures

    // Close modal and go to step 2
    setShowPreviousList(false);
    setStep(2);
  };

  if (step === 1) {
    return (
      <div className="space-y-4">
        {/* Previous Prestarts Modal */}
        {showPreviousList && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Load from Previous</h3>
                <button onClick={() => setShowPreviousList(false)} className="text-gray-500 text-xl">✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                {previousPrestarts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No previous prestarts found.</p>
                    <p className="text-sm mt-2">Complete a prestart first to use this feature.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-3">Select a previous prestart to copy. Signatures and date will be reset.</p>
                    {previousPrestarts.slice(0, 20).map((form) => {
                      const formDate = new Date(form.data.date || form.createdAt);
                      const typeInfo = checklistTypes.find(t => t.id === form.data.type);
                      return (
                        <button
                          key={form.id}
                          onClick={() => loadFromPrevious(form)}
                          className="w-full bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl p-4 text-left transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 ${typeInfo?.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-lg flex-shrink-0`}>
                              {typeInfo?.emoji || '📋'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{form.data.siteConducted || 'Unknown Site'}</p>
                              <p className="text-sm text-gray-600 truncate">{typeInfo?.label || 'Pre-Start'} • {form.data.builder || 'No builder'}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">📋 Pre-Start Checklists</h2>
          <p className="text-gray-500 text-sm mt-1">Select the type of pre-start check</p>
        </div>

        {/* Load from Previous Button */}
        {previousPrestarts.length > 0 && (
          <button
            onClick={() => setShowPreviousList(true)}
            className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors"
          >
            <span className="text-2xl">📄</span>
            <div className="text-left">
              <p className="font-semibold text-blue-700">Copy from Previous Prestart</p>
              <p className="text-sm text-blue-600">Same job, different day? Load previous details</p>
            </div>
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          {checklistTypes.map((type) => (
            <button key={type.id} onClick={() => { setCheckType(type.id); setStep(2); }}
              className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-3 hover:shadow-md">
              <div className={`w-14 h-14 ${type.color} rounded-full flex items-center justify-center text-2xl`}>{type.emoji}</div>
              <span className="font-medium text-gray-700 text-center">{type.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const items = checklistItems[checkType] || [];
  const allChecked = items.every(item => checks[item.id] !== undefined);
  const signedCount = Object.values(signatures).filter(s => s !== null).length;

  if (step === 2) {
    return (
      <div className="space-y-4">
        {signingWorker && <SignaturePad name={signingWorker} onSave={(data) => { setSignatures({...signatures, [signingWorker]: data}); setSigningWorker(null); }} onCancel={() => setSigningWorker(null)} />}

        {isEditing && (
          <div className="bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2">
            <span className="text-blue-600 text-xl">✏️</span>
            <div>
              <p className="text-blue-800 font-semibold">Editing Mode</p>
              <p className="text-blue-600 text-sm">Modify this form and save your changes</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span>📅</span>
            <span className="font-bold text-lg">{displayDate}</span>
            <span className="text-sm opacity-80">at {displayTime}</span>
          </div>
          {isEditing && (
            <div className="flex gap-2 mt-2">
              <input
                type="date"
                value={formDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(formDate);
                  const [year, month, day] = e.target.value.split('-');
                  newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                  setFormDate(newDate);
                }}
                className="flex-1 bg-white/20 text-white border border-white/30 rounded-lg p-2 text-sm"
              />
              <input
                type="time"
                value={formDate.toTimeString().slice(0,5)}
                onChange={(e) => {
                  const newDate = new Date(formDate);
                  const [hours, minutes] = e.target.value.split(':');
                  newDate.setHours(parseInt(hours), parseInt(minutes));
                  setFormDate(newDate);
                }}
                className="bg-white/20 text-white border border-white/30 rounded-lg p-2 text-sm"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{checklistTypes.find(t => t.id === checkType)?.label}</h2>
            <button onClick={() => setStep(1)} className="text-gray-500 text-xl">✕</button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-800">Site Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">👤 Supervisor Name *</label>
            <select value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 bg-white">
              <option value="">Select Supervisor</option>
              {FORM_CONSTANTS.supervisors.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">📍 Address *</label>
            <div className="flex gap-2">
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg p-3" placeholder="Enter site address" />
              <button onClick={getLocation} disabled={isLocating}
                className="bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400">
                {isLocating ? '...' : '📍'}
              </button>
            </div>
          </div>
        </div>

        <NoteMediaBox label="Work Areas" value={workAreas.value} notes={workAreas.notes} media={workAreas.media}
          onValueChange={(val) => setWorkAreas(prev => ({...prev, value: val}))}
          onAddNote={(note) => setWorkAreas(prev => ({...prev, notes: [...prev.notes, note]}))}
          onAddMedia={(item) => { console.log('Work Areas onAddMedia called with:', item?.name); setWorkAreas(prev => ({...prev, media: [...prev.media, item]})); }}
          onRemoveNote={(idx) => setWorkAreas(prev => ({...prev, notes: prev.notes.filter((_, i) => i !== idx)}))}
          onRemoveMedia={(idx) => setWorkAreas(prev => ({...prev, media: prev.media.filter((_, i) => i !== idx)}))} />

        <NoteMediaBox label="Task to be Completed this Shift" value={tasksThisShift.value} notes={tasksThisShift.notes} media={tasksThisShift.media}
          onValueChange={(val) => setTasksThisShift(prev => ({...prev, value: val}))}
          onAddNote={(note) => setTasksThisShift(prev => ({...prev, notes: [...prev.notes, note]}))}
          onAddMedia={(item) => { console.log('Tasks onAddMedia called with:', item?.name); setTasksThisShift(prev => ({...prev, media: [...prev.media, item]})); }}
          onRemoveNote={(idx) => setTasksThisShift(prev => ({...prev, notes: prev.notes.filter((_, i) => i !== idx)}))}
          onRemoveMedia={(idx) => setTasksThisShift(prev => ({...prev, media: prev.media.filter((_, i) => i !== idx)}))} />

        {/* Is Plant/Equipment to be used? */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3">🚜 Is Plant/Equipment to be used?</h4>
          <div className="flex gap-3">
            <button onClick={() => setIsPlantEquipmentUsed(true)}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${isPlantEquipmentUsed === true ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              Yes
            </button>
            <button onClick={() => setIsPlantEquipmentUsed(false)}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${isPlantEquipmentUsed === false ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              No
            </button>
          </div>
        </div>

        {/* Conditional Machinery Controls - only shows if Plant/Equipment is Yes */}
        {isPlantEquipmentUsed === true && (
          <NoteMediaBox label="Controls Required for Machinery / Plants" value={machineryControls.value} notes={machineryControls.notes} media={machineryControls.media}
            onValueChange={(val) => setMachineryControls(prev => ({...prev, value: val}))}
            onAddNote={(note) => setMachineryControls(prev => ({...prev, notes: [...prev.notes, note]}))}
            onAddMedia={(item) => { console.log('Machinery onAddMedia called with:', item?.name); setMachineryControls(prev => ({...prev, media: [...prev.media, item]})); }}
            onRemoveNote={(idx) => setMachineryControls(prev => ({...prev, notes: prev.notes.filter((_, i) => i !== idx)}))}
            onRemoveMedia={(idx) => setMachineryControls(prev => ({...prev, media: prev.media.filter((_, i) => i !== idx)}))} />
        )}

        {/* Site Specific Hazards - text box only */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 text-orange-600 mb-3">Site Specific Hazards</h4>
          <textarea value={siteHazards.value} onChange={(e) => setSiteHazards(prev => ({...prev, value: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]"
            placeholder="Enter site specific hazards..." />
        </div>

        {/* Site Specific Permits Required - text box only */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 text-orange-600 mb-3">Site Specific Permits Required</h4>
          <textarea value={permitsRequired.value} onChange={(e) => setPermitsRequired(prev => ({...prev, value: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]"
            placeholder="Enter permits required..." />
        </div>

        {/* High Risk Works? */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3">⚠️ High Risk Works?</h4>
          <div className="flex gap-3">
            <button onClick={() => setHighRiskWorks('yes')}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${highRiskWorks === 'yes' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              Yes
            </button>
            <button onClick={() => setHighRiskWorks('no')}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${highRiskWorks === 'no' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              No
            </button>
            <button onClick={() => setHighRiskWorks('na')}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${highRiskWorks === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              N/A
            </button>
          </div>
        </div>

        {/* Works performed are covered by SWMS? */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3">📋 Works performed are covered by SWMS?</h4>
          <div className="flex gap-3">
            <button onClick={() => setWorksCoveredBySWMS('yes')}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${worksCoveredBySWMS === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              Yes
            </button>
            <button onClick={() => setWorksCoveredBySWMS('no')}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${worksCoveredBySWMS === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              No
            </button>
            <button onClick={() => setWorksCoveredBySWMS('na')}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${worksCoveredBySWMS === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              N/A
            </button>
          </div>
        </div>

        {/* Safety issues/incidents from previous shift */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3">⚠️ Safety Issues/Incidents from Previous Shift or Industry Safety Notices?</h4>
          <div className="flex gap-3">
            <button onClick={() => setHasSafetyIssues(true)}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${hasSafetyIssues === true ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              Yes
            </button>
            <button onClick={() => { setHasSafetyIssues(false); setSafetyIssuesPreviousShift({ value: '', notes: [], media: [] }); }}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${hasSafetyIssues === false ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              No
            </button>
          </div>
        </div>

        {/* Conditional Safety Issues Box - only shows if Yes */}
        {hasSafetyIssues === true && (
          <NoteMediaBox label="Safety Issues/Incidents Details" value={safetyIssuesPreviousShift.value} notes={safetyIssuesPreviousShift.notes} media={safetyIssuesPreviousShift.media}
            onValueChange={(val) => setSafetyIssuesPreviousShift(prev => ({...prev, value: val}))}
            onAddNote={(note) => setSafetyIssuesPreviousShift(prev => ({...prev, notes: [...prev.notes, note]}))}
            onAddMedia={(item) => { console.log('Safety Issues onAddMedia called with:', item?.name); setSafetyIssuesPreviousShift(prev => ({...prev, media: [...prev.media, item]})); }}
            onRemoveNote={(idx) => setSafetyIssuesPreviousShift(prev => ({...prev, notes: prev.notes.filter((_, i) => i !== idx)}))}
            onRemoveMedia={(idx) => setSafetyIssuesPreviousShift(prev => ({...prev, media: prev.media.filter((_, i) => i !== idx)}))} />
        )}

        <div className="bg-white rounded-xl shadow-sm divide-y">
          {items.map((item, idx) => (
            <div key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-700">{idx + 1}. {item.text}</span>
                <div className="flex gap-2">
                  <button onClick={() => setChecks({...checks, [item.id]: true})}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${checks[item.id] === true ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>✓</button>
                  <button onClick={() => setChecks({...checks, [item.id]: false})}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${checks[item.id] === false ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Issues</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3" rows={3} placeholder="Record any issues..." />
        </div>

        <button onClick={() => setStep(3)} disabled={!allChecked || !supervisorName || !siteConducted || !builder || !address}
          className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300">
          Next: Worker Sign-On →
        </button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-4">
        {signingWorker && <SignaturePad name={signingWorker} onSave={(data) => { setSignatures({...signatures, [signingWorker]: data}); setSigningWorker(null); }} onCancel={() => setSigningWorker(null)} />}
        {signingTranslator && <SignaturePad name={translatorName || "Translator"} onSave={(data) => { setTranslatorSignature(data); setSigningTranslator(false); }} onCancel={() => setSigningTranslator(false)} />}

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Worker Sign-On</h2>
            <button onClick={() => setStep(2)} className="text-gray-500">← Back</button>
          </div>
          <p className="text-gray-500 text-sm mt-1">Tap on a signature box to sign</p>
        </div>

        {/* Translator Required? */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3">🌐 Translator Required?</h4>
          <div className="flex gap-3 mb-4">
            <button onClick={() => setTranslatorRequired(true)}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${translatorRequired === true ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              Yes
            </button>
            <button onClick={() => { setTranslatorRequired(false); setTranslatorSignature(null); setTranslatorName(''); }}
              className={`flex-1 py-3 rounded-lg font-medium border-2 ${translatorRequired === false ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`}>
              No
            </button>
          </div>

          {/* Translator Signoff - only shows if Translator Required is Yes */}
          {translatorRequired === true && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Translator Name *</label>
                <input type="text" value={translatorName} onChange={(e) => setTranslatorName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3" placeholder="Enter translator name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Translator Signature *</label>
                {translatorSignature ? (
                  <div className="relative inline-block">
                    <div className="border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40">
                      <img src={translatorSignature} alt="translator signature" className="h-full w-full object-contain" />
                    </div>
                    <button onClick={() => setTranslatorSignature(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setSigningTranslator(true)}
                    className="h-20 w-40 border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:border-blue-500">
                    Tap to sign
                  </button>
                )}
              </div>
            </div>
          )}
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
                  className="h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-500">
                  Tap to sign
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 font-medium">{signedCount} of {teamMembers.length} workers signed</p>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4">
            <p className="text-red-800 font-semibold mb-2">⚠️ Cannot submit - please fix these issues:</p>
            <ul className="text-red-700 text-sm space-y-1">
              {validationErrors.map((err, i) => <li key={i}>• {err}</li>)}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => { setValidationErrors([]); setStep(2); }} className="flex-1 border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold">← Back</button>
          <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold">
            {isEditing ? '✓ Update Pre-Start' : '✓ Complete Pre-Start'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Incident View
window.PrestartView = PrestartView;
