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

  const [signatures, setSignatures] = useState(editData.signatures || {
    'Jeff Fu': null, 'Scott Seeho': null, 'Davide Casolini': null,
    'Zonggang Jiang': null, 'Leon Yu': null, 'Wang Jia': null, 'Gen Bao': null,
  });

  const displayDate = formDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const displayTime = formDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const builders = ['Fdc Fitout and Refurbishment', 'Fdc Construction', 'Hunter Mason', 'Built', 'Lendlease'];
  const defaultSites = ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney', 'Site 4 - Chatswood', 'Site 5 - Liverpool'];
  const sitesList = (sites.length > 0 ? sites : defaultSites).filter(s => typeof s === 'string');
  const teamMembers = ['Jeff Fu', 'Scott Seeho', 'Davide Casolini', 'Zonggang Jiang', 'Leon Yu', 'Wang Jia', 'Gen Bao'];

  const checklistTypes = [
    { id: 'site', label: 'Site Pre-Start', emoji: '🏗️', color: 'bg-blue-500' },
    { id: 'crane', label: 'Crane/Hoist', emoji: '🏗️', color: 'bg-orange-500' },
    { id: 'forklift', label: 'Forklift', emoji: '🚜', color: 'bg-green-500' },
    { id: 'vehicle', label: 'Vehicle', emoji: '🚗', color: 'bg-purple-500' },
    { id: 'welding', label: 'Welding Equipment', emoji: '🔥', color: 'bg-red-500' },
    { id: 'scaffold', label: 'Scaffold', emoji: '🪜', color: 'bg-yellow-500' },
  ];

  const checklistItems = {
    site: [
      { id: 's1', text: 'Site access and egress points clear' },
      { id: 's2', text: 'Exclusion zones and barriers in place' },
      { id: 's3', text: 'First aid kit available and stocked' },
      { id: 's4', text: 'Emergency assembly point identified' },
      { id: 's5', text: 'Fire extinguishers available' },
      { id: 's6', text: 'Site amenities available' },
      { id: 's7', text: 'Electrical leads safe' },
      { id: 's8', text: 'Work area clean and tidy' },
      { id: 's9', text: 'Weather conditions suitable' },
      { id: 's10', text: 'All workers inducted' },
    ],
    crane: [
      { id: 'c1', text: 'Visual inspection completed' },
      { id: 'c2', text: 'Safety devices operational' },
      { id: 'c3', text: 'Load chart available' },
      { id: 'c4', text: 'Wire ropes in good condition' },
      { id: 'c5', text: 'Hooks and latches functioning' },
    ],
    forklift: [
      { id: 'f1', text: 'Pre-operational walk around done' },
      { id: 'f2', text: 'Tyres in good condition' },
      { id: 'f3', text: 'Forks not bent or cracked' },
      { id: 'f4', text: 'Brakes functioning' },
      { id: 'f5', text: 'Horn and lights working' },
    ],
    vehicle: [
      { id: 'v1', text: 'Lights and indicators working' },
      { id: 'v2', text: 'Tyres in good condition' },
      { id: 'v3', text: 'Brakes functioning' },
      { id: 'v4', text: 'Windscreen clear' },
      { id: 'v5', text: 'First aid kit present' },
    ],
    welding: [
      { id: 'w1', text: 'Welding leads inspected' },
      { id: 'w2', text: 'Earth clamp secure' },
      { id: 'w3', text: 'Gas bottles secured' },
      { id: 'w4', text: 'Fire extinguisher nearby' },
      { id: 'w5', text: 'PPE available' },
    ],
    scaffold: [
      { id: 'sc1', text: 'Scaffold tag current' },
      { id: 'sc2', text: 'Base plates in place' },
      { id: 'sc3', text: 'Guardrails in place' },
      { id: 'sc4', text: 'Safe access provided' },
      { id: 'sc5', text: 'No overloading' },
    ],
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

  // Validation for Pre-Start form - WHS compliance required fields
  const [validationErrors, setValidationErrors] = useState([]);

  const validateForm = () => {
    const errors = [];
    const signedCount = Object.values(signatures).filter(s => s !== null).length;

    // Required fields for WHS compliance
    if (!siteConducted) errors.push('Site/Location is required');
    if (!supervisorName) errors.push('Supervisor name is required');
    if (siteHazards.value === '' && siteHazards.notes.length === 0) errors.push('Site hazards must be identified');
    if (highRiskWorks === null) errors.push('High-risk works question must be answered');
    if (worksCoveredBySWMS === null) errors.push('SWMS coverage question must be answered');
    if (highRiskWorks === 'yes' && worksCoveredBySWMS !== 'yes') errors.push('High-risk works require SWMS coverage');
    if (isPlantEquipmentUsed === null) errors.push('Plant/equipment question must be answered');
    if (signedCount === 0) errors.push('At least one worker must sign on');

    // Checklist completion check
    const items = checklistItems[checkType] || [];
    const completedItems = Object.keys(checks).length;
    if (completedItems < items.length) errors.push(`All ${items.length} checklist items must be completed (${completedItems} done)`);

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
    setSignatures({ 'Jeff Fu': null, 'Scott Seeho': null, 'Davide Casolini': null, 'Zonggang Jiang': null, 'Leon Yu': null, 'Wang Jia': null, 'Gen Bao': null });
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
    setSignatures({ 'Jeff Fu': null, 'Scott Seeho': null, 'Davide Casolini': null, 'Zonggang Jiang': null, 'Leon Yu': null, 'Wang Jia': null, 'Gen Bao': null }); // Clear all signatures

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
              <option value="Jeff Fu">Jeff Fu</option>
              <option value="Scott Seeho">Scott Seeho</option>
              <option value="Davide Casolini">Davide Casolini</option>
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
        <button onClick={() => setStep(1)} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">Submit Another</button>
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
  const [signatures, setSignatures] = useState({ 'Jeff Fu': null, 'Scott Seeho': null, 'Davide Casolini': null, 'Zonggang Jiang': null, 'Leon Yu': null, 'Wang Jia': null, 'Gen Bao': null });
  const [validationErrors, setValidationErrors] = useState([]);

  const todayDate = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const teamMembers = ['Jeff Fu', 'Scott Seeho', 'Davide Casolini', 'Zonggang Jiang', 'Leon Yu', 'Wang Jia', 'Gen Bao'];
  const preparers = ['Jeff Fu', 'Scott Seeho', 'Davide Casolini'];
  const builders = ['Fdc Fitout and Refurbishment', 'Fdc Construction', 'Hunter Mason', 'Built', 'Lendlease'];
  const defaultSites = ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney', 'Site 4 - Chatswood', 'Site 5 - Liverpool'];
  const sitesList = (sites.length > 0 ? sites : defaultSites).filter(s => typeof s === 'string');

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
    setSignatures({ 'Jeff Fu': null, 'Scott Seeho': null, 'Davide Casolini': null, 'Zonggang Jiang': null, 'Leon Yu': null, 'Wang Jia': null, 'Gen Bao': null });
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
  const preparers = ['Jeff Fu', 'Scott Seeho', 'Davide Casolini'];
  const inspectors = ['Scott Seeho', 'Davide Casolini'];
  const defaultSites = ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney', 'Site 4 - Chatswood', 'Site 5 - Liverpool'];
  const sitesList = (sites.length > 0 ? sites : defaultSites).filter(s => typeof s === 'string');

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
function ITPFormView({ onSubmit, sites = [] }) {
  const [page, setPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [signingPerson, setSigningPerson] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Page 1 - Title Page
  const [siteConducted, setSiteConducted] = useState('');
  const [conductedOn, setConductedOn] = useState(new Date().toISOString().slice(0, 16));
  const [preparedBy, setPreparedBy] = useState('');
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Page 2 - Inspection Items
  const [preConstructionMeeting, setPreConstructionMeeting] = useState('');
  const [highRiskWorkshop, setHighRiskWorkshop] = useState(null);
  const [shopdrawingsApproved, setShopdrawingsApproved] = useState(null);
  const [allItemsSignedOff, setAllItemsSignedOff] = useState(null);

  // Procurement section
  const [shopdrawingRevision, setShopdrawingRevision] = useState('');
  const [orderedGlassFrom, setOrderedGlassFrom] = useState('');
  const [glassSpecification, setGlassSpecification] = useState('');

  // Installation of Glass section
  const [glassFreeFromDamage, setGlassFreeFromDamage] = useState(null);
  const [specificationOfFixings, setSpecificationOfFixings] = useState('');
  const [setoutCompletedBy, setSetoutCompletedBy] = useState('');
  const [installationMethod, setInstallationMethod] = useState('');
  const [glassInstalledCorrectRL, setGlassInstalledCorrectRL] = useState(null);
  const [glassLockedWedgedGlued, setGlassLockedWedgedGlued] = useState(null);
  const [removeWedgesCaulk, setRemoveWedgesCaulk] = useState('');

  // Installation of Handrails section
  const [handrailSpecConfirmed, setHandrailSpecConfirmed] = useState(null);
  const [spigotsCouplingsTight, setSpigotsCouplingsTight] = useState(null);
  const [handrailCompliantHeight, setHandrailCompliantHeight] = useState(null);
  const [threadOnFixings, setThreadOnFixings] = useState(null);
  const [fullWeldingJunctions, setFullWeldingJunctions] = useState(null);

  // Handover section
  const [allGlassNoDefects, setAllGlassNoDefects] = useState(null);
  const [allHandrailNoDefects, setAllHandrailNoDefects] = useState(null);
  const [balustradeAsPerDesign, setBalustradeAsPerDesign] = useState(null);

  // Page 3 - Sign off
  const [builderSignoffName, setBuilderSignoffName] = useState('');
  const [builderSignature, setBuilderSignature] = useState(null);
  const [futureCorrespondence, setFutureCorrespondence] = useState('');

  const todayDate = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const preparers = ['Jeff Fu', 'Scott Seeho', 'Davide Casolini'];
  const defaultSites = ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney'];
  const sitesList = (sites.length > 0 ? sites : defaultSites).filter(s => typeof s === 'string');

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

  // Yes/No/NA Button Component
  const YesNoNAButtons = ({ value, onChange, label }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-gray-700 mb-3 font-medium">{label}</p>
      <div className="flex gap-2">
        <button onClick={() => onChange('yes')}
          className={`flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`}>
          Yes
        </button>
        <button onClick={() => onChange('no')}
          className={`flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`}>
          No
        </button>
        <button onClick={() => onChange('na')}
          className={`flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`}>
          N/A
        </button>
      </div>
    </div>
  );

  // Text Input Box Component
  const TextInputBox = ({ value, onChange, label, placeholder }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-gray-700 mb-2 font-medium">{label}</p>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm" placeholder={placeholder || "Tap to edit"} />
    </div>
  );

  // Section Header Component
  const SectionHeader = ({ title, progress }) => (
    <div className="bg-indigo-400 rounded-xl p-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-white">▼</span>
        <span className="text-white font-medium">{title}</span>
      </div>
      {progress && <span className="text-white text-sm">{progress}</span>}
    </div>
  );

  const handleSubmit = () => {
    const errors = window.formValidator.validateITP({
      siteConducted, preparedBy, builderSignoffName, builderSignature
    });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    onSubmit({
      siteConducted, conductedOn, preparedBy, location,
      preConstructionMeeting, highRiskWorkshop, shopdrawingsApproved, allItemsSignedOff,
      shopdrawingRevision, orderedGlassFrom, glassSpecification,
      glassFreeFromDamage, specificationOfFixings, setoutCompletedBy, installationMethod,
      glassInstalledCorrectRL, glassLockedWedgedGlued, removeWedgesCaulk,
      handrailSpecConfirmed, spigotsCouplingsTight, handrailCompliantHeight, threadOnFixings, fullWeldingJunctions,
      allGlassNoDefects, allHandrailNoDefects, balustradeAsPerDesign,
      builderSignoffName, builderSignature, futureCorrespondence,
      date: new Date().toISOString()
    });
    setSubmitted(true);
  };

  const resetForm = () => {
    setPage(1); setSubmitted(false);
    setSiteConducted(''); setConductedOn(new Date().toISOString().slice(0, 16)); setPreparedBy(''); setLocation('');
    setPreConstructionMeeting(''); setHighRiskWorkshop(null); setShopdrawingsApproved(null); setAllItemsSignedOff(null);
    setShopdrawingRevision(''); setOrderedGlassFrom(''); setGlassSpecification('');
    setGlassFreeFromDamage(null); setSpecificationOfFixings(''); setSetoutCompletedBy(''); setInstallationMethod('');
    setGlassInstalledCorrectRL(null); setGlassLockedWedgedGlued(null); setRemoveWedgesCaulk('');
    setHandrailSpecConfirmed(null); setSpigotsCouplingsTight(null); setHandrailCompliantHeight(null);
    setThreadOnFixings(null); setFullWeldingJunctions(null);
    setAllGlassNoDefects(null); setAllHandrailNoDefects(null); setBalustradeAsPerDesign(null);
    setBuilderSignoffName(''); setBuilderSignature(null); setFutureCorrespondence('');
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ITP Form Complete!</h2>
        <p className="text-gray-600 mb-6">Inspection Test Plan has been recorded.</p>
        <button onClick={resetForm} className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold">Start New ITP</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signingPerson && <SignaturePad name={signingPerson} onSave={(data) => { setBuilderSignature(data); setSigningPerson(null); }} onCancel={() => setSigningPerson(null)} />}

      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📝 ITP Form</h2>
            <p className="text-gray-500 text-sm">Page {page}/3</p>
          </div>
        </div>
      </div>

      {/* Page 1 - Title Page */}
      {page === 1 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
            <p className="font-bold text-lg">Title Page</p>
            <p className="text-indigo-200 text-sm">Page 1/3</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">* Site Conducted</label>
              <select value={siteConducted} onChange={(e) => setSiteConducted(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-indigo-100 text-indigo-800 font-medium">
                <option value="">Select Site</option>
                {sitesList.map((site) => <option key={site} value={site}>{site}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conducted on</label>
              <input type="datetime-local" value={conductedOn} onChange={(e) => setConductedOn(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prepared by</label>
              <select value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white">
                <option value="">Select Preparer</option>
                {preparers.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="flex gap-2">
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg p-3" placeholder="Enter location" />
                <button onClick={getLocation} disabled={isLocating}
                  className="bg-indigo-500 text-white px-4 rounded-lg disabled:bg-indigo-300">
                  {isLocating ? '...' : '📍'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setPage(2)} disabled={!siteConducted || !preparedBy}
              className="bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-300">
              Next → Page 2/3
            </button>
          </div>
        </div>
      )}

      {/* Page 2 - ITP Form */}
      {page === 2 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
            <p className="font-bold text-lg">ITP Form</p>
            <p className="text-indigo-200 text-sm">Page 2/3</p>
          </div>

          <TextInputBox label="* Pre-Construction Meeting completed with Builder : NAME" value={preConstructionMeeting} onChange={setPreConstructionMeeting} placeholder="Tap to edit" />

          <YesNoNAButtons label="High Risk Workshop Completed: (If Applicable)" value={highRiskWorkshop} onChange={setHighRiskWorkshop} />

          <YesNoNAButtons label="Shopdrawings Submitted to Builder and approved by Engineer" value={shopdrawingsApproved} onChange={setShopdrawingsApproved} />

          <YesNoNAButtons label="All Items Above completed and Signed off" value={allItemsSignedOff} onChange={setAllItemsSignedOff} />

          {/* Procurement Section */}
          <SectionHeader title="Procurement" />

          <TextInputBox label="Shopdrawing Revision for Glass Order" value={shopdrawingRevision} onChange={setShopdrawingRevision} />
          <TextInputBox label="Ordered Glass from (Company Name)" value={orderedGlassFrom} onChange={setOrderedGlassFrom} />
          <TextInputBox label="Glass Specification" value={glassSpecification} onChange={setGlassSpecification} />

          {/* Installation of Glass Section */}
          <SectionHeader title="Installation of Glass" progress="0/1 (0%)" />

          <YesNoNAButtons label="Glass free from damages and defects on edges" value={glassFreeFromDamage} onChange={setGlassFreeFromDamage} />
          <TextInputBox label="Specification of Fixings - Grout / Hilti HY270" value={specificationOfFixings} onChange={setSpecificationOfFixings} />
          <TextInputBox label="Setout completed by - Surveyor or J&M Artsteel - Name/Company" value={setoutCompletedBy} onChange={setSetoutCompletedBy} />
          <TextInputBox label="Installation method - Plant Required" value={installationMethod} onChange={setInstallationMethod} />
          <YesNoNAButtons label="Glass Installed with correct RL from builder and 1m from FFL Minimum" value={glassInstalledCorrectRL} onChange={setGlassInstalledCorrectRL} />
          <YesNoNAButtons label="All Glass Locked off, wedged and Glued for 24 hours minimum" value={glassLockedWedgedGlued} onChange={setGlassLockedWedgedGlued} />
          <TextInputBox label="Remove Wedges and Caulk gap if required" value={removeWedgesCaulk} onChange={setRemoveWedgesCaulk} />

          {/* Installation of Handrails Section */}
          <SectionHeader title="Installation of Handrails" progress="0/2 (0%)" />

          <YesNoNAButtons label="Handrail Specification Confirmed and Shopdrawing Approved" value={handrailSpecConfirmed} onChange={setHandrailSpecConfirmed} />
          <YesNoNAButtons label="Install all spigots and threaded couplings hand tight for alignment" value={spigotsCouplingsTight} onChange={setSpigotsCouplingsTight} />
          <YesNoNAButtons label="Installation of handrail to compliant height as per shopdrawing and Architectural details" value={handrailCompliantHeight} onChange={setHandrailCompliantHeight} />
          <YesNoNAButtons label="Thread on all fixings / brackets, tack all tube together" value={threadOnFixings} onChange={setThreadOnFixings} />
          <YesNoNAButtons label="Full welding of all junctions of spigots, handrail joints and all coupling pieces tensioned" value={fullWeldingJunctions} onChange={setFullWeldingJunctions} />

          {/* Handover and Finalisation Section */}
          <SectionHeader title="Handover and Finalisation of install" progress="0/1 (0%)" />

          <YesNoNAButtons label="All glass installed to satisfactory finish with no defects or damages" value={allGlassNoDefects} onChange={setAllGlassNoDefects} />
          <YesNoNAButtons label="All Handrail installed to satisfactory finish with no defects or damages - All joints welded and polished" value={allHandrailNoDefects} onChange={setAllHandrailNoDefects} />
          <YesNoNAButtons label="Balustrade system is installed as per design intent with correct RL heights" value={balustradeAsPerDesign} onChange={setBalustradeAsPerDesign} />

          <div className="flex justify-between">
            <button onClick={() => setPage(1)} className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium">
              ← Back Page 1/3
            </button>
            <button onClick={() => setPage(3)} className="bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium">
              Next → Page 3/3
            </button>
          </div>
        </div>
      )}

      {/* Page 3 - Sign off Page */}
      {page === 3 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
            <p className="font-bold text-lg">Sign off Page</p>
            <p className="text-indigo-200 text-sm">Page 3/3</p>
          </div>

          {/* Builder Signoff */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <p className="text-gray-700 font-medium">Builder Signoff - Name / Signature</p>
            <input type="text" value={builderSignoffName} onChange={(e) => setBuilderSignoffName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3" placeholder="Full name" />
            {builderSignoffName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Signature</label>
                {builderSignature ? (
                  <div className="relative inline-block">
                    <div className="border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40">
                      <img src={builderSignature} alt="builder signature" className="h-full w-full object-contain" />
                    </div>
                    <button onClick={() => setBuilderSignature(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setSigningPerson(builderSignoffName)}
                    className="h-20 w-40 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-500 hover:border-indigo-500 flex items-center justify-center">
                    ✍️ Tap to sign
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comments and Notes Section */}
          <SectionHeader title="Comments and Notes" />

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-700 mb-2 font-medium">Items for Future correspondence or arisen issues during constructions</p>
            <textarea value={futureCorrespondence} onChange={(e) => setFutureCorrespondence(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[100px]" placeholder="Tap to edit" />
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-semibold mb-2">Please fix the following:</p>
              {validationErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setPage(2)} className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium">
              ← Back Page 2/3
            </button>
            <button onClick={handleSubmit}
              className="bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium">
              Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Steel Inspection Test Plan View
function SteelITPView({ onSubmit, sites = [] }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [managerSignature, setManagerSignature] = useState(null);
  const [builderSignature, setBuilderSignature] = useState(null);
  const [signingManager, setSigningManager] = useState(false);
  const [signingBuilder, setSigningBuilder] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Form state
  const [siteConducted, setSiteConducted] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [location, setLocation] = useState('');
  const [jobStructure, setJobStructure] = useState('');

  // Items section
  const [preConstMeeting, setPreConstMeeting] = useState('');
  const [highRiskWorkshop, setHighRiskWorkshop] = useState('');
  const [shopdrawingsApproved, setShopdrawingsApproved] = useState('');
  const [allItemsSignedOff, setAllItemsSignedOff] = useState('');

  // Fabrication section
  const [materialsOrdered, setMaterialsOrdered] = useState('');
  const [materialsCorrect, setMaterialsCorrect] = useState('');
  const [visualCheck, setVisualCheck] = useState('');
  const [shopdrawingsCurrent, setShopdrawingsCurrent] = useState('');
  const [setoutCorrect, setSetoutCorrect] = useState('');
  const [tackWeld, setTackWeld] = useState('');
  const [fullyWelded, setFullyWelded] = useState('');
  const [packLoad, setPackLoad] = useState('');

  // Specialised finishes
  const [finishConfirmed, setFinishConfirmed] = useState('');
  const [deliveryBooked, setDeliveryBooked] = useState('');
  const [sentToPainter, setSentToPainter] = useState('');
  const [deliveryVehicle, setDeliveryVehicle] = useState('');
  const [afterDeliveryFinish, setAfterDeliveryFinish] = useState('');

  // Site setout
  const [drawingsConfirmed, setDrawingsConfirmed] = useState('');
  const [surveyorMeasurements, setSurveyorMeasurements] = useState('');
  const [surveyorName, setSurveyorName] = useState('');
  const [clashesDetected, setClashesDetected] = useState('');

  // Site installation
  const [chemicalAnchors, setChemicalAnchors] = useState('');
  const [anchorsInstalled, setAnchorsInstalled] = useState('');
  const [levelPlumb, setLevelPlumb] = useState('');
  const [boltsTorqued, setBoltsTorqued] = useState('');
  const [weldingCompleted, setWeldingCompleted] = useState('');

  // Grouting
  const [groutingCompleted, setGroutingCompleted] = useState('');

  // Final inspection
  const [itemsChecked, setItemsChecked] = useState('');
  const [finishAcceptable, setFinishAcceptable] = useState('');
  const [fixingsTorqued, setFixingsTorqued] = useState('');

  // NDT
  const [weldTestingBooked, setWeldTestingBooked] = useState('');
  const [testingIssues, setTestingIssues] = useState('');
  const [weldsPassed, setWeldsPassed] = useState('');

  // Handover
  const [colourConfirmed, setColourConfirmed] = useState('');
  const [defectsChecked, setDefectsChecked] = useState('');
  const [handoverAccepted, setHandoverAccepted] = useState('');

  // Manager info
  const [managerName, setManagerName] = useState('');
  const [builderName, setBuilderName] = useState('');

  const todayDate = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const defaultSites = ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney'];
  const sitesList = (sites.length > 0 ? sites : defaultSites).filter(s => typeof s === 'string');

  const SelectField = ({ label, value, onChange }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        {['Yes', 'No', 'N/A'].map(opt => (
          <button key={opt} onClick={() => onChange(opt)} className={`flex-1 p-2 rounded-lg border text-sm font-medium ${value === opt ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = () => {
    const errors = window.formValidator.validateSteelITP({
      siteConducted, preparedBy, managerName, managerSignature
    });
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const data = {
      siteConducted, preparedBy, location, jobStructure,
      preConstMeeting, highRiskWorkshop, shopdrawingsApproved, allItemsSignedOff,
      materialsOrdered, materialsCorrect, visualCheck, shopdrawingsCurrent,
      setoutCorrect, tackWeld, fullyWelded, packLoad,
      finishConfirmed, deliveryBooked, sentToPainter, deliveryVehicle, afterDeliveryFinish,
      drawingsConfirmed, surveyorMeasurements, surveyorName, clashesDetected,
      chemicalAnchors, anchorsInstalled, levelPlumb, boltsTorqued, weldingCompleted,
      groutingCompleted, itemsChecked, finishAcceptable, fixingsTorqued,
      weldTestingBooked, testingIssues, weldsPassed,
      colourConfirmed, defectsChecked, handoverAccepted,
      managerName, managerSignature, builderName, builderSignature,
      submittedAt: new Date().toISOString()
    };
    onSubmit(data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="bg-green-500 text-white p-6 rounded-xl text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold">Steel ITP Submitted!</h2>
        </div>
        <button onClick={() => { setSubmitted(false); setStep(1); }} className="w-full bg-orange-600 text-white p-4 rounded-xl font-semibold">
          Start New Steel ITP
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signingManager && <SignaturePad name={managerName} onSave={(sig) => { setManagerSignature(sig); setSigningManager(false); }} onCancel={() => setSigningManager(false)} />}
      {signingBuilder && <SignaturePad name={builderName} onSave={(sig) => { setBuilderSignature(sig); setSigningBuilder(false); }} onCancel={() => setSigningBuilder(false)} />}

      <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4 rounded-xl">
        <h2 className="text-xl font-bold">🔩 Steel Inspection Test Plan</h2>
        <p className="text-sm opacity-90 mt-1">J&M ArtSteel</p>
        <p className="text-xs mt-2">{todayDate}</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {[1,2,3,4,5,6,7,8].map(s => (
          <div key={s} className={`flex-1 h-2 rounded ${step >= s ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
        ))}
      </div>
      <p className="text-xs text-gray-500 text-center">Step {step} of 8</p>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Basic Information</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Conducted *</label>
            <select value={siteConducted} onChange={e => setSiteConducted(e.target.value)} className="w-full p-3 border rounded-lg">
              <option value="">Select site</option>
              {sitesList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prepared By</label>
            <select value={preparedBy} onChange={e => setPreparedBy(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
              <option value="">Select person</option>
              <option value="Jeff Fu">Jeff Fu</option>
              <option value="Scott Seeho">Scott Seeho</option>
              <option value="Davide Casolini">Davide Casolini</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Enter location" className="w-full p-3 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job / Structure ITP carried out on</label>
            <input type="text" value={jobStructure} onChange={e => setJobStructure(e.target.value)} placeholder="Enter job details" className="w-full p-3 border rounded-lg" />
          </div>
        </div>
      )}

      {/* Step 2: Pre-Construction Items */}
      {step === 2 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Items</h3>
          <SelectField label="Pre-Construction Meeting Completed with Builder" value={preConstMeeting} onChange={setPreConstMeeting} />
          <SelectField label="Structural Steel High Risk Workshop Completed" value={highRiskWorkshop} onChange={setHighRiskWorkshop} />
          <SelectField label="Shopdrawings Submitted and Approved by Engineer" value={shopdrawingsApproved} onChange={setShopdrawingsApproved} />
          <SelectField label="All Above items completed and Signed off" value={allItemsSignedOff} onChange={setAllItemsSignedOff} />
        </div>
      )}

      {/* Step 3: Fabrication */}
      {step === 3 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Fabrication</h3>
          <SelectField label="Materials Ordered as Per shopdrawings" value={materialsOrdered} onChange={setMaterialsOrdered} />
          <SelectField label="Materials on delivery are correct" value={materialsCorrect} onChange={setMaterialsCorrect} />
          <SelectField label="Visual Check Materials in good condition" value={visualCheck} onChange={setVisualCheck} />
          <SelectField label="Shopdrawings are current revision" value={shopdrawingsCurrent} onChange={setShopdrawingsCurrent} />
          <SelectField label="Setout cleats, plates, members correct" value={setoutCorrect} onChange={setSetoutCorrect} />
          <SelectField label="Tack weld, check straight and plumb" value={tackWeld} onChange={setTackWeld} />
          <SelectField label="Fully weld as per engineer specifications" value={fullyWelded} onChange={setFullyWelded} />
          <SelectField label="Pack and load materials for transport" value={packLoad} onChange={setPackLoad} />
        </div>
      )}

      {/* Step 4: Specialised Finishes */}
      {step === 4 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Specialised Finishes</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm finish of steel and approved</label>
            <input type="text" value={finishConfirmed} onChange={e => setFinishConfirmed(e.target.value)} placeholder="Enter finish type" className="w-full p-3 border rounded-lg" />
          </div>
          <SelectField label="Book delivery to site/workshop" value={deliveryBooked} onChange={setDeliveryBooked} />
          <SelectField label="Send material to painter/abrasive blaster" value={sentToPainter} onChange={setSentToPainter} />
          <SelectField label="Correct Delivery vehicle and sizes confirmed" value={deliveryVehicle} onChange={setDeliveryVehicle} />
          <SelectField label="After delivery finish is acceptable" value={afterDeliveryFinish} onChange={setAfterDeliveryFinish} />
        </div>
      )}

      {/* Step 5: Site Setout & Installation */}
      {step === 5 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Site Setout & Installation</h3>
          <SelectField label="Confirm correct drawings with builder" value={drawingsConfirmed} onChange={setDrawingsConfirmed} />
          <SelectField label="Surveyor has correct measurements" value={surveyorMeasurements} onChange={setSurveyorMeasurements} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Surveyor Name</label>
            <input type="text" value={surveyorName} onChange={e => setSurveyorName(e.target.value)} placeholder="Enter surveyor name" className="w-full p-3 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clashes detected / issues</label>
            <textarea value={clashesDetected} onChange={e => setClashesDetected(e.target.value)} placeholder="Describe any issues" className="w-full p-3 border rounded-lg" rows={3}></textarea>
          </div>
          <SelectField label="Chemical anchors correct as per specs" value={chemicalAnchors} onChange={setChemicalAnchors} />
          <SelectField label="Anchors installed correctly" value={anchorsInstalled} onChange={setAnchorsInstalled} />
          <SelectField label="Steel checked for level and plumbness" value={levelPlumb} onChange={setLevelPlumb} />
          <SelectField label="Bolts and nuts tightened/torqued" value={boltsTorqued} onChange={setBoltsTorqued} />
          <SelectField label="Welding completed to engineering specs" value={weldingCompleted} onChange={setWeldingCompleted} />
        </div>
      )}

      {/* Step 6: Grouting & Final Inspection */}
      {step === 6 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Grouting & Final Inspection</h3>
          <SelectField label="Grouting completed to all steel members" value={groutingCompleted} onChange={setGroutingCompleted} />
          <SelectField label="All installed items checked as per drawings" value={itemsChecked} onChange={setItemsChecked} />
          <SelectField label="Finish in good condition (touch ups done)" value={finishAcceptable} onChange={setFinishAcceptable} />
          <SelectField label="All fixings torqued at correct lengths" value={fixingsTorqued} onChange={setFixingsTorqued} />
        </div>
      )}

      {/* Step 7: NDT & Handover */}
      {step === 7 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">NDT & Handover</h3>
          <SelectField label="Weld Testing booked and confirmed" value={weldTestingBooked} onChange={setWeldTestingBooked} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Any issues with Testing?</label>
            <textarea value={testingIssues} onChange={e => setTestingIssues(e.target.value)} placeholder="Describe issues" className="w-full p-3 border rounded-lg" rows={2}></textarea>
          </div>
          <SelectField label="All welds tested have passed compliance" value={weldsPassed} onChange={setWeldsPassed} />
          <SelectField label="Colour/finish confirmed by builder" value={colourConfirmed} onChange={setColourConfirmed} />
          <SelectField label="Builder checked for defects" value={defectsChecked} onChange={setDefectsChecked} />
          <SelectField label="Builder accepted handover (defect free)" value={handoverAccepted} onChange={setHandoverAccepted} />
        </div>
      )}

      {/* Step 8: Sign-offs */}
      {step === 8 && (
        <div className="bg-white rounded-xl p-4 space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Sign-offs</h3>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-3">Manager Completing ITP</h4>
            <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="Manager name" className="w-full p-3 border rounded-lg mb-3" />
            {managerSignature ? (
              <div className="border rounded-lg p-2 bg-white">
                <p className="text-xs text-gray-500 mb-1">Signature:</p>
                <img src={managerSignature} alt="Manager signature" className="h-16" />
              </div>
            ) : (
              <button onClick={() => setSigningManager(true)} disabled={!managerName} className={`w-full p-3 rounded-lg font-semibold ${managerName ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                ✍️ Sign
              </button>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-3">Builder Signoff</h4>
            <input type="text" value={builderName} onChange={e => setBuilderName(e.target.value)} placeholder="Builder name" className="w-full p-3 border rounded-lg mb-3" />
            {builderSignature ? (
              <div className="border rounded-lg p-2 bg-white">
                <p className="text-xs text-gray-500 mb-1">Signature:</p>
                <img src={builderSignature} alt="Builder signature" className="h-16" />
              </div>
            ) : (
              <button onClick={() => setSigningBuilder(true)} disabled={!builderName} className={`w-full p-3 rounded-lg font-semibold ${builderName ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                ✍️ Sign
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 font-semibold mb-2">Please fix the following:</p>
          {validationErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}
        </div>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 bg-gray-200 p-4 rounded-xl font-semibold">
            ← Previous
          </button>
        )}
        {step < 8 ? (
          <button onClick={() => setStep(step + 1)} className="flex-1 bg-orange-600 text-white p-4 rounded-xl font-semibold">
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!managerSignature} className={`flex-1 p-4 rounded-xl font-semibold ${managerSignature ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
            Submit Steel ITP ✓
          </button>
        )}
      </div>
    </div>
  );
}

// Emergency View

// Export to window for cross-file access
window.PrestartView = PrestartView;
window.IncidentView = IncidentView;
window.ToolboxView = ToolboxView;
window.SubcontractorInspectionView = SubcontractorInspectionView;
window.ITPFormView = ITPFormView;
window.SteelITPView = SteelITPView;
