// SteelITPView Component
// Extracted from forms.jsx

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
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');

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
window.SteelITPView = SteelITPView;
