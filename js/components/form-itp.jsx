// ITPFormView Component
// Extracted from forms.jsx

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
  const preparers = FORM_CONSTANTS.supervisors;
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');

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
window.ITPFormView = ITPFormView;
