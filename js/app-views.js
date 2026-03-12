"use strict";

// === js/components/training.jsx ===
// TrainingView Component
// Uses TRAINING_COURSES from trainingCourseData.js
// Uses TrainingCertGenerator from trainingCertGenerator.js

/**
 * WHS training module with bilingual (EN/CN) quiz courses, progress tracking, certificate generation, and Australian Standards references.
 * No props required. Reads course data from TRAINING_COURSES and generates certificates via TrainingCertGenerator.
 */
function TrainingView() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [viewingStandards, setViewingStandards] = useState(null);
  const [completedCourses, setCompletedCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED_TRAINING);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Could not parse completed training:', e);
      return [];
    }
  });

  // Course data from external file
  const courses = TRAINING_COURSES;
  const handleAnswer = (questionIndex, answerIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: answerIndex
    });
  };
  const calculateScore = () => {
    if (!selectedCourse) return 0;
    let correct = 0;
    selectedCourse.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    return Math.round(correct / selectedCourse.questions.length * 100);
  };
  const completeCourse = () => {
    const score = calculateScore();
    if (score >= 80) {
      const newCompleted = [...completedCourses, {
        courseId: selectedCourse.id,
        completedAt: new Date().toISOString(),
        score: score
      }];
      setCompletedCourses(newCompleted);
      try {
        localStorage.setItem(STORAGE_KEYS.COMPLETED_TRAINING, JSON.stringify(newCompleted));
      } catch (e) {
        console.warn('Could not save training completion:', e.message);
      }
    }
    setShowResults(true);
  };
  const resetCourse = () => {
    setSelectedCourse(null);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };
  const isCompleted = courseId => completedCourses.some(c => c.courseId === courseId);
  const generateCertificate = () => {
    TrainingCertGenerator.generate(workerName, selectedCourse, signatureData, calculateScore);
  };
  const getAppUrl = () => 'https://davidethepingpong.github.io/jmart-steel-safety-app/index.html';

  // Course List View
  if (!selectedCourse) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, showQRCode && /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "qr-modal-title",
      onClick: () => setShowQRCode(false)
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-6 max-w-sm text-center",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("h3", {
      id: "qr-modal-title",
      className: "font-bold text-lg mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDCF1"), " Share J&M Artsteel Safety App"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600 mb-4"
    }, "Workers can scan this QR code to install the Safety App on their phone"), /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-100 p-4 rounded-lg mb-4"
    }, /*#__PURE__*/React.createElement("img", {
      src: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(getAppUrl()),
      alt: "QR Code",
      className: "mx-auto"
    })), /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-50 p-3 rounded-lg text-xs break-all text-gray-600 mb-4"
    }, getAppUrl()), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        navigator.clipboard.writeText(getAppUrl());
        ToastNotifier.success('Link copied!');
      },
      className: "w-full bg-orange-600 text-white p-3 rounded-lg font-semibold mb-2"
    }, "\uD83D\uDCCB Copy Link"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowQRCode(false),
      "aria-label": "Close",
      className: "w-full bg-gray-200 p-3 rounded-lg font-semibold"
    }, "Close"))), viewingStandards && /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "standards-modal-title",
      onClick: () => setViewingStandards(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("h3", {
      id: "standards-modal-title",
      className: "font-bold text-lg mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDCCB"), " ", viewingStandards.title, " - Standards"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600 mb-4"
    }, "This training references the following Australian Standards:"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-3"
    }, viewingStandards.standards && viewingStandards.standards.map((s, i) => /*#__PURE__*/React.createElement("a", {
      key: i,
      href: s.url,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "block bg-blue-50 p-3 rounded-lg hover:bg-blue-100 transition-colors"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-medium text-blue-800 text-sm"
    }, s.code), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-blue-600 mt-1"
    }, "\uD83D\uDD17 View Standard \u2192")))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setViewingStandards(null),
      "aria-label": "Close",
      className: "w-full bg-gray-200 p-3 rounded-lg font-semibold mt-4"
    }, "Close"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDCDA"), " Training Courses"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm opacity-90 mt-1"
    }, "Complete courses to stay safe on site")), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowQRCode(true),
      className: "bg-white bg-opacity-20 p-2 rounded-lg hover:bg-opacity-30",
      "aria-label": "Share app with workers"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-2xl",
      "aria-hidden": "true"
    }, "\uD83D\uDCF1")))), /*#__PURE__*/React.createElement("div", {
      className: "grid gap-3"
    }, courses.map(course => /*#__PURE__*/React.createElement("div", {
      key: course.id,
      className: "bg-white p-4 rounded-xl shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-4xl"
    }, course.image), /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold text-gray-900"
    }, course.title), isCompleted(course.id) && /*#__PURE__*/React.createElement("span", {
      className: "text-green-500 text-lg"
    }, "\u2705")), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, course.description), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-400 mt-1"
    }, "\u23F1\uFE0F ", course.duration, " \u2022 ", course.questions.length, " questions"))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mt-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setSelectedCourse(course),
      className: "flex-1 bg-orange-600 text-white p-2 rounded-lg font-semibold text-sm"
    }, "Start Course \u25B6"), course.standards && /*#__PURE__*/React.createElement("button", {
      onClick: () => setViewingStandards(course),
      className: "bg-blue-100 text-blue-700 p-2 rounded-lg text-sm font-medium"
    }, "\uD83D\uDCCB Standards"))))), completedCourses.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-green-50 border border-green-200 p-4 rounded-xl mt-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold text-green-800"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83C\uDF89"), " Completed Training"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-green-600"
    }, completedCourses.length, " of ", courses.length, " courses completed")));
  }

  // Results View
  if (showResults) {
    const score = calculateScore();
    const passed = score >= 80;
    if (showSignature) {
      return /*#__PURE__*/React.createElement(SignaturePad, {
        name: workerName,
        onSave: sig => {
          setSignatureData(sig);
          setShowSignature(false);
          setShowCertificate(true);
        },
        onCancel: () => setShowSignature(false)
      });
    }
    if (showCertificate) {
      return /*#__PURE__*/React.createElement("div", {
        className: "space-y-4"
      }, /*#__PURE__*/React.createElement("div", {
        className: "bg-green-500 text-white p-6 rounded-xl text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-6xl mb-4"
      }, "\uD83C\uDF93"), /*#__PURE__*/React.createElement("h2", {
        className: "text-2xl font-bold"
      }, "Certificate Ready!"), /*#__PURE__*/React.createElement("p", {
        className: "mt-2"
      }, "Your training certificate has been prepared")), /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-xl p-4 space-y-4"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-center"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-4xl mb-2"
      }, selectedCourse.image), /*#__PURE__*/React.createElement("h3", {
        className: "font-bold text-lg"
      }, selectedCourse.title), /*#__PURE__*/React.createElement("p", {
        className: "text-green-600 font-semibold"
      }, "Score: ", score, "% \u2713")), /*#__PURE__*/React.createElement("div", {
        className: "border-t pt-4"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-600 mb-2"
      }, /*#__PURE__*/React.createElement("strong", null, "Worker:"), " ", workerName), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-600 mb-2"
      }, /*#__PURE__*/React.createElement("strong", null, "Date:"), " ", new Date().toLocaleDateString('en-AU')), signatureData && /*#__PURE__*/React.createElement("div", {
        className: "mt-3"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500 mb-1"
      }, "Signature:"), /*#__PURE__*/React.createElement("img", {
        src: signatureData,
        alt: "Signature",
        className: "h-12 border rounded"
      }))), selectedCourse.standards && /*#__PURE__*/React.createElement("div", {
        className: "bg-blue-50 p-3 rounded-lg"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs font-semibold text-blue-800 mb-2"
      }, "\uD83D\uDCCB Standards Referenced:"), selectedCourse.standards.map((s, i) => /*#__PURE__*/React.createElement("p", {
        key: i,
        className: "text-xs text-blue-700"
      }, "\u2022 ", s.code)))), /*#__PURE__*/React.createElement("button", {
        onClick: generateCertificate,
        className: "w-full bg-green-600 text-white p-4 rounded-xl font-semibold"
      }, "\uD83D\uDCE5 Download Certificate"), /*#__PURE__*/React.createElement("button", {
        onClick: resetCourse,
        className: "w-full bg-gray-200 text-gray-700 p-4 rounded-xl font-semibold"
      }, "Back to Courses"));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: `${passed ? 'bg-green-500' : 'bg-red-500'} text-white p-6 rounded-xl text-center`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-6xl mb-4"
    }, passed ? '🎉' : '📚'), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold"
    }, passed ? 'Congratulations!' : 'Keep Learning!'), /*#__PURE__*/React.createElement("p", {
      className: "text-4xl font-bold mt-2"
    }, score, "%"), /*#__PURE__*/React.createElement("p", {
      className: "mt-2"
    }, passed ? 'You passed the course!' : 'You need 80% to pass. Try again!')), passed && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 space-y-3"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold"
    }, "\uD83D\uDCDD Sign & Get Certificate"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, "Enter your name and sign to receive your training certificate."), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Enter your full name",
      value: workerName,
      onChange: e => setWorkerName(e.target.value),
      className: "w-full p-3 border rounded-lg"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowSignature(true),
      disabled: !workerName.trim(),
      className: `w-full p-3 rounded-lg font-semibold ${workerName.trim() ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`
    }, "\u270D\uFE0F Sign Certificate")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 space-y-3"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold"
    }, "Review Your Answers"), selectedCourse.questions.map((q, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `p-3 rounded-lg ${answers[i] === q.correct ? 'bg-green-50' : 'bg-red-50'}`
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-medium text-sm"
    }, q.question), /*#__PURE__*/React.createElement("p", {
      className: "text-xs mt-1"
    }, "Your answer: ", answers[i] !== undefined ? q.options[answers[i]] : /*#__PURE__*/React.createElement("span", {
      className: "italic text-gray-400"
    }, "Not answered")), answers[i] !== q.correct && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-green-700 mt-1"
    }, "Correct: ", q.options[q.correct]), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500 mt-1 italic"
    }, q.explanation)))), /*#__PURE__*/React.createElement("button", {
      onClick: resetCourse,
      className: "w-full bg-orange-600 text-white p-4 rounded-xl font-semibold"
    }, "Back to Courses"));
  }

  // Quiz View
  const question = selectedCourse.questions[currentQuestion];
  const progress = (currentQuestion + 1) / selectedCourse.questions.length * 100;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: resetCourse,
    "aria-label": "Exit course",
    className: "text-gray-500"
  }, "\u2715 Exit"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-500"
  }, currentQuestion + 1, " / ", selectedCourse.questions.length)), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-gray-200 rounded-full h-2",
    role: "progressbar",
    "aria-valuenow": Math.round(progress),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-label": "Quiz progress"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-500 h-2 rounded-full transition-all",
    style: {
      width: progress + '%'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl"
  }, selectedCourse.image), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg mt-2"
  }, selectedCourse.title)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-4 rounded-lg mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-900"
  }, question.question)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, question.options.map((option, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => handleAnswer(currentQuestion, i),
    "aria-pressed": answers[currentQuestion] === i,
    className: `w-full p-3 rounded-lg text-left transition-colors ${answers[currentQuestion] === i ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
  }, option)))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, currentQuestion > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentQuestion(currentQuestion - 1),
    className: "flex-1 bg-gray-200 p-4 rounded-xl font-semibold"
  }, "\u2190 Previous"), currentQuestion < selectedCourse.questions.length - 1 ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentQuestion(currentQuestion + 1),
    disabled: answers[currentQuestion] === undefined,
    className: `flex-1 p-4 rounded-xl font-semibold ${answers[currentQuestion] !== undefined ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "Next \u2192") : /*#__PURE__*/React.createElement("button", {
    onClick: completeCourse,
    disabled: answers[currentQuestion] === undefined,
    className: `flex-1 p-4 rounded-xl font-semibold ${answers[currentQuestion] !== undefined ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "Complete \u2713")));
}

// Error Boundary for debugging
class DebugErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error: error
    };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({
      errorInfo: errorInfo
    });
    console.error('ERROR BOUNDARY CAUGHT:', error.message, error.stack);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          background: '#fee',
          border: '2px solid red',
          margin: '10px',
          borderRadius: '8px'
        }
      }, React.createElement('h2', {
        style: {
          color: 'red'
        }
      }, 'Component Error'), React.createElement('pre', {
        style: {
          whiteSpace: 'pre-wrap',
          fontSize: '12px'
        }
      }, String(this.state.error)), React.createElement('pre', {
        style: {
          whiteSpace: 'pre-wrap',
          fontSize: '10px',
          marginTop: '10px'
        }
      }, this.state.errorInfo ? this.state.errorInfo.componentStack : 'no stack'));
    }
    return this.props.children;
  }
}

// Export to window for cross-file access
window.TrainingView = TrainingView;
window.DebugErrorBoundary = DebugErrorBoundary;

// === js/components/form-prestart.jsx ===
// PrestartView Component
// Extracted from forms.jsx

// Form views: Prestart, Incident, Toolbox, Inspection, ITP, SteelITP
// Extracted from index.html

const PRESTART_DEFAULTS = {
  type: null,
  checks: {},
  notes: '',
  supervisorName: '',
  siteConducted: '',
  builder: '',
  address: '',
  formDate: null,
  workAreas: {
    value: '',
    notes: [],
    media: []
  },
  tasksThisShift: {
    value: '',
    notes: [],
    media: []
  },
  machineryControls: {
    value: '',
    notes: [],
    media: []
  },
  siteHazards: {
    value: '',
    notes: [],
    media: []
  },
  permitsRequired: {
    value: '',
    notes: [],
    media: []
  },
  isPlantEquipmentUsed: null,
  highRiskWorks: null,
  worksCoveredBySWMS: null,
  hasSafetyIssues: null,
  safetyIssuesPreviousShift: {
    value: '',
    notes: [],
    media: []
  },
  translatorRequired: null,
  translatorSignature: null,
  translatorName: '',
  signatures: null
};

/**
 * Pre-Start Safety Checklist form with multi-page wizard (site details, work info, safety checks, checklist, team signatures).
 * @param {Object} props
 * @param {Function} props.onSubmit - Called with form data when creating a new form
 * @param {Function} props.onUpdate - Called with form data when updating an existing form
 * @param {Object|null} props.editingForm - Existing form data when editing, null when creating
 * @param {Array} [props.previousPrestarts=[]] - Previously submitted pre-start forms for reference
 * @param {Array} [props.sites=[]] - Available site names for the site selector
 */
function PrestartView({
  onSubmit,
  onUpdate,
  editingForm,
  previousPrestarts = [],
  sites = []
}) {
  const isEditing = !!editingForm;

  // UI-state useState calls (not form fields)
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [submitted, setSubmitted] = useState(false);
  const [signingWorker, setSigningWorker] = useState(null);
  const [showPreviousList, setShowPreviousList] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [signingTranslator, setSigningTranslator] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [draftBanner, setDraftBanner] = useState(null);

  // All form fields consolidated into useFormState
  const {
    fields,
    setField,
    setFields,
    resetFields
  } = useFormState(PRESTART_DEFAULTS, editingForm);

  // Auto-save drafts every 30 seconds (only for new forms, not edits)
  const {
    loadDraft,
    clearDraft
  } = useAutoSave(isEditing ? null : 'prestart', fields, 30000);

  // Inline validation — tracks which fields the user has touched (blurred)
  const [touchedFields, setTouchedFields] = useState({});
  const markTouched = fieldName => setTouchedFields(prev => ({
    ...prev,
    [fieldName]: true
  }));
  const fieldError = (fieldName, value) => touchedFields[fieldName] && !value ? 'Required' : null;

  // Check for saved draft on mount
  useEffect(() => {
    if (!isEditing) {
      var draft = loadDraft();
      if (draft) {
        setDraftBanner(draft);
      }
    }
  }, []);

  // Runtime defaults for fields that can't be static
  const formDate = fields.formDate ? fields.formDate instanceof Date ? fields.formDate : new Date(fields.formDate) : new Date();
  const signatures = fields.signatures || FORM_CONSTANTS.emptySignatures();
  const checkType = fields.type;

  // Helper to ensure media fields have proper structure
  const ensureMediaStructure = data => ({
    value: data?.value || '',
    notes: Array.isArray(data?.notes) ? data.notes : [],
    media: Array.isArray(data?.media) ? data.media : []
  });

  // Reset UI-only state when editingForm changes (useFormState handles field resets)
  useEffect(() => {
    setStep(editingForm ? 2 : 1);
    setSubmitted(false);
    setSigningWorker(null);
    setShowPreviousList(false);
    setIsLocating(false);
    setSigningTranslator(false);
    setValidationErrors([]);
    // Handle key mismatch: stored data uses 'date' but DEFAULTS uses 'formDate'
    if (editingForm?.data?.date) {
      setField('formDate', new Date(editingForm.data.date));
    }
  }, [editingForm?.id]);
  const displayDate = formDate.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const displayTime = formDate.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const builders = FORM_CONSTANTS.builders;
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');
  const teamMembers = FORM_CONSTANTS.teamMembers;
  const checklistTypes = FORM_CONSTANTS.checklistTypes;
  const checklistItems = FORM_CONSTANTS.checklistItems;
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setField('address', data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setField('address', `${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };

  // Validation for Pre-Start form - WHS compliance required fields
  const validateForm = () => {
    // Use centralized validator for WHS-compliant checks
    if (window.formValidator) {
      return window.formValidator.validatePrestart({
        supervisorName: fields.supervisorName,
        siteConducted: fields.siteConducted,
        builder: fields.builder,
        address: fields.address,
        highRiskWorks: fields.highRiskWorks,
        worksCoveredBySWMS: fields.worksCoveredBySWMS,
        isPlantEquipmentUsed: fields.isPlantEquipmentUsed,
        siteHazards: fields.siteHazards,
        signatures,
        checks: fields.checks,
        checkType,
        checklistItems
      });
    }
    // Fallback: basic inline validation if validator not loaded
    const errors = [];
    if (!fields.siteConducted) errors.push('Site/Location is required');
    if (!fields.supervisorName) errors.push('Supervisor name is required');
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
      type: checkType,
      checks: fields.checks,
      notes: fields.notes,
      signatures,
      supervisorName: fields.supervisorName,
      siteConducted: fields.siteConducted,
      builder: fields.builder,
      address: fields.address,
      workAreas: fields.workAreas,
      tasksThisShift: fields.tasksThisShift,
      machineryControls: fields.machineryControls,
      siteHazards: fields.siteHazards,
      permitsRequired: fields.permitsRequired,
      isPlantEquipmentUsed: fields.isPlantEquipmentUsed,
      highRiskWorks: fields.highRiskWorks,
      worksCoveredBySWMS: fields.worksCoveredBySWMS,
      hasSafetyIssues: fields.hasSafetyIssues,
      safetyIssuesPreviousShift: fields.safetyIssuesPreviousShift,
      translatorRequired: fields.translatorRequired,
      translatorSignature: fields.translatorSignature,
      translatorName: fields.translatorName,
      date: formDate.toISOString()
    };
    if (isEditing && onUpdate) {
      // When editing, the confirmation modal will handle the flow
      onUpdate(editingForm.id, 'prestart', formData);
      // Don't set submitted - the modal will handle navigation
    } else {
      clearDraft();
      onSubmit(formData);
      setSubmitted(true);
    }
  };
  const resetForm = () => {
    setStep(1);
    resetFields(null);
    setSubmitted(false);
    setSigningWorker(null);
    setSigningTranslator(false);
    setValidationErrors([]);
  };
  if (submitted) {
    const signedCount = Object.values(signatures).filter(s => s !== null).length;
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Pre-Start Updated!' : 'Pre-Start Complete!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-2"
    }, isEditing ? 'Your changes have been saved.' : 'Your checklist has been recorded.'), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-500 mb-6"
    }, signedCount, " worker(s) signed on"), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, isEditing ? 'Back to Dashboard' : 'Start Another Check'));
  }

  // Function to load data from a previous prestart
  const loadFromPrevious = previousForm => {
    const data = previousForm.data;

    // Set checklist type and copy site details + work context + checks
    setFields({
      type: data.type,
      supervisorName: data.supervisorName || '',
      siteConducted: data.siteConducted || '',
      builder: data.builder || '',
      address: data.address || '',
      workAreas: ensureMediaStructure(data.workAreas),
      tasksThisShift: ensureMediaStructure(data.tasksThisShift),
      machineryControls: ensureMediaStructure(data.machineryControls),
      siteHazards: ensureMediaStructure(data.siteHazards),
      permitsRequired: ensureMediaStructure(data.permitsRequired),
      isPlantEquipmentUsed: data.isPlantEquipmentUsed ?? null,
      highRiskWorks: data.highRiskWorks ?? null,
      worksCoveredBySWMS: data.worksCoveredBySWMS ?? null,
      checks: data.checks || {},
      // Reset fields that should be fresh for new form
      formDate: new Date(),
      hasSafetyIssues: null,
      safetyIssuesPreviousShift: {
        value: '',
        notes: [],
        media: []
      },
      notes: '',
      translatorRequired: null,
      translatorSignature: null,
      translatorName: '',
      signatures: FORM_CONSTANTS.emptySignatures()
    });

    // Close modal and go to step 2
    setShowPreviousList(false);
    setStep(2);
  };
  if (step === 1) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, draftBanner && /*#__PURE__*/React.createElement("div", {
      className: "bg-amber-50 border border-amber-200 rounded-xl p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-amber-600 text-xl",
      "aria-hidden": "true"
    }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-amber-800 font-semibold text-sm"
    }, "Unsaved Draft Found"), /*#__PURE__*/React.createElement("p", {
      className: "text-amber-600 text-xs"
    }, draftBanner.ageMinutes < 60 ? draftBanner.ageMinutes + ' minutes ago' : Math.round(draftBanner.ageMinutes / 60) + ' hours ago'))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setFields(draftBanner.data);
        setStep(2);
        setDraftBanner(null);
      },
      className: "px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold"
    }, "Restore"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        clearDraft();
        setDraftBanner(null);
      },
      className: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
    }, "Discard")))), showPreviousList && /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Load from Previous Pre-Start"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-4 border-b flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "text-lg font-bold text-gray-800"
    }, "Load from Previous"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowPreviousList(false),
      className: "text-gray-500 text-xl",
      "aria-label": "Close"
    }, "\u2715")), /*#__PURE__*/React.createElement("div", {
      className: "overflow-y-auto flex-1 p-4"
    }, previousPrestarts.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "text-center py-8 text-gray-500"
    }, /*#__PURE__*/React.createElement("p", null, "No previous prestarts found."), /*#__PURE__*/React.createElement("p", {
      className: "text-sm mt-2"
    }, "Complete a prestart first to use this feature.")) : /*#__PURE__*/React.createElement("div", {
      className: "space-y-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600 mb-3"
    }, "Select a previous prestart to copy. Signatures and date will be reset."), previousPrestarts.slice(0, 20).map(form => {
      const formDate = new Date(form.data.date || form.createdAt);
      const typeInfo = checklistTypes.find(t => t.id === form.data.type);
      return /*#__PURE__*/React.createElement("button", {
        key: form.id,
        onClick: () => loadFromPrevious(form),
        className: "w-full bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl p-4 text-left transition-colors"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: `w-10 h-10 ${typeInfo?.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-lg flex-shrink-0`
      }, typeInfo?.emoji || '📋'), /*#__PURE__*/React.createElement("div", {
        className: "flex-1 min-w-0"
      }, /*#__PURE__*/React.createElement("p", {
        className: "font-semibold text-gray-800 truncate"
      }, form.data.siteConducted || 'Unknown Site'), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-600 truncate"
      }, typeInfo?.label || 'Pre-Start', " \u2022 ", form.data.builder || 'No builder'), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-400 mt-1"
      }, formDate.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })))));
    }))))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-gray-800 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDCCB"), " Pre-Start Checklists"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 text-sm mt-1"
    }, "Select the type of pre-start check")), previousPrestarts.length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowPreviousList(true),
      className: "w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-2xl",
      "aria-hidden": "true"
    }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-semibold text-blue-700"
    }, "Copy from Previous Prestart"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-blue-600"
    }, "Same job, different day? Load previous details"))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-3"
    }, checklistTypes.map(type => /*#__PURE__*/React.createElement("button", {
      key: type.id,
      onClick: () => {
        setField('type', type.id);
        setStep(2);
      },
      className: "bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-3 hover:shadow-md"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-14 h-14 ${type.color} rounded-full flex items-center justify-center text-2xl`
    }, type.emoji), /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-gray-700 text-center"
    }, type.label)))));
  }
  const items = checklistItems[checkType] || [];
  const allChecked = items.every(item => fields.checks[item.id] !== undefined);
  const signedCount = Object.values(signatures).filter(s => s !== null).length;
  if (step === 2) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, signingWorker && /*#__PURE__*/React.createElement(SignaturePad, {
      name: signingWorker,
      onSave: data => {
        setField('signatures', {
          ...signatures,
          [signingWorker]: data
        });
        setSigningWorker(null);
      },
      onCancel: () => setSigningWorker(null)
    }), isEditing && /*#__PURE__*/React.createElement("div", {
      className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-blue-600 text-xl",
      "aria-hidden": "true"
    }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-blue-800 font-semibold"
    }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
      className: "text-blue-600 text-sm"
    }, "Modify this form and save your changes"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-lg"
    }, displayDate), /*#__PURE__*/React.createElement("span", {
      className: "text-sm opacity-80"
    }, "at ", displayTime)), isEditing && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mt-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: formDate.toISOString().split('T')[0],
      onChange: e => {
        const newDate = new Date(formDate);
        const [year, month, day] = e.target.value.split('-');
        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
        setField('formDate', newDate);
      },
      className: "flex-1 bg-white/20 text-white border border-white/30 rounded-lg p-2 text-sm"
    }), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: formDate.toTimeString().slice(0, 5),
      onChange: e => {
        const newDate = new Date(formDate);
        const [hours, minutes] = e.target.value.split(':');
        newDate.setHours(parseInt(hours), parseInt(minutes));
        setField('formDate', newDate);
      },
      className: "bg-white/20 text-white border border-white/30 rounded-lg p-2 text-sm"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-gray-800"
    }, checklistTypes.find(t => t.id === checkType)?.label), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStep(1),
      className: "text-gray-500 text-xl"
    }, "\u2715"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold text-gray-800"
    }, "Site Details"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDC64"), " Supervisor Name *"), /*#__PURE__*/React.createElement("select", {
      value: fields.supervisorName,
      onChange: e => setField('supervisorName', e.target.value),
      onBlur: () => markTouched('supervisorName'),
      className: `w-full border rounded-lg p-3 bg-white ${fieldError('supervisorName', fields.supervisorName) ? 'border-red-500' : 'border-gray-300'}`,
      "aria-required": "true",
      "aria-invalid": !!fieldError('supervisorName', fields.supervisorName)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select Supervisor"), FORM_CONSTANTS.supervisors.map(name => /*#__PURE__*/React.createElement("option", {
      key: name,
      value: name
    }, name))), fieldError('supervisorName', fields.supervisorName) && /*#__PURE__*/React.createElement("p", {
      className: "field-error-text"
    }, "Supervisor name is required")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
      value: fields.siteConducted,
      onChange: e => setField('siteConducted', e.target.value),
      onBlur: () => markTouched('siteConducted'),
      className: `w-full border rounded-lg p-3 bg-white ${fieldError('siteConducted', fields.siteConducted) ? 'border-red-500' : 'border-gray-300'}`,
      "aria-required": "true",
      "aria-invalid": !!fieldError('siteConducted', fields.siteConducted)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
      key: site,
      value: site
    }, site))), fieldError('siteConducted', fields.siteConducted) && /*#__PURE__*/React.createElement("p", {
      className: "field-error-text"
    }, "Site is required")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Builder *"), /*#__PURE__*/React.createElement("select", {
      value: fields.builder,
      onChange: e => setField('builder', e.target.value),
      onBlur: () => markTouched('builder'),
      className: `w-full border rounded-lg p-3 bg-white ${fieldError('builder', fields.builder) ? 'border-red-500' : 'border-gray-300'}`,
      "aria-required": "true",
      "aria-invalid": !!fieldError('builder', fields.builder)
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select Builder"), builders.map(b => /*#__PURE__*/React.createElement("option", {
      key: b,
      value: b
    }, b))), fieldError('builder', fields.builder) && /*#__PURE__*/React.createElement("p", {
      className: "field-error-text"
    }, "Builder is required")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDCCD"), " Address *"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: fields.address,
      onChange: e => setField('address', e.target.value),
      onBlur: () => markTouched('address'),
      className: `flex-1 border rounded-lg p-3 ${fieldError('address', fields.address) ? 'border-red-500' : 'border-gray-300'}`,
      placeholder: "Enter site address",
      "aria-required": "true",
      "aria-invalid": !!fieldError('address', fields.address)
    }), /*#__PURE__*/React.createElement("button", {
      onClick: getLocation,
      disabled: isLocating,
      className: "bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400"
    }, isLocating ? '...' : '📍')), fieldError('address', fields.address) && /*#__PURE__*/React.createElement("p", {
      className: "field-error-text"
    }, "Address is required"))), /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Work Areas",
      value: fields.workAreas.value,
      notes: fields.workAreas.notes,
      media: fields.workAreas.media,
      siteName: fields.siteConducted,
      onValueChange: val => setField('workAreas', {
        ...fields.workAreas,
        value: val
      }),
      onAddNote: note => setField('workAreas', {
        ...fields.workAreas,
        notes: [...fields.workAreas.notes, note]
      }),
      onAddMedia: item => {
        console.log('Work Areas onAddMedia called with:', item?.name);
        setField('workAreas', {
          ...fields.workAreas,
          media: [...fields.workAreas.media, item]
        });
      },
      onRemoveNote: idx => setField('workAreas', {
        ...fields.workAreas,
        notes: fields.workAreas.notes.filter((_, i) => i !== idx)
      }),
      onRemoveMedia: idx => setField('workAreas', {
        ...fields.workAreas,
        media: fields.workAreas.media.filter((_, i) => i !== idx)
      })
    }), /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Task to be Completed this Shift",
      value: fields.tasksThisShift.value,
      notes: fields.tasksThisShift.notes,
      media: fields.tasksThisShift.media,
      siteName: fields.siteConducted,
      onValueChange: val => setField('tasksThisShift', {
        ...fields.tasksThisShift,
        value: val
      }),
      onAddNote: note => setField('tasksThisShift', {
        ...fields.tasksThisShift,
        notes: [...fields.tasksThisShift.notes, note]
      }),
      onAddMedia: item => {
        console.log('Tasks onAddMedia called with:', item?.name);
        setField('tasksThisShift', {
          ...fields.tasksThisShift,
          media: [...fields.tasksThisShift.media, item]
        });
      },
      onRemoveNote: idx => setField('tasksThisShift', {
        ...fields.tasksThisShift,
        notes: fields.tasksThisShift.notes.filter((_, i) => i !== idx)
      }),
      onRemoveMedia: idx => setField('tasksThisShift', {
        ...fields.tasksThisShift,
        media: fields.tasksThisShift.media.filter((_, i) => i !== idx)
      })
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDE9C"), " Is Plant/Equipment to be used?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3",
      role: "group",
      "aria-label": "Is Plant/Equipment to be used?"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('isPlantEquipmentUsed', true),
      "aria-pressed": fields.isPlantEquipmentUsed === true,
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.isPlantEquipmentUsed === true ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('isPlantEquipmentUsed', false),
      "aria-pressed": fields.isPlantEquipmentUsed === false,
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.isPlantEquipmentUsed === false ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"))), fields.isPlantEquipmentUsed === true && /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Controls Required for Machinery / Plants",
      value: fields.machineryControls.value,
      notes: fields.machineryControls.notes,
      media: fields.machineryControls.media,
      siteName: fields.siteConducted,
      onValueChange: val => setField('machineryControls', {
        ...fields.machineryControls,
        value: val
      }),
      onAddNote: note => setField('machineryControls', {
        ...fields.machineryControls,
        notes: [...fields.machineryControls.notes, note]
      }),
      onAddMedia: item => {
        console.log('Machinery onAddMedia called with:', item?.name);
        setField('machineryControls', {
          ...fields.machineryControls,
          media: [...fields.machineryControls.media, item]
        });
      },
      onRemoveNote: idx => setField('machineryControls', {
        ...fields.machineryControls,
        notes: fields.machineryControls.notes.filter((_, i) => i !== idx)
      }),
      onRemoveMedia: idx => setField('machineryControls', {
        ...fields.machineryControls,
        media: fields.machineryControls.media.filter((_, i) => i !== idx)
      })
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 text-orange-600 mb-3"
    }, "Site Specific Hazards"), /*#__PURE__*/React.createElement("textarea", {
      value: fields.siteHazards.value,
      onChange: e => setField('siteHazards', {
        ...fields.siteHazards,
        value: e.target.value
      }),
      className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
      placeholder: "Enter site specific hazards..."
    })), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 text-orange-600 mb-3"
    }, "Site Specific Permits Required"), /*#__PURE__*/React.createElement("textarea", {
      value: fields.permitsRequired.value,
      onChange: e => setField('permitsRequired', {
        ...fields.permitsRequired,
        value: e.target.value
      }),
      className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
      placeholder: "Enter permits required..."
    })), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u26A0\uFE0F"), " High Risk Works?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3",
      role: "group",
      "aria-label": "High Risk Works?"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('highRiskWorks', 'yes'),
      "aria-pressed": fields.highRiskWorks === 'yes',
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.highRiskWorks === 'yes' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('highRiskWorks', 'no'),
      "aria-pressed": fields.highRiskWorks === 'no',
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.highRiskWorks === 'no' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('highRiskWorks', 'na'),
      "aria-pressed": fields.highRiskWorks === 'na',
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.highRiskWorks === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "N/A"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDCCB"), " Works performed are covered by SWMS?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3",
      role: "group",
      "aria-label": "Works covered by SWMS?"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('worksCoveredBySWMS', 'yes'),
      "aria-pressed": fields.worksCoveredBySWMS === 'yes',
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.worksCoveredBySWMS === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('worksCoveredBySWMS', 'no'),
      "aria-pressed": fields.worksCoveredBySWMS === 'no',
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.worksCoveredBySWMS === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('worksCoveredBySWMS', 'na'),
      "aria-pressed": fields.worksCoveredBySWMS === 'na',
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.worksCoveredBySWMS === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "N/A"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u26A0\uFE0F"), " Safety Issues/Incidents from Previous Shift or Industry Safety Notices?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3",
      role: "group",
      "aria-label": "Safety issues from previous shift?"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('hasSafetyIssues', true),
      "aria-pressed": fields.hasSafetyIssues === true,
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.hasSafetyIssues === true ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setField('hasSafetyIssues', false);
        setField('safetyIssuesPreviousShift', {
          value: '',
          notes: [],
          media: []
        });
      },
      "aria-pressed": fields.hasSafetyIssues === false,
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.hasSafetyIssues === false ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"))), fields.hasSafetyIssues === true && /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Safety Issues/Incidents Details",
      value: fields.safetyIssuesPreviousShift.value,
      notes: fields.safetyIssuesPreviousShift.notes,
      media: fields.safetyIssuesPreviousShift.media,
      siteName: fields.siteConducted,
      onValueChange: val => setField('safetyIssuesPreviousShift', {
        ...fields.safetyIssuesPreviousShift,
        value: val
      }),
      onAddNote: note => setField('safetyIssuesPreviousShift', {
        ...fields.safetyIssuesPreviousShift,
        notes: [...fields.safetyIssuesPreviousShift.notes, note]
      }),
      onAddMedia: item => {
        console.log('Safety Issues onAddMedia called with:', item?.name);
        setField('safetyIssuesPreviousShift', {
          ...fields.safetyIssuesPreviousShift,
          media: [...fields.safetyIssuesPreviousShift.media, item]
        });
      },
      onRemoveNote: idx => setField('safetyIssuesPreviousShift', {
        ...fields.safetyIssuesPreviousShift,
        notes: fields.safetyIssuesPreviousShift.notes.filter((_, i) => i !== idx)
      }),
      onRemoveMedia: idx => setField('safetyIssuesPreviousShift', {
        ...fields.safetyIssuesPreviousShift,
        media: fields.safetyIssuesPreviousShift.media.filter((_, i) => i !== idx)
      })
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl shadow-sm divide-y"
    }, items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
      key: item.id,
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-gray-700"
    }, idx + 1, ". ", item.text), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2",
      role: "group",
      "aria-label": item.text
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('checks', {
        ...fields.checks,
        [item.id]: true
      }),
      "aria-pressed": fields.checks[item.id] === true,
      "aria-label": "Pass",
      className: `w-10 h-10 rounded-lg flex items-center justify-center border-2 ${fields.checks[item.id] === true ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`
    }, "\u2713"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('checks', {
        ...fields.checks,
        [item.id]: false
      }),
      "aria-pressed": fields.checks[item.id] === false,
      "aria-label": "Fail",
      className: `w-10 h-10 rounded-lg flex items-center justify-center border-2 ${fields.checks[item.id] === false ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`
    }, "\u2715")))))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Notes / Issues"), /*#__PURE__*/React.createElement("textarea", {
      value: fields.notes,
      onChange: e => setField('notes', e.target.value),
      className: "w-full border border-gray-300 rounded-lg p-3",
      rows: 3,
      placeholder: "Record any issues..."
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStep(3),
      disabled: !allChecked || !fields.supervisorName || !fields.siteConducted || !fields.builder || !fields.address,
      className: "w-full bg-orange-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
    }, "Next: Worker Sign-On \u2192"));
  }
  if (step === 3) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, signingWorker && /*#__PURE__*/React.createElement(SignaturePad, {
      name: signingWorker,
      onSave: data => {
        setField('signatures', {
          ...signatures,
          [signingWorker]: data
        });
        setSigningWorker(null);
      },
      onCancel: () => setSigningWorker(null)
    }), signingTranslator && /*#__PURE__*/React.createElement(SignaturePad, {
      name: fields.translatorName || "Translator",
      onSave: data => {
        setField('translatorSignature', data);
        setSigningTranslator(false);
      },
      onCancel: () => setSigningTranslator(false)
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-gray-800"
    }, "Worker Sign-On"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStep(2),
      className: "text-gray-500"
    }, "\u2190 Back")), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 text-sm mt-1"
    }, "Tap on a signature box to sign")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83C\uDF10"), " Translator Required?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3 mb-4",
      role: "group",
      "aria-label": "Translator required?"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('translatorRequired', true),
      "aria-pressed": fields.translatorRequired === true,
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.translatorRequired === true ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setField('translatorRequired', false);
        setField('translatorSignature', null);
        setField('translatorName', '');
      },
      "aria-pressed": fields.translatorRequired === false,
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${fields.translatorRequired === false ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No")), fields.translatorRequired === true && /*#__PURE__*/React.createElement("div", {
      className: "border-t pt-4 space-y-3"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Translator Name *"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: fields.translatorName,
      onChange: e => setField('translatorName', e.target.value),
      className: "w-full border border-gray-300 rounded-lg p-3",
      placeholder: "Enter translator name",
      "aria-required": "true"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Translator Signature *"), fields.translatorSignature ? /*#__PURE__*/React.createElement("div", {
      className: "relative inline-block"
    }, /*#__PURE__*/React.createElement("div", {
      className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40"
    }, /*#__PURE__*/React.createElement("img", {
      src: fields.translatorSignature,
      alt: "translator signature",
      className: "h-full w-full object-contain"
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('translatorSignature', null),
      className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
    }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
      onClick: () => setSigningTranslator(true),
      className: "h-20 w-40 border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:border-blue-500"
    }, "Tap to sign")))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl shadow-sm divide-y"
    }, teamMembers.map(name => /*#__PURE__*/React.createElement("div", {
      key: name,
      className: "p-4 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-gray-800"
    }, name), signatures[name] ? /*#__PURE__*/React.createElement("div", {
      className: "relative"
    }, /*#__PURE__*/React.createElement("div", {
      className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-16 w-32"
    }, /*#__PURE__*/React.createElement("img", {
      src: signatures[name],
      alt: "signature",
      className: "h-full w-full object-contain"
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setField('signatures', {
        ...signatures,
        [name]: null
      }),
      className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
    }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
      onClick: () => setSigningWorker(name),
      className: "h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-500"
    }, "Tap to sign")))), /*#__PURE__*/React.createElement("div", {
      className: "bg-blue-50 border border-blue-200 rounded-xl p-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-blue-800 font-medium"
    }, signedCount, " of ", teamMembers.length, " workers signed")), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 border border-red-300 rounded-xl p-4",
      role: "alert"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-red-800 font-semibold mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u26A0\uFE0F"), " Cannot submit - please fix these issues:"), /*#__PURE__*/React.createElement("ul", {
      className: "text-red-700 text-sm space-y-1"
    }, validationErrors.map((err, i) => /*#__PURE__*/React.createElement("li", {
      key: i
    }, "\u2022 ", err)))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setValidationErrors([]);
        setStep(2);
      },
      className: "flex-1 border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold"
    }, "\u2190 Back"), /*#__PURE__*/React.createElement("button", {
      onClick: handleSubmit,
      className: "flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold"
    }, isEditing ? '✓ Update Pre-Start' : '✓ Complete Pre-Start')));
  }
  return null;
}

// Incident View
window.PrestartView = PrestartView;

// === js/components/form-incident.jsx ===
// IncidentView Component
// Extracted from forms.jsx

/**
 * WHS Incident Report form for near misses, injuries, property damage, and environmental incidents. Includes reporter signature.
 * @param {Object} props
 * @param {Function} props.onSubmit - Called with form data when creating a new form
 * @param {Function} props.onUpdate - Called with form data when updating an existing form
 * @param {Object|null} props.editingForm - Existing form data when editing, null when creating
 */
function IncidentView({
  onSubmit,
  onUpdate,
  editingForm
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [formData, setFormData] = useState({
    type: editData.type || '',
    date: editData.date || new Date().toISOString().split('T')[0],
    time: editData.time || new Date().toTimeString().slice(0, 5),
    location: editData.location || '',
    description: editData.description || '',
    injuries: editData.injuries || 'none',
    injuryDetails: editData.injuryDetails || '',
    witnesses: editData.witnesses || '',
    immediateActions: editData.immediateActions || '',
    reportedBy: editData.reportedBy || ''
  });
  const [reporterSignature, setReporterSignature] = useState(editData.reporterSignature || null);
  const [signingReporter, setSigningReporter] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [draftBanner, setDraftBanner] = useState(null);

  // Auto-save drafts every 30 seconds (only for new forms, not edits)
  const incidentAutoSaveData = {
    ...formData,
    reporterSignature
  };
  const {
    loadDraft,
    clearDraft
  } = useAutoSave(isEditing ? null : 'incident', incidentAutoSaveData, 30000);

  // Check for saved draft on mount
  useEffect(() => {
    if (!isEditing) {
      var draft = loadDraft();
      if (draft) {
        setDraftBanner(draft);
      }
    }
  }, []);
  const incidentTypes = [{
    id: 'nearmiss',
    label: 'Near Miss',
    description: 'Could have caused injury',
    color: 'bg-yellow-500'
  }, {
    id: 'injury',
    label: 'Injury',
    description: 'Resulted in injury',
    color: 'bg-red-500'
  }, {
    id: 'damage',
    label: 'Property Damage',
    description: 'Equipment/property damage',
    color: 'bg-orange-500'
  }, {
    id: 'environmental',
    label: 'Environmental',
    description: 'Spill/leak/environmental',
    color: 'bg-green-500'
  }];
  useEffect(() => {
    const data = editingForm?.data || {};
    setStep(editingForm ? 2 : 1);
    setFormData({
      type: data.type || '',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toTimeString().slice(0, 5),
      location: data.location || '',
      description: data.description || '',
      injuries: data.injuries || 'none',
      injuryDetails: data.injuryDetails || '',
      witnesses: data.witnesses || '',
      immediateActions: data.immediateActions || '',
      reportedBy: data.reportedBy || ''
    });
    setReporterSignature(data.reporterSignature || null);
    setSigningReporter(false);
    setValidationError('');
  }, [editingForm?.id]);
  const handleIncidentSubmit = () => {
    // Use centralized validator for comprehensive WHS-compliant checks
    const validationData = {
      ...formData,
      reporterSignature,
      incidentType: formData.type,
      incidentDate: formData.date,
      incidentTime: formData.time
    };
    const errors = window.formValidator ? window.formValidator.validateIncident(validationData) : [];
    if (errors.length > 0) {
      setValidationError(errors.join('. '));
      return;
    }
    setValidationError('');
    const submitData = {
      ...formData,
      reporterSignature
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'incident', submitData);
    } else {
      clearDraft();
      onSubmit(submitData);
      setStep(4);
    }
  };
  const isNotifiable = formData.type === 'injury' || formData.type === 'damage' && formData.description && formData.description.toLowerCase().match(/collapse|fall|electr|explos|gas|chemical|asbestos|confined|trench/);
  if (step === 4) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl",
      "aria-hidden": "true"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Report Updated!' : 'Report Submitted!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, "Reference: INC-", Date.now().toString().slice(-6)), isNotifiable && /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 border-2 border-red-400 rounded-xl p-4 mx-4 mb-6 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-2xl",
      "aria-hidden": "true"
    }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-red-800 text-lg"
    }, "Possible Notifiable Incident"), /*#__PURE__*/React.createElement("p", {
      className: "text-red-700 text-sm mt-1"
    }, "Under the WHS Act 2011, serious injuries, dangerous incidents, and deaths must be reported to SafeWork NSW immediately."), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 space-y-1 text-sm text-red-800"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-semibold"
    }, "You must:"), /*#__PURE__*/React.createElement("p", null, "1. Call SafeWork NSW: ", /*#__PURE__*/React.createElement("a", {
      href: "tel:131050",
      className: "underline font-bold"
    }, "13 10 50")), /*#__PURE__*/React.createElement("p", null, "2. Preserve the scene (do not disturb unless preventing further injury)"), /*#__PURE__*/React.createElement("p", null, "3. Written notification within 48 hours"))))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setStep(1);
        setFormData({
          type: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          location: '',
          description: '',
          injuries: 'none',
          injuryDetails: '',
          witnesses: '',
          immediateActions: '',
          reportedBy: ''
        });
        setReporterSignature(null);
        setValidationError('');
      },
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Submit Another"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26A0\uFE0F"), " Incident / Near Miss Report"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Report all incidents within 24 hours")), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl",
    "aria-hidden": "true"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this report and save your changes"))), draftBanner && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-amber-800 font-semibold text-sm"
  }, "Unsaved Draft Found"), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-600 text-xs"
  }, draftBanner.ageMinutes < 60 ? draftBanner.ageMinutes + ' minutes ago' : Math.round(draftBanner.ageMinutes / 60) + ' hours ago'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const d = draftBanner.data;
      setFormData({
        type: d.type || '',
        date: d.date || '',
        time: d.time || '',
        location: d.location || '',
        description: d.description || '',
        injuries: d.injuries || 'none',
        injuryDetails: d.injuryDetails || '',
        witnesses: d.witnesses || '',
        immediateActions: d.immediateActions || '',
        reportedBy: d.reportedBy || ''
      });
      setReporterSignature(d.reporterSignature || null);
      setStep(2);
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold"
  }, "Restore"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      clearDraft();
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
  }, "Discard")))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3",
    role: "group",
    "aria-label": "Incident type selection"
  }, incidentTypes.map(type => /*#__PURE__*/React.createElement("button", {
    key: type.id,
    onClick: () => {
      setFormData({
        ...formData,
        type: type.id
      });
      setStep(2);
    },
    "aria-pressed": formData.type === type.id,
    className: "w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-12 h-12 ${type.color} rounded-full flex items-center justify-center text-white text-xl`,
    "aria-hidden": "true"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-800"
  }, type.label), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, type.description))))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Incident Details"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Date *"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: formData.date,
    onChange: e => setFormData({
      ...formData,
      date: e.target.value
    }),
    "aria-required": "true",
    className: "w-full border rounded-lg p-3"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Time *"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: formData.time,
    onChange: e => setFormData({
      ...formData,
      time: e.target.value
    }),
    "aria-required": "true",
    className: "w-full border rounded-lg p-3"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Location *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.location,
    onChange: e => setFormData({
      ...formData,
      location: e.target.value
    }),
    "aria-required": "true",
    className: "w-full border rounded-lg p-3",
    placeholder: "Where did this occur?"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Description *"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.description,
    onChange: e => setFormData({
      ...formData,
      description: e.target.value
    }),
    "aria-required": "true",
    className: "w-full border rounded-lg p-3",
    rows: 4,
    placeholder: "Describe what happened..."
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    className: "flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg"
  }, "Back"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(3),
    disabled: !formData.location || !formData.description,
    className: "flex-1 bg-orange-600 text-white py-3 rounded-lg disabled:bg-gray-300"
  }, "Next"))), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Additional Information"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Reported By *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.reportedBy,
    onChange: e => setFormData({
      ...formData,
      reportedBy: e.target.value
    }),
    "aria-required": "true",
    className: "w-full border rounded-lg p-3",
    placeholder: "Your name"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Witnesses (if any)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.witnesses,
    onChange: e => setFormData({
      ...formData,
      witnesses: e.target.value
    }),
    className: "w-full border rounded-lg p-3",
    placeholder: "Names of any witnesses"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Immediate Actions Taken *"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.immediateActions,
    onChange: e => setFormData({
      ...formData,
      immediateActions: e.target.value
    }),
    "aria-required": "true",
    className: "w-full border rounded-lg p-3",
    rows: 3,
    placeholder: "What actions were taken immediately after the incident?"
  })), /*#__PURE__*/React.createElement("div", {
    className: "border-t pt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Reporter Signature * ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500 text-xs"
  }, "(Required for submission)")), reporterSignature ? /*#__PURE__*/React.createElement("div", {
    className: "relative inline-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50"
  }, /*#__PURE__*/React.createElement("img", {
    src: reporterSignature,
    alt: "signature",
    className: "h-16 object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setReporterSignature(null),
    "aria-label": "Clear signature",
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningReporter(true),
    "aria-label": "Tap to sign as reporter",
    className: "w-full h-20 border-2 border-dashed border-red-300 rounded-lg text-red-500 hover:border-red-500 bg-red-50 font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u270D\uFE0F"), " Tap to Sign (Required)")), validationError && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-300 rounded-lg p-3",
    role: "alert"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-700 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26A0\uFE0F"), " ", validationError)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setValidationError('');
      setStep(2);
    },
    className: "flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg"
  }, "Back"), /*#__PURE__*/React.createElement("button", {
    onClick: handleIncidentSubmit,
    className: "flex-1 bg-red-600 text-white py-3 rounded-lg"
  }, "Submit Report"))), signingReporter && /*#__PURE__*/React.createElement(SignaturePad, {
    name: formData.reportedBy || "Reporter",
    onSave: sig => {
      setReporterSignature(sig);
      setSigningReporter(false);
    },
    onCancel: () => setSigningReporter(false)
  }));
}

// Toolbox View
window.IncidentView = IncidentView;

// === js/components/form-toolbox.jsx ===
// ToolboxView Component
// Extracted from forms.jsx

/**
 * Toolbox Talk form for pre-shift safety briefings. Multi-step wizard with topic selection, corrective actions, and team signatures.
 * @param {Object} props
 * @param {Function} props.onSubmit - Called with form data when creating a new form
 * @param {Function} props.onUpdate - Called with form data when updating an existing form
 * @param {Object|null} props.editingForm - Existing form data when editing, null when creating
 * @param {Array} [props.sites=[]] - Available site names for the site selector
 */
function ToolboxView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [signingWorker, setSigningWorker] = useState(null);
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [builder, setBuilder] = useState(editData.builder || '');
  const [address, setAddress] = useState(editData.address || '');
  const [isLocating, setIsLocating] = useState(false);
  const [preparedBy, setPreparedBy] = useState(editData.preparedBy || '');
  const [selectedTopics, setSelectedTopics] = useState(editData.topics || []);
  const [otherTopic, setOtherTopic] = useState(editData.otherTopic || '');
  const [correctiveAction, setCorrectiveAction] = useState(editData.correctiveAction || '');
  const [feedbackResponses, setFeedbackResponses] = useState(editData.feedbackResponses || '');
  const [signatures, setSignatures] = useState(editData.signatures || FORM_CONSTANTS.emptySignatures());
  const [validationErrors, setValidationErrors] = useState([]);
  const [draftBanner, setDraftBanner] = useState(null);
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const teamMembers = FORM_CONSTANTS.teamMembers;
  const preparers = FORM_CONSTANTS.supervisors;
  const builders = FORM_CONSTANTS.builders;
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');
  const topics = ['Manual Handling', 'Working at Heights', 'Hot Work Safety', 'PPE Requirements', 'Emergency Procedures', 'Electrical Safety', 'Housekeeping', 'Slips, Trips & Falls', 'Fire Safety', 'First Aid', 'Hazard Identification', 'Risk Assessment', 'Confined Spaces', 'Scaffolding Safety', 'Crane & Lifting Operations', 'Welding Safety', 'Chemical Handling', 'Noise & Hearing Protection', 'Sun & Heat Safety', 'Mental Health & Wellbeing', 'Tool Safety', 'Mobile Plant Safety', 'Traffic Management', 'Asbestos Awareness', 'Lock Out Tag Out (LOTO)', 'Incident Reporting', 'Near Miss Reporting', 'Safe Work Method Statements (SWMS)'];
  const signedCount = Object.values(signatures).filter(s => s !== null).length;
  const toggleTopic = topic => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  // Auto-save drafts every 30 seconds (only for new forms, not edits)
  const toolboxAutoSaveData = {
    siteConducted,
    builder,
    address,
    preparedBy,
    topics: selectedTopics,
    otherTopic,
    correctiveAction,
    feedbackResponses,
    signatures
  };
  const {
    loadDraft,
    clearDraft
  } = useAutoSave(isEditing ? null : 'toolbox', toolboxAutoSaveData, 30000);

  // Check for saved draft on mount
  useEffect(() => {
    if (!isEditing) {
      var draft = loadDraft();
      if (draft) {
        setDraftBanner(draft);
      }
    }
  }, []);
  useEffect(() => {
    const data = editingForm?.data || {};
    setStep(editingForm ? 2 : 1);
    setSiteConducted(data.siteConducted || '');
    setBuilder(data.builder || '');
    setAddress(data.address || '');
    setPreparedBy(data.preparedBy || '');
    setSelectedTopics(data.topics || []);
    setOtherTopic(data.otherTopic || '');
    setCorrectiveAction(data.correctiveAction || '');
    setFeedbackResponses(data.feedbackResponses || '');
    setSignatures(data.signatures || FORM_CONSTANTS.emptySignatures());
    setValidationErrors([]);
  }, [editingForm?.id]);
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setAddress(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateToolbox({
        siteConducted,
        preparedBy,
        topics: selectedTopics,
        signatures
      });
    } else {
      if (!siteConducted) errors.push('Site/Location is required');
      if (!preparedBy) errors.push('Prepared by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const submitData = {
      siteConducted,
      builder,
      address,
      preparedBy,
      topics: selectedTopics,
      otherTopic,
      correctiveAction,
      feedbackResponses,
      signatures,
      date: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'toolbox', submitData);
    } else {
      clearDraft();
      onSubmit(submitData);
      setStep(3);
    }
  };
  const resetForm = () => {
    setStep(1);
    setSiteConducted('');
    setBuilder('');
    setAddress('');
    setPreparedBy('');
    setSelectedTopics([]);
    setOtherTopic('');
    setCorrectiveAction('');
    setFeedbackResponses('');
    setSignatures(FORM_CONSTANTS.emptySignatures());
  };
  if (step === 3) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl",
      "aria-hidden": "true"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Toolbox Talk Updated!' : 'Toolbox Talk Recorded!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, signedCount, " attendees signed on"), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Record Another"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingWorker && /*#__PURE__*/React.createElement(SignaturePad, {
    name: signingWorker,
    onSave: data => {
      setSignatures({
        ...signatures,
        [signingWorker]: data
      });
      setSigningWorker(null);
    },
    onCancel: () => setSigningWorker(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg"
  }, todayDate))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDC65"), " Toolbox Talk"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Daily safety briefing record")), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl",
    "aria-hidden": "true"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this toolbox talk and save your changes"))), draftBanner && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-amber-800 font-semibold text-sm"
  }, "Unsaved Draft Found"), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-600 text-xs"
  }, draftBanner.ageMinutes < 60 ? draftBanner.ageMinutes + ' minutes ago' : Math.round(draftBanner.ageMinutes / 60) + ' hours ago'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const d = draftBanner.data;
      setSiteConducted(d.siteConducted || '');
      setBuilder(d.builder || '');
      setAddress(d.address || '');
      setPreparedBy(d.preparedBy || '');
      setSelectedTopics(d.topics || []);
      setOtherTopic(d.otherTopic || '');
      setCorrectiveAction(d.correctiveAction || '');
      setFeedbackResponses(d.feedbackResponses || '');
      setSignatures(d.signatures || FORM_CONSTANTS.emptySignatures());
      setStep(2);
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold"
  }, "Restore"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      clearDraft();
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
  }, "Discard")))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Site Details"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
    value: siteConducted,
    onChange: e => setSiteConducted(e.target.value),
    "aria-required": "true",
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
    key: site,
    value: site
  }, site)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Builder *"), /*#__PURE__*/React.createElement("select", {
    value: builder,
    onChange: e => setBuilder(e.target.value),
    "aria-required": "true",
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Builder"), builders.map(b => /*#__PURE__*/React.createElement("option", {
    key: b,
    value: b
  }, b)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCCD"), " Site Address *"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: address,
    onChange: e => setAddress(e.target.value),
    "aria-required": "true",
    className: "flex-1 border border-gray-300 rounded-lg p-3",
    placeholder: "Enter site address"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: getLocation,
    disabled: isLocating,
    "aria-label": "Get current location",
    className: "bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, isLocating ? '...' : '📍')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Prepared By *"), /*#__PURE__*/React.createElement("select", {
    value: preparedBy,
    onChange: e => setPreparedBy(e.target.value),
    "aria-required": "true",
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Preparer"), preparers.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCCB"), " Topics Discussed"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 mb-3"
  }, "Select all topics covered in this toolbox talk"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, topics.map(topic => /*#__PURE__*/React.createElement("button", {
    key: topic,
    onClick: () => toggleTopic(topic),
    "aria-pressed": selectedTopics.includes(topic),
    className: `p-2 rounded-lg text-sm text-left border-2 ${selectedTopics.includes(topic) ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-gray-200 text-gray-700'}`
  }, selectedTopics.includes(topic) ? '✓ ' : '', topic))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Other Topics"), /*#__PURE__*/React.createElement("textarea", {
    value: otherTopic,
    onChange: e => setOtherTopic(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm",
    rows: 2,
    placeholder: "Enter any other topics discussed..."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-800 text-orange-600 mb-3"
  }, "Corrective Action Required"), /*#__PURE__*/React.createElement("textarea", {
    value: correctiveAction,
    onChange: e => setCorrectiveAction(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
    placeholder: "Enter any corrective actions required..."
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-800 text-orange-600 mb-3"
  }, "Feedback and Responses"), /*#__PURE__*/React.createElement("textarea", {
    value: feedbackResponses,
    onChange: e => setFeedbackResponses(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
    placeholder: "Enter feedback and responses from attendees..."
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(2),
    disabled: !siteConducted || !builder || !address || !preparedBy || selectedTopics.length === 0,
    className: "w-full bg-orange-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
  }, "Next: Attendance & Signatures \u2192")), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800"
  }, "Attendance & Signatures"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    className: "text-gray-500"
  }, "\u2190 Back")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Tap on a signature box to sign")), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 border border-purple-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-800"
  }, /*#__PURE__*/React.createElement("strong", null, "Topics:"), " ", selectedTopics.join(', ')), otherTopic && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-800 mt-1"
  }, /*#__PURE__*/React.createElement("strong", null, "Other:"), " ", otherTopic)), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm divide-y"
  }, teamMembers.map(name => /*#__PURE__*/React.createElement("div", {
    key: name,
    className: "p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-gray-800"
  }, name), signatures[name] ? /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-16 w-32"
  }, /*#__PURE__*/React.createElement("img", {
    src: signatures[name],
    alt: "signature",
    className: "h-full w-full object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSignatures({
      ...signatures,
      [name]: null
    }),
    "aria-label": "Clear signature",
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningWorker(name),
    className: "h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-500"
  }, "Tap to sign")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-medium"
  }, signedCount, " of ", teamMembers.length, " attendees signed")), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4",
    role: "alert"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    className: "flex-1 border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold"
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: signedCount === 0,
    className: "flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
  }, "\u2713 Complete Toolbox Talk"))));
}

// Subcontractor Site Inspection View
window.ToolboxView = ToolboxView;

// === js/components/form-inspection.jsx ===
// SubcontractorInspectionView Component
// Extracted from forms.jsx

/**
 * Subcontractor Site Inspection form with yes/no/na inspection items and inspector signature.
 * @param {Object} props
 * @param {Function} props.onSubmit - Called with form data when creating a new form
 * @param {Function} props.onUpdate - Called with form data when updating an existing form
 * @param {Object|null} props.editingForm - Existing form data when editing, null when creating
 * @param {Array} [props.sites=[]] - Available site names for the site selector
 */
function SubcontractorInspectionView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const defaultInspectionItems = {
    siteBoxes: null,
    electricalLeads: null,
    toolsRetagging: null,
    exclusionZones: null,
    permitsCompleted: null,
    permitsActive: null,
    penetrationsCovered: null,
    equipmentInspection: null,
    workerSafetyConcerns: null,
    builderRequests: null
  };
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [preparedBy, setPreparedBy] = useState(editData.preparedBy || '');
  const [location, setLocation] = useState(editData.location || '');
  const [isLocating, setIsLocating] = useState(false);
  const [completedBy, setCompletedBy] = useState(editData.completedBy || '');
  const [completedBySignature, setCompletedBySignature] = useState(editData.completedBySignature || null);
  const [signingInspector, setSigningInspector] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [draftBanner, setDraftBanner] = useState(null);

  // Inspection items with Yes/No/N/A
  const [inspectionItems, setInspectionItems] = useState(editData.inspectionItems || defaultInspectionItems);
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const preparers = FORM_CONSTANTS.supervisors;
  const inspectors = ['Scott Seeho', 'Davide Casolini'];
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');
  useEffect(() => {
    const data = editingForm?.data || {};
    setSiteConducted(data.siteConducted || '');
    setPreparedBy(data.preparedBy || '');
    setLocation(data.location || '');
    setCompletedBy(data.completedBy || '');
    setCompletedBySignature(data.completedBySignature || null);
    setInspectionItems(data.inspectionItems || defaultInspectionItems);
    setSubmitted(false);
    setValidationErrors([]);
  }, [editingForm?.id]);

  // Auto-save drafts every 30 seconds (only for new forms, not edits)
  const inspectionAutoSaveData = {
    siteConducted,
    preparedBy,
    location,
    completedBy,
    completedBySignature,
    inspectionItems
  };
  const {
    loadDraft,
    clearDraft
  } = useAutoSave(isEditing ? null : 'inspection', inspectionAutoSaveData, 30000);

  // Check for saved draft on mount
  useEffect(() => {
    if (!isEditing) {
      var draft = loadDraft();
      if (draft) {
        setDraftBanner(draft);
      }
    }
  }, []);
  const inspectionQuestions = [{
    id: 'siteBoxes',
    text: 'Site boxes in good condition and lockable'
  }, {
    id: 'electricalLeads',
    text: 'Electrical leads and tools are tagged and tested up to date'
  }, {
    id: 'toolsRetagging',
    text: 'Tools or Equipment needed retagging or testing soon'
  }, {
    id: 'exclusionZones',
    text: 'Exclusion zones set up around work areas (as required)'
  }, {
    id: 'permitsCompleted',
    text: 'Permits are completed (as required)'
  }, {
    id: 'permitsActive',
    text: 'Permits Active during inspection'
  }, {
    id: 'penetrationsCovered',
    text: 'Penetrations are covered or have barriers around them'
  }, {
    id: 'equipmentInspection',
    text: 'Equipment onsite has recent inspection completed'
  }, {
    id: 'workerSafetyConcerns',
    text: 'Any worker reports of safety concerns or improvements'
  }, {
    id: 'builderRequests',
    text: 'Any request from Builder'
  }];
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setLocation(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };
  const setInspectionValue = (id, value) => {
    setInspectionItems({
      ...inspectionItems,
      [id]: value
    });
  };
  const allAnswered = Object.values(inspectionItems).every(v => v !== null);
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateInspection({
        siteConducted,
        preparedBy,
        completedBy,
        inspectionItems
      });
    } else {
      if (!siteConducted) errors.push('Site/Location is required');
      if (!preparedBy) errors.push('Prepared by is required');
      if (!completedBy) errors.push('Completed by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const submitData = {
      siteConducted,
      preparedBy,
      location,
      completedBy,
      completedBySignature,
      inspectionItems,
      date: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'inspection', submitData);
    } else {
      clearDraft();
      onSubmit(submitData);
      setSubmitted(true);
    }
  };
  const resetForm = () => {
    setSiteConducted('');
    setPreparedBy('');
    setLocation('');
    setCompletedBy('');
    setCompletedBySignature(null);
    setSigningInspector(false);
    setInspectionItems({
      siteBoxes: null,
      electricalLeads: null,
      toolsRetagging: null,
      exclusionZones: null,
      permitsCompleted: null,
      permitsActive: null,
      penetrationsCovered: null,
      equipmentInspection: null,
      workerSafetyConcerns: null,
      builderRequests: null
    });
    setSubmitted(false);
  };
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Inspection Updated!' : 'Inspection Complete!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, isEditing ? 'Your changes have been saved.' : 'Site inspection has been recorded.'), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Start Another Inspection"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingInspector && /*#__PURE__*/React.createElement(SignaturePad, {
    name: completedBy || "Inspector",
    onSave: data => {
      setCompletedBySignature(data);
      setSigningInspector(false);
    },
    onCancel: () => setSigningInspector(false)
  }), draftBanner && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-amber-800 font-semibold text-sm"
  }, "Unsaved Draft Found"), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-600 text-xs"
  }, draftBanner.ageMinutes < 60 ? draftBanner.ageMinutes + ' minutes ago' : Math.round(draftBanner.ageMinutes / 60) + ' hours ago'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const d = draftBanner.data;
      setSiteConducted(d.siteConducted || '');
      setPreparedBy(d.preparedBy || '');
      setLocation(d.location || '');
      setCompletedBy(d.completedBy || '');
      setCompletedBySignature(d.completedBySignature || null);
      setInspectionItems(d.inspectionItems || defaultInspectionItems);
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold"
  }, "Restore"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      clearDraft();
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
  }, "Discard")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg"
  }, todayDate))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD0D"), " Subcontractor Site Inspection"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Complete site safety inspection")), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl",
    "aria-hidden": "true"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this inspection and save your changes"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Site Details"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
    value: siteConducted,
    onChange: e => setSiteConducted(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white",
    "aria-required": "true"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
    key: site,
    value: site
  }, site)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Prepared By *"), /*#__PURE__*/React.createElement("select", {
    value: preparedBy,
    onChange: e => setPreparedBy(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white",
    "aria-required": "true"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Preparer"), preparers.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCCD"), " Location *"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: location,
    onChange: e => setLocation(e.target.value),
    className: "flex-1 border border-gray-300 rounded-lg p-3",
    placeholder: "Enter location",
    "aria-required": "true"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: getLocation,
    disabled: isLocating,
    className: "bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400"
  }, isLocating ? '...' : '📍')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCCB"), " Inspection Checklist"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, inspectionQuestions.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "border-b border-gray-100 pb-4 last:border-0 last:pb-0"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mb-2 text-sm"
  }, idx + 1, ". ", item.text), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2",
    role: "group",
    "aria-label": item.text
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setInspectionValue(item.id, 'yes'),
    "aria-pressed": inspectionItems[item.id] === 'yes',
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "Yes"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setInspectionValue(item.id, 'no'),
    "aria-pressed": inspectionItems[item.id] === 'no',
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "No"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setInspectionValue(item.id, 'na'),
    "aria-pressed": inspectionItems[item.id] === 'na',
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "N/A")))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2705"), " Inspection Completed By *"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Name *"), /*#__PURE__*/React.createElement("select", {
    value: completedBy,
    onChange: e => {
      setCompletedBy(e.target.value);
      setCompletedBySignature(null);
    },
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white",
    "aria-required": "true"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Inspector"), inspectors.map(i => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, i)))), completedBy && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Signature *"), completedBySignature ? /*#__PURE__*/React.createElement("div", {
    className: "relative inline-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40"
  }, /*#__PURE__*/React.createElement("img", {
    src: completedBySignature,
    alt: "inspector signature",
    className: "h-full w-full object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCompletedBySignature(null),
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningInspector(true),
    className: "h-20 w-40 border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:border-blue-500"
  }, "Tap to sign"))), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4",
    role: "alert"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: !siteConducted || !preparedBy || !location || !allAnswered || !completedBy || !completedBySignature,
    className: "w-full bg-green-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
  }, "\u2713 Complete Inspection"));
}

// ITP Form View
window.SubcontractorInspectionView = SubcontractorInspectionView;

// === js/components/form-itp.jsx ===
// ITPFormView Component
// Extracted from forms.jsx

const ITP_DEFAULTS = {
  siteConducted: '',
  conductedOn: new Date().toISOString().slice(0, 16),
  preparedBy: '',
  location: '',
  preConstructionMeeting: '',
  highRiskWorkshop: null,
  shopdrawingsApproved: null,
  allItemsSignedOff: null,
  shopdrawingRevision: '',
  orderedGlassFrom: '',
  glassSpecification: '',
  glassFreeFromDamage: null,
  specificationOfFixings: '',
  setoutCompletedBy: '',
  installationMethod: '',
  glassInstalledCorrectRL: null,
  glassLockedWedgedGlued: null,
  removeWedgesCaulk: '',
  handrailSpecConfirmed: null,
  spigotsCouplingsTight: null,
  handrailCompliantHeight: null,
  threadOnFixings: null,
  fullWeldingJunctions: null,
  allGlassNoDefects: null,
  allHandrailNoDefects: null,
  balustradeAsPerDesign: null,
  builderSignoffName: '',
  builderSignature: null,
  futureCorrespondence: ''
};

/**
 * Glass Balustrade ITP (Inspection & Test Plan) form with multi-page wizard covering pre-construction through final handover.
 * @param {Object} props
 * @param {Function} props.onSubmit - Called with form data when creating a new form
 * @param {Function} props.onUpdate - Called with form data when updating an existing form
 * @param {Object|null} props.editingForm - Existing form data when editing, null when creating
 * @param {Array} [props.sites=[]] - Available site names for the site selector
 */
function ITPFormView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const [page, setPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [signingPerson, setSigningPerson] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [draftBanner, setDraftBanner] = useState(null);
  const {
    fields,
    setField,
    setFields,
    resetFields
  } = useFormState(ITP_DEFAULTS, editingForm);

  // Auto-save drafts every 30 seconds (only for new forms, not edits)
  const {
    loadDraft,
    clearDraft
  } = useAutoSave(isEditing ? null : 'itp', fields, 30000);

  // Check for saved draft on mount
  useEffect(() => {
    if (!isEditing) {
      var draft = loadDraft();
      if (draft) {
        setDraftBanner(draft);
      }
    }
  }, []);
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const preparers = FORM_CONSTANTS.supervisors;
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');
  useEffect(() => {
    setPage(1);
    setSubmitted(false);
    setSigningPerson(null);
    setValidationErrors([]);
    setIsLocating(false);
  }, [editingForm?.id]);
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setField('location', data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setField('location', `${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };

  // Yes/No/NA Button Component
  const YesNoNAButtons = ({
    value,
    onChange,
    label
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mb-3 font-medium"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2",
    role: "group",
    "aria-label": label
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange('yes'),
    "aria-pressed": value === 'yes',
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "Yes"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange('no'),
    "aria-pressed": value === 'no',
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "No"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onChange('na'),
    "aria-pressed": value === 'na',
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "N/A")));

  // Text Input Box Component
  const TextInputBox = ({
    value,
    onChange,
    label,
    placeholder
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mb-2 font-medium"
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: value,
    onChange: e => onChange(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm",
    placeholder: placeholder || "Tap to edit"
  }));

  // Section Header Component
  const SectionHeader = ({
    title,
    progress
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-400 rounded-xl p-3 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-white"
  }, "\u25BC"), /*#__PURE__*/React.createElement("span", {
    className: "text-white font-medium"
  }, title)), progress && /*#__PURE__*/React.createElement("span", {
    className: "text-white text-sm"
  }, progress));
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateITP({
        siteConducted: fields.siteConducted,
        preparedBy: fields.preparedBy,
        builderSignoffName: fields.builderSignoffName,
        builderSignature: fields.builderSignature
      });
    } else {
      if (!fields.siteConducted) errors.push('Site/Location is required');
      if (!fields.preparedBy) errors.push('Prepared by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const submitData = {
      ...fields,
      date: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'itp', submitData);
    } else {
      clearDraft();
      onSubmit(submitData);
      setSubmitted(true);
    }
  };
  const resetForm = () => {
    setPage(1);
    setSubmitted(false);
    resetFields(null);
  };
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl",
      "aria-hidden": "true"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'ITP Form Updated!' : 'ITP Form Complete!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, isEditing ? 'Your changes have been saved.' : 'Inspection Test Plan has been recorded.'), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Start New ITP"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingPerson && /*#__PURE__*/React.createElement(SignaturePad, {
    name: signingPerson,
    onSave: data => {
      setField('builderSignature', data);
      setSigningPerson(null);
    },
    onCancel: () => setSigningPerson(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), " ITP Form"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm"
  }, "Page ", page, "/3")))), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl",
    "aria-hidden": "true"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this ITP form and save your changes"))), draftBanner && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-amber-800 font-semibold text-sm"
  }, "Unsaved Draft Found"), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-600 text-xs"
  }, draftBanner.ageMinutes < 60 ? draftBanner.ageMinutes + ' minutes ago' : Math.round(draftBanner.ageMinutes / 60) + ' hours ago'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setFields(draftBanner.data);
      setPage(2);
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold"
  }, "Restore"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      clearDraft();
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
  }, "Discard")))), page === 1 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-lg"
  }, "Title Page"), /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-200 text-sm"
  }, "Page 1/3")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "* Site Conducted"), /*#__PURE__*/React.createElement("select", {
    value: fields.siteConducted,
    onChange: e => setField('siteConducted', e.target.value),
    "aria-required": "true",
    className: "w-full border border-gray-300 rounded-lg p-3 bg-indigo-100 text-indigo-800 font-medium"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
    key: site,
    value: site
  }, site)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Conducted on"), /*#__PURE__*/React.createElement("input", {
    type: "datetime-local",
    value: fields.conductedOn,
    onChange: e => setField('conductedOn', e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-gray-100"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Prepared by"), /*#__PURE__*/React.createElement("select", {
    value: fields.preparedBy,
    onChange: e => setField('preparedBy', e.target.value),
    "aria-required": "true",
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Preparer"), preparers.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Location"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.location,
    onChange: e => setField('location', e.target.value),
    className: "flex-1 border border-gray-300 rounded-lg p-3",
    placeholder: "Enter location"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: getLocation,
    disabled: isLocating,
    "aria-label": "Get current location",
    className: "bg-indigo-500 text-white px-4 rounded-lg disabled:bg-indigo-300"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, isLocating ? '...' : '📍'))))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(2),
    disabled: !fields.siteConducted || !fields.preparedBy,
    className: "bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-300"
  }, "Next \u2192 Page 2/3"))), page === 2 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-lg"
  }, "ITP Form"), /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-200 text-sm"
  }, "Page 2/3")), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "* Pre-Construction Meeting completed with Builder : NAME",
    value: fields.preConstructionMeeting,
    onChange: v => setField('preConstructionMeeting', v),
    placeholder: "Tap to edit"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "High Risk Workshop Completed: (If Applicable)",
    value: fields.highRiskWorkshop,
    onChange: v => setField('highRiskWorkshop', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Shopdrawings Submitted to Builder and approved by Engineer",
    value: fields.shopdrawingsApproved,
    onChange: v => setField('shopdrawingsApproved', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All Items Above completed and Signed off",
    value: fields.allItemsSignedOff,
    onChange: v => setField('allItemsSignedOff', v)
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Procurement"
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Shopdrawing Revision for Glass Order",
    value: fields.shopdrawingRevision,
    onChange: v => setField('shopdrawingRevision', v)
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Ordered Glass from (Company Name)",
    value: fields.orderedGlassFrom,
    onChange: v => setField('orderedGlassFrom', v)
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Glass Specification",
    value: fields.glassSpecification,
    onChange: v => setField('glassSpecification', v)
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Installation of Glass",
    progress: "0/1 (0%)"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Glass free from damages and defects on edges",
    value: fields.glassFreeFromDamage,
    onChange: v => setField('glassFreeFromDamage', v)
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Specification of Fixings - Grout / Hilti HY270",
    value: fields.specificationOfFixings,
    onChange: v => setField('specificationOfFixings', v)
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Setout completed by - Surveyor or J&M Artsteel - Name/Company",
    value: fields.setoutCompletedBy,
    onChange: v => setField('setoutCompletedBy', v)
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Installation method - Plant Required",
    value: fields.installationMethod,
    onChange: v => setField('installationMethod', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Glass Installed with correct RL from builder and 1m from FFL Minimum",
    value: fields.glassInstalledCorrectRL,
    onChange: v => setField('glassInstalledCorrectRL', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All Glass Locked off, wedged and Glued for 24 hours minimum",
    value: fields.glassLockedWedgedGlued,
    onChange: v => setField('glassLockedWedgedGlued', v)
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Remove Wedges and Caulk gap if required",
    value: fields.removeWedgesCaulk,
    onChange: v => setField('removeWedgesCaulk', v)
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Installation of Handrails",
    progress: "0/2 (0%)"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Handrail Specification Confirmed and Shopdrawing Approved",
    value: fields.handrailSpecConfirmed,
    onChange: v => setField('handrailSpecConfirmed', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Install all spigots and threaded couplings hand tight for alignment",
    value: fields.spigotsCouplingsTight,
    onChange: v => setField('spigotsCouplingsTight', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Installation of handrail to compliant height as per shopdrawing and Architectural details",
    value: fields.handrailCompliantHeight,
    onChange: v => setField('handrailCompliantHeight', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Thread on all fixings / brackets, tack all tube together",
    value: fields.threadOnFixings,
    onChange: v => setField('threadOnFixings', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Full welding of all junctions of spigots, handrail joints and all coupling pieces tensioned",
    value: fields.fullWeldingJunctions,
    onChange: v => setField('fullWeldingJunctions', v)
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Handover and Finalisation of install",
    progress: "0/1 (0%)"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All glass installed to satisfactory finish with no defects or damages",
    value: fields.allGlassNoDefects,
    onChange: v => setField('allGlassNoDefects', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All Handrail installed to satisfactory finish with no defects or damages - All joints welded and polished",
    value: fields.allHandrailNoDefects,
    onChange: v => setField('allHandrailNoDefects', v)
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Balustrade system is installed as per design intent with correct RL heights",
    value: fields.balustradeAsPerDesign,
    onChange: v => setField('balustradeAsPerDesign', v)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(1),
    className: "border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium"
  }, "\u2190 Back Page 1/3"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(3),
    className: "bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium"
  }, "Next \u2192 Page 3/3"))), page === 3 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-lg"
  }, "Sign off Page"), /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-200 text-sm"
  }, "Page 3/3")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-medium"
  }, "Builder Signoff - Name / Signature"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.builderSignoffName,
    onChange: e => setField('builderSignoffName', e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3",
    placeholder: "Full name"
  }), fields.builderSignoffName && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Signature"), fields.builderSignature ? /*#__PURE__*/React.createElement("div", {
    className: "relative inline-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40"
  }, /*#__PURE__*/React.createElement("img", {
    src: fields.builderSignature,
    alt: "builder signature",
    className: "h-full w-full object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setField('builderSignature', null),
    "aria-label": "Clear signature",
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningPerson(fields.builderSignoffName),
    "aria-label": "Tap to sign as builder",
    className: "h-20 w-40 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-500 hover:border-indigo-500 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u270D\uFE0F"), " Tap to sign"))), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Comments and Notes"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mb-2 font-medium"
  }, "Items for Future correspondence or arisen issues during constructions"), /*#__PURE__*/React.createElement("textarea", {
    value: fields.futureCorrespondence,
    onChange: e => setField('futureCorrespondence', e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[100px]",
    placeholder: "Tap to edit"
  })), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4",
    role: "alert"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(2),
    className: "border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium"
  }, "\u2190 Back Page 2/3"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    className: "bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium"
  }, "Complete"))));
}

// Steel Inspection Test Plan View
window.ITPFormView = ITPFormView;

// === js/components/form-steel-itp.jsx ===
// SteelITPView Component
// Extracted from forms.jsx

const STEEL_ITP_DEFAULTS = {
  siteConducted: '',
  preparedBy: '',
  location: '',
  jobStructure: '',
  preConstMeeting: '',
  highRiskWorkshop: '',
  shopdrawingsApproved: '',
  allItemsSignedOff: '',
  materialsOrdered: '',
  materialsCorrect: '',
  visualCheck: '',
  shopdrawingsCurrent: '',
  setoutCorrect: '',
  tackWeld: '',
  fullyWelded: '',
  packLoad: '',
  finishConfirmed: '',
  deliveryBooked: '',
  sentToPainter: '',
  deliveryVehicle: '',
  afterDeliveryFinish: '',
  drawingsConfirmed: '',
  surveyorMeasurements: '',
  surveyorName: '',
  clashesDetected: '',
  chemicalAnchors: '',
  anchorsInstalled: '',
  levelPlumb: '',
  boltsTorqued: '',
  weldingCompleted: '',
  groutingCompleted: '',
  itemsChecked: '',
  finishAcceptable: '',
  fixingsTorqued: '',
  weldTestingBooked: '',
  testingIssues: '',
  weldsPassed: '',
  colourConfirmed: '',
  defectsChecked: '',
  handoverAccepted: '',
  managerName: '',
  managerSignature: null,
  builderName: '',
  builderSignature: null
};

/**
 * Structural Steel ITP form with multi-step wizard covering fabrication, surface finish, installation, anchoring, weld testing, and handover.
 * @param {Object} props
 * @param {Function} props.onSubmit - Called with form data when creating a new form
 * @param {Function} props.onUpdate - Called with form data when updating an existing form
 * @param {Object|null} props.editingForm - Existing form data when editing, null when creating
 * @param {Array} [props.sites=[]] - Available site names for the site selector
 */
function SteelITPView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const {
    fields,
    setField,
    setFields,
    resetFields
  } = useFormState(STEEL_ITP_DEFAULTS, editingForm);

  // Auto-save drafts every 30 seconds (only for new forms, not edits)
  const {
    loadDraft,
    clearDraft
  } = useAutoSave(isEditing ? null : 'steel-itp', fields, 30000);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [signingManager, setSigningManager] = useState(false);
  const [signingBuilder, setSigningBuilder] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [draftBanner, setDraftBanner] = useState(null);
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const sitesList = (sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string');
  useEffect(() => {
    setStep(1);
    setSubmitted(false);
    setSigningManager(false);
    setSigningBuilder(false);
    setValidationErrors([]);
  }, [editingForm?.id]);

  // Check for saved draft on mount
  useEffect(() => {
    if (!isEditing) {
      var draft = loadDraft();
      if (draft) {
        setDraftBanner(draft);
      }
    }
  }, []);
  const SelectField = ({
    label,
    value,
    onChange
  }) => /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2",
    role: "group",
    "aria-label": label
  }, ['Yes', 'No', 'N/A'].map(opt => /*#__PURE__*/React.createElement("button", {
    key: opt,
    onClick: () => onChange(opt),
    "aria-pressed": value === opt,
    className: `flex-1 p-2 rounded-lg border text-sm font-medium ${value === opt ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300'}`
  }, opt))));
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateSteelITP({
        siteConducted: fields.siteConducted,
        preparedBy: fields.preparedBy,
        managerName: fields.managerName,
        managerSignature: fields.managerSignature
      });
    } else {
      if (!fields.siteConducted) errors.push('Site/Location is required');
      if (!fields.preparedBy) errors.push('Prepared by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const data = {
      ...fields,
      submittedAt: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'steel-itp', data);
    } else {
      clearDraft();
      onSubmit(data);
      setSubmitted(true);
    }
  };
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-green-500 text-white p-6 rounded-xl text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-6xl mb-4",
      "aria-hidden": "true"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold"
    }, isEditing ? 'Steel ITP Updated!' : 'Steel ITP Submitted!')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setSubmitted(false);
        setStep(1);
        resetFields(null);
        setValidationErrors([]);
      },
      className: "w-full bg-orange-600 text-white p-4 rounded-xl font-semibold"
    }, "Start New Steel ITP"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingManager && /*#__PURE__*/React.createElement(SignaturePad, {
    name: fields.managerName,
    onSave: sig => {
      setField('managerSignature', sig);
      setSigningManager(false);
    },
    onCancel: () => setSigningManager(false)
  }), signingBuilder && /*#__PURE__*/React.createElement(SignaturePad, {
    name: fields.builderName,
    onSave: sig => {
      setField('builderSignature', sig);
      setSigningBuilder(false);
    },
    onCancel: () => setSigningBuilder(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4 rounded-xl"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD29"), " Steel Inspection Test Plan"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm opacity-90 mt-1"
  }, "J&M ArtSteel"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2"
  }, todayDate)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, [1, 2, 3, 4, 5, 6, 7, 8].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    className: `flex-1 h-2 rounded ${step >= s ? 'bg-orange-500' : 'bg-gray-200'}`
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center",
    "aria-label": `Step ${step} of 8`
  }, "Step ", step, " of 8"), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl",
    "aria-hidden": "true"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this Steel ITP and save your changes"))), draftBanner && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600 text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-amber-800 font-semibold text-sm"
  }, "Unsaved Draft Found"), /*#__PURE__*/React.createElement("p", {
    className: "text-amber-600 text-xs"
  }, draftBanner.ageMinutes < 60 ? draftBanner.ageMinutes + ' minutes ago' : Math.round(draftBanner.ageMinutes / 60) + ' hours ago'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setFields(draftBanner.data);
      setStep(2);
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold"
  }, "Restore"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      clearDraft();
      setDraftBanner(null);
    },
    className: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
  }, "Discard")))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Basic Information"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
    value: fields.siteConducted,
    onChange: e => setField('siteConducted', e.target.value),
    "aria-required": "true",
    className: "w-full p-3 border rounded-lg"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select site"), sitesList.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Prepared By"), /*#__PURE__*/React.createElement("select", {
    value: fields.preparedBy,
    onChange: e => setField('preparedBy', e.target.value),
    className: "w-full p-3 border rounded-lg bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select person"), /*#__PURE__*/React.createElement("option", {
    value: "Jeff Fu"
  }, "Jeff Fu"), /*#__PURE__*/React.createElement("option", {
    value: "Scott Seeho"
  }, "Scott Seeho"), /*#__PURE__*/React.createElement("option", {
    value: "Davide Casolini"
  }, "Davide Casolini"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Location"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.location,
    onChange: e => setField('location', e.target.value),
    placeholder: "Enter location",
    className: "w-full p-3 border rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Job / Structure ITP carried out on"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.jobStructure,
    onChange: e => setField('jobStructure', e.target.value),
    placeholder: "Enter job details",
    className: "w-full p-3 border rounded-lg"
  }))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Items"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Pre-Construction Meeting Completed with Builder",
    value: fields.preConstMeeting,
    onChange: v => setField('preConstMeeting', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Structural Steel High Risk Workshop Completed",
    value: fields.highRiskWorkshop,
    onChange: v => setField('highRiskWorkshop', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Shopdrawings Submitted and Approved by Engineer",
    value: fields.shopdrawingsApproved,
    onChange: v => setField('shopdrawingsApproved', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "All Above items completed and Signed off",
    value: fields.allItemsSignedOff,
    onChange: v => setField('allItemsSignedOff', v)
  })), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Fabrication"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Materials Ordered as Per shopdrawings",
    value: fields.materialsOrdered,
    onChange: v => setField('materialsOrdered', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Materials on delivery are correct",
    value: fields.materialsCorrect,
    onChange: v => setField('materialsCorrect', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Visual Check Materials in good condition",
    value: fields.visualCheck,
    onChange: v => setField('visualCheck', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Shopdrawings are current revision",
    value: fields.shopdrawingsCurrent,
    onChange: v => setField('shopdrawingsCurrent', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Setout cleats, plates, members correct",
    value: fields.setoutCorrect,
    onChange: v => setField('setoutCorrect', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Tack weld, check straight and plumb",
    value: fields.tackWeld,
    onChange: v => setField('tackWeld', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Fully weld as per engineer specifications",
    value: fields.fullyWelded,
    onChange: v => setField('fullyWelded', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Pack and load materials for transport",
    value: fields.packLoad,
    onChange: v => setField('packLoad', v)
  })), step === 4 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Specialised Finishes"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Confirm finish of steel and approved"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.finishConfirmed,
    onChange: e => setField('finishConfirmed', e.target.value),
    placeholder: "Enter finish type",
    className: "w-full p-3 border rounded-lg"
  })), /*#__PURE__*/React.createElement(SelectField, {
    label: "Book delivery to site/workshop",
    value: fields.deliveryBooked,
    onChange: v => setField('deliveryBooked', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Send material to painter/abrasive blaster",
    value: fields.sentToPainter,
    onChange: v => setField('sentToPainter', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Correct Delivery vehicle and sizes confirmed",
    value: fields.deliveryVehicle,
    onChange: v => setField('deliveryVehicle', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "After delivery finish is acceptable",
    value: fields.afterDeliveryFinish,
    onChange: v => setField('afterDeliveryFinish', v)
  })), step === 5 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Site Setout & Installation"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Confirm correct drawings with builder",
    value: fields.drawingsConfirmed,
    onChange: v => setField('drawingsConfirmed', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Surveyor has correct measurements",
    value: fields.surveyorMeasurements,
    onChange: v => setField('surveyorMeasurements', v)
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Surveyor Name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.surveyorName,
    onChange: e => setField('surveyorName', e.target.value),
    placeholder: "Enter surveyor name",
    className: "w-full p-3 border rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Clashes detected / issues"), /*#__PURE__*/React.createElement("textarea", {
    value: fields.clashesDetected,
    onChange: e => setField('clashesDetected', e.target.value),
    placeholder: "Describe any issues",
    className: "w-full p-3 border rounded-lg",
    rows: 3
  })), /*#__PURE__*/React.createElement(SelectField, {
    label: "Chemical anchors correct as per specs",
    value: fields.chemicalAnchors,
    onChange: v => setField('chemicalAnchors', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Anchors installed correctly",
    value: fields.anchorsInstalled,
    onChange: v => setField('anchorsInstalled', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Steel checked for level and plumbness",
    value: fields.levelPlumb,
    onChange: v => setField('levelPlumb', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Bolts and nuts tightened/torqued",
    value: fields.boltsTorqued,
    onChange: v => setField('boltsTorqued', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Welding completed to engineering specs",
    value: fields.weldingCompleted,
    onChange: v => setField('weldingCompleted', v)
  })), step === 6 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Grouting & Final Inspection"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Grouting completed to all steel members",
    value: fields.groutingCompleted,
    onChange: v => setField('groutingCompleted', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "All installed items checked as per drawings",
    value: fields.itemsChecked,
    onChange: v => setField('itemsChecked', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Finish in good condition (touch ups done)",
    value: fields.finishAcceptable,
    onChange: v => setField('finishAcceptable', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "All fixings torqued at correct lengths",
    value: fields.fixingsTorqued,
    onChange: v => setField('fixingsTorqued', v)
  })), step === 7 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "NDT & Handover"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Weld Testing booked and confirmed",
    value: fields.weldTestingBooked,
    onChange: v => setField('weldTestingBooked', v)
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Any issues with Testing?"), /*#__PURE__*/React.createElement("textarea", {
    value: fields.testingIssues,
    onChange: e => setField('testingIssues', e.target.value),
    placeholder: "Describe issues",
    className: "w-full p-3 border rounded-lg",
    rows: 2
  })), /*#__PURE__*/React.createElement(SelectField, {
    label: "All welds tested have passed compliance",
    value: fields.weldsPassed,
    onChange: v => setField('weldsPassed', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Colour/finish confirmed by builder",
    value: fields.colourConfirmed,
    onChange: v => setField('colourConfirmed', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Builder checked for defects",
    value: fields.defectsChecked,
    onChange: v => setField('defectsChecked', v)
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Builder accepted handover (defect free)",
    value: fields.handoverAccepted,
    onChange: v => setField('handoverAccepted', v)
  })), step === 8 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Sign-offs"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-700 mb-3"
  }, "Manager Completing ITP"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.managerName,
    onChange: e => setField('managerName', e.target.value),
    placeholder: "Manager name",
    className: "w-full p-3 border rounded-lg mb-3"
  }), fields.managerSignature ? /*#__PURE__*/React.createElement("div", {
    className: "border rounded-lg p-2 bg-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-1"
  }, "Signature:"), /*#__PURE__*/React.createElement("img", {
    src: fields.managerSignature,
    alt: "Manager signature",
    className: "h-16"
  })) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningManager(true),
    disabled: !fields.managerName,
    "aria-label": "Open signature pad for manager",
    className: `w-full p-3 rounded-lg font-semibold ${fields.managerName ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u270D\uFE0F"), " Sign")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-700 mb-3"
  }, "Builder Signoff"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: fields.builderName,
    onChange: e => setField('builderName', e.target.value),
    placeholder: "Builder name",
    className: "w-full p-3 border rounded-lg mb-3"
  }), fields.builderSignature ? /*#__PURE__*/React.createElement("div", {
    className: "border rounded-lg p-2 bg-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-1"
  }, "Signature:"), /*#__PURE__*/React.createElement("img", {
    src: fields.builderSignature,
    alt: "Builder signature",
    className: "h-16"
  })) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningBuilder(true),
    disabled: !fields.builderName,
    "aria-label": "Open signature pad for builder",
    className: `w-full p-3 rounded-lg font-semibold ${fields.builderName ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u270D\uFE0F"), " Sign"))), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4",
    role: "alert"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, step > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(step - 1),
    className: "flex-1 bg-gray-200 p-4 rounded-xl font-semibold"
  }, "\u2190 Previous"), step < 8 ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(step + 1),
    className: "flex-1 bg-orange-600 text-white p-4 rounded-xl font-semibold"
  }, "Next \u2192") : /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: !fields.managerSignature,
    className: `flex-1 p-4 rounded-xl font-semibold ${fields.managerSignature ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "Submit Steel ITP \u2713")));
}

// Emergency View

// Export to window for cross-file access
window.SteelITPView = SteelITPView;

// === js/components/view-emergency.jsx ===
// EmergencyView Component
// Extracted from views.jsx

// Other views: Emergency, Settings, Recordings
// Extracted from index.html

/**
 * Displays emergency contact numbers (000, SafeWork NSW, Poisons Info) with tap-to-call links.
 * No props required.
 */
function EmergencyView() {
  const contacts = [{
    name: 'Emergency Services',
    number: '000',
    desc: 'Police, Fire, Ambulance'
  }, {
    name: 'SafeWork NSW',
    number: '13 10 50',
    desc: 'Report serious incidents'
  }, {
    name: 'Poisons Information',
    number: '13 11 26',
    desc: '24/7 advice'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCDE"), " Emergency Information"), /*#__PURE__*/React.createElement("p", {
    className: "text-red-100 text-sm mt-1"
  }, "Keep this information accessible")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm divide-y"
  }, contacts.map(contact => /*#__PURE__*/React.createElement("a", {
    key: contact.name,
    href: `tel:${contact.number.replace(/\s/g, '')}`,
    "aria-label": `Call ${contact.name} at ${contact.number}`,
    className: "p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-800"
  }, contact.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, contact.desc)), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg text-red-600"
  }, contact.number)))));
}
window.EmergencyView = EmergencyView;

// === js/components/view-settings.jsx ===
// SettingsView Component
// Extracted from views.jsx

// ========================================
// SYSTEM HEALTH CARD
// Shows error telemetry status in Settings
// ========================================
/**
 * Displays ErrorTelemetry health status (healthy/degraded/critical) with expandable error log.
 * No props required. Reads health data from the global ErrorTelemetry singleton.
 */
function SystemHealthCard() {
  const [health, setHealth] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [errors, setErrors] = useState([]);
  useEffect(() => {
    function refresh() {
      if (typeof ErrorTelemetry !== 'undefined') {
        setHealth(ErrorTelemetry.getHealth());
        if (showLog) {
          setErrors(ErrorTelemetry.getRecentErrors(20));
        }
      }
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [showLog]);
  if (typeof ErrorTelemetry === 'undefined') return null;
  if (!health) return null;
  const statusColors = {
    healthy: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'Healthy'
    },
    degraded: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500',
      label: 'Degraded'
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Critical'
    }
  };
  const s = statusColors[health.status] || statusColors.healthy;
  const tel = health.telemetry;
  const cb = tel ? tel.circuitBreaker : null;
  const retries = tel ? tel.retryMetrics : null;
  const cats = health.categories;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-bold text-gray-800"
  }, "System Health"), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.border} border ${s.text}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-2 h-2 rounded-full ${s.dot} mr-1.5`,
    "aria-hidden": "true"
  }), s.label)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Errors (last hr)"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, health.errorsLastHour)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Total captured"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, health.totalErrors)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Sync queue"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, health.syncQueueSize)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Circuit breaker"), /*#__PURE__*/React.createElement("p", {
    className: `text-lg font-bold capitalize ${health.circuitBreakerState === 'open' ? 'text-red-600' : 'text-gray-800'}`
  }, health.circuitBreakerState || 'closed'))), health.lastSyncTime && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mb-2"
  }, "Last sync: ", new Date(health.lastSyncTime).toLocaleTimeString()), cb && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowTelemetry(!showTelemetry),
    "aria-expanded": showTelemetry,
    className: "w-full py-2 text-sm text-blue-600 font-medium rounded-lg bg-blue-50 active:bg-blue-100 mb-2"
  }, showTelemetry ? 'Hide Telemetry' : 'Circuit Breaker Telemetry'), showTelemetry && /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3 space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-600 mb-1"
  }, "Circuit Breaker"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, cb.tripCount), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Trips")), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, cb.totalDowntimeSec, "s"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Downtime")), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, cb.recoveryRate, "%"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Recovery")))), retries && retries.totalRetries > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-600 mb-1"
  }, "Retry Metrics"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Total retries: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-gray-800"
  }, retries.totalRetries)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Dropped items: ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-red-600"
  }, retries.droppedItems))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 mt-1"
  }, Object.entries(retries.byCategory).filter(([, v]) => v > 0).map(([cat, count]) => /*#__PURE__*/React.createElement("span", {
    key: cat,
    className: "inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700"
  }, cat, ": ", count)))), cats && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-600 mb-1"
  }, "Error Categories"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1"
  }, Object.entries(cats).filter(([, v]) => v > 0).map(([cat, count]) => /*#__PURE__*/React.createElement("span", {
    key: cat,
    className: "inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700"
  }, cat, ": ", count)), health.dedupCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700"
  }, "deduped: ", health.dedupCount))), cb.history && cb.history.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-gray-600 mb-1"
  }, "Recent Trips"), cb.history.map((trip, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "text-xs text-gray-500 flex justify-between py-0.5"
  }, /*#__PURE__*/React.createElement("span", null, new Date(trip.openedAt).toLocaleTimeString(), " \u2014 ", trip.reason), /*#__PURE__*/React.createElement("span", null, trip.durationMs ? Math.round(trip.durationMs / 1000) + 's' : 'open', trip.recovery ? ' (' + trip.recovery + ')' : '')))), health.circuitBreakerState === 'open' && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (typeof FirebaseSync !== 'undefined') FirebaseSync.resetCircuitBreaker();
    },
    className: "w-full py-2 text-sm text-white font-medium rounded-lg bg-red-600 active:bg-red-700"
  }, "Reset Circuit Breaker"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowLog(!showLog);
      if (!showLog) setErrors(ErrorTelemetry.getRecentErrors(20));
    },
    "aria-expanded": showLog,
    className: "w-full py-2 text-sm text-orange-600 font-medium rounded-lg bg-orange-50 active:bg-orange-100"
  }, showLog ? 'Hide Error Log' : 'View Error Log'), showLog && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 max-h-64 overflow-y-auto"
  }, errors.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-400 text-center py-3"
  }, "No errors recorded") : errors.map((err, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "border-b border-gray-100 py-2 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-red-600 flex-1"
  }, err.message || err.msg || 'Unknown error'), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400 ml-2 whitespace-nowrap"
  }, err.timestamp ? new Date(err.timestamp).toLocaleTimeString() : '')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mt-0.5"
  }, err.context && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400"
  }, err.context), err.category && /*#__PURE__*/React.createElement("span", {
    className: "text-xs px-1.5 py-0 rounded bg-gray-100 text-gray-500"
  }, err.category))))));
}

/**
 * Settings page with Google Drive connection, site management, team signatures, device admin, storage info, and system health.
 * @param {Object} props
 * @param {Array} [props.sites=[]] - List of site name strings
 * @param {Function} props.onUpdateSites - Callback to persist updated sites array
 * @param {Object} [props.signatures={}] - Map of team member names to signature data URIs
 * @param {Function} props.onUpdateSignatures - Callback to persist updated signatures object
 * @param {boolean} [props.isAdmin=false] - Whether the current user has full admin privileges
 * @param {boolean} [props.isDeviceAdmin=false] - Whether the current device is a device admin
 * @param {boolean} [props.canViewDevices=false] - Whether the current user can view connected devices
 * @param {boolean} [props.canRevokeDevices=false] - Whether the current user can revoke device access
 * @param {Array} [props.pendingDevices=[]] - Devices awaiting approval
 * @param {Array} [props.approvedDevices=[]] - Devices already approved
 */
function SettingsView({
  sites = [],
  onUpdateSites,
  signatures = {},
  onUpdateSignatures,
  isAdmin = false,
  isDeviceAdmin = false,
  canViewDevices = false,
  canRevokeDevices = false,
  pendingDevices = [],
  approvedDevices = []
}) {
  const [newSite, setNewSite] = useState('');
  const [showAddSite, setShowAddSite] = useState(false);
  const [driveConnected, setDriveConnected] = useState(GoogleDriveSync.isConnected());
  const [driveError, setDriveError] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(null); // Name of person to sign
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [devices, setDevices] = useState({
    pending: [],
    approved: [],
    denied: []
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [deviceActionLoading, setDeviceActionLoading] = useState(null);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editingDeviceName, setEditingDeviceName] = useState('');
  const [storageInfo, setStorageInfo] = useState(null);
  const [fixStatus, setFixStatus] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const [fixDone, setFixDone] = useState(false);
  const currentSites = sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites;

  // Listen to device changes if admin, viewer, or has revoke permission
  useEffect(() => {
    if ((isAdmin || canViewDevices || canRevokeDevices) && isFirebaseConfigured) {
      const unsubscribe = DeviceAuthManager.listenToDevices(deviceData => {
        setDevices(deviceData);
        setPendingCount(deviceData.pending.length);
      });
      return () => unsubscribe();
    }
  }, [isAdmin, canViewDevices, canRevokeDevices]);

  // Listen for Google Drive connection status changes (real-time, no timeout)
  useEffect(() => {
    const handleDriveChange = (connected, error) => {
      setDriveConnected(connected);
      if (error) {
        setDriveError(error);
      } else {
        setDriveError('');
      }
    };
    GoogleDriveSync.onConnectionChange(handleDriveChange);
    // No cleanup needed — callbacks list is on the singleton
  }, []);
  const handleApproveDevice = async deviceId => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.approveDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      ToastNotifier.error('Failed to approve device');
    }
  };
  const handleDenyDevice = async deviceId => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.denyDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      ToastNotifier.error('Failed to deny device');
    }
  };
  const handleRevokeDevice = async deviceId => {
    if (await ConfirmDialog.show('Are you sure you want to revoke access for this device?', { title: 'Revoke Device', confirmLabel: 'Revoke', destructive: true })) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuth.revokeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        ToastNotifier.error('Failed to revoke device');
      }
    }
  };
  const handleRemoveDevice = async deviceId => {
    if (await ConfirmDialog.show('Are you sure you want to remove this device?', { title: 'Remove Device', confirmLabel: 'Remove', destructive: true })) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuthManager.removeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        ToastNotifier.error('Failed to remove device');
      }
    }
  };
  const handleStartRename = device => {
    setEditingDeviceId(device.id);
    setEditingDeviceName(device.name || '');
  };
  const handleSaveRename = async deviceId => {
    if (!editingDeviceName.trim()) {
      ToastNotifier.warning('Device name cannot be empty');
      return;
    }
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.renameDevice(deviceId, editingDeviceName);
    setDeviceActionLoading(null);
    setEditingDeviceId(null);
    setEditingDeviceName('');
    if (!success) {
      ToastNotifier.error('Failed to rename device');
    }
  };
  const handleCancelRename = () => {
    setEditingDeviceId(null);
    setEditingDeviceName('');
  };

  // Default team members from shared constants
  const defaultMembers = FORM_CONSTANTS.teamMembers;
  // Get all members (default + any custom added via signatures)
  const allMembers = [...new Set([...defaultMembers, ...Object.keys(signatures).filter(name => !defaultMembers.includes(name))])];
  const saveSignature = (name, signatureData) => {
    const newSignatures = {
      ...signatures,
      [name]: signatureData
    };
    onUpdateSignatures(newSignatures);
    setShowSignaturePad(null);
  };
  const deleteSignature = name => {
    const newSignatures = {
      ...signatures
    };
    delete newSignatures[name];
    onUpdateSignatures(newSignatures);
  };
  const addNewMember = () => {
    if (newMemberName.trim() && !allMembers.includes(newMemberName.trim())) {
      // Add member with empty signature (will show "Add Signature" button)
      const newSignatures = {
        ...signatures,
        [newMemberName.trim()]: null
      };
      onUpdateSignatures(newSignatures);
      setNewMemberName('');
      setShowAddMember(false);
    }
  };
  const deleteMember = name => {
    // Only allow deleting custom members (not in defaultMembers)
    if (!defaultMembers.includes(name)) {
      const newSignatures = {
        ...signatures
      };
      delete newSignatures[name];
      onUpdateSignatures(newSignatures);
    }
  };
  const addSite = () => {
    const trimmed = newSite.trim();
    if (trimmed) {
      const isDuplicate = currentSites.some(s => s.toLowerCase() === trimmed.toLowerCase());
      if (isDuplicate) {
        ToastNotifier.warning('This site already exists');
        return;
      }
      onUpdateSites([...currentSites, trimmed]);
      setNewSite('');
      setShowAddSite(false);
    }
  };
  const connectDrive = () => {
    setDriveError('');
    GoogleDriveSync.authorize();
    // Status updates come via onConnectionChange callback — no timeout needed
  };
  const disconnectDrive = () => {
    GoogleDriveSync.disconnect();
    setDriveConnected(false);
  };
  const backupNow = async () => {
    setIsBackingUp(true);
    setBackupStatus('Backing up...');
    try {
      const formsJson = localStorage.getItem(STORAGE_KEYS.FORMS);
      if (!formsJson) {
        setBackupStatus('No forms to backup');
        setIsBackingUp(false);
        return;
      }
      const forms = JSON.parse(formsJson);
      const result = await GoogleDriveSync.uploadDailyForms(forms);
      if (result.success) {
        setBackupStatus(`✅ Backed up ${result.uploaded} forms to Google Drive!`);
      } else {
        setBackupStatus('❌ Backup failed: ' + result.error);
      }
    } catch (error) {
      setBackupStatus('❌ Backup error: ' + error.message);
    }
    setIsBackingUp(false);
  };

  // --- Storage & Fix Everything ---
  const getStorageInfo = () => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key);
      total += val ? val.length * 2 : 0;
    }
    const totalMB = (total / 1024 / 1024).toFixed(2);
    const pct = Math.min(Math.round(total / (5 * 1024 * 1024) * 100), 100);
    return {
      totalBytes: total,
      totalMB: totalMB,
      pct: pct
    };
  };
  useEffect(() => {
    setStorageInfo(getStorageInfo());
  }, []);
  const doFixEverything = async () => {
    if (!await ConfirmDialog.show('This will strip photos from local cache and clear temp data.\n\nYour forms and credentials are preserved.\nPhotos are safe in Firebase & Drive.\n\nContinue?', { title: 'Clear Cache', confirmLabel: 'Continue' })) return;
    setIsFixing(true);
    setFixDone(false);
    setFixStatus('Starting...');
    const steps = [];
    const beforeInfo = getStorageInfo();
    try {
      // 1. Delete ALL browser caches
      setFixStatus('Step 1/6: Clearing caches...');
      const cacheNames = await caches.keys();
      for (let i = 0; i < cacheNames.length; i++) {
        await caches.delete(cacheNames[i]);
      }
      steps.push('Deleted ' + cacheNames.length + ' cache(s)');

      // 2. Strip base64 photos from forms (the #1 storage bomb)
      setFixStatus('Step 2/6: Stripping photos from forms...');
      let strippedCount = 0;
      try {
        const formsRaw = localStorage.getItem(STORAGE_KEYS.FORMS);
        if (formsRaw && formsRaw.length > 10000) {
          const forms = JSON.parse(formsRaw);
          let stripped = JSON.parse(JSON.stringify(forms, function (key, value) {
            if (typeof value !== 'string') return value;
            if (value.length > 500 && (value.indexOf('data:') === 0 || value.indexOf('/9j/') === 0 || value.indexOf('iVBOR') === 0 || value.indexOf('JVBER') === 0)) {
              strippedCount++;
              return '[in-firebase]';
            }
            if (value.length > 5000) return value.substring(0, 200) + '...[truncated]';
            return value;
          }));
          stripped.sort(function (a, b) {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
          if (stripped.length > 50) stripped = stripped.slice(0, 50);
          localStorage.setItem(STORAGE_KEYS.FORMS, JSON.stringify(stripped));
          steps.push('Stripped ' + strippedCount + ' photos, kept ' + stripped.length + ' forms');
        } else {
          steps.push('Forms already small');
        }
      } catch (e) {
        steps.push('Forms error: ' + e.message);
      }

      // 3. Clear sync queue, audit log, photo queue, recordings
      setFixStatus('Step 3/6: Clearing sync queue & temp data...');
      let nuked = 0;
      [STORAGE_KEYS.SYNC_QUEUE, STORAGE_KEYS.AUDIT_LOG, STORAGE_KEYS.PHOTO_QUEUE, STORAGE_KEYS.JOB_RECORDINGS, STORAGE_KEYS.BACKED_UP_FORMS, STORAGE_KEYS.TEAM_SIGNATURES].forEach(function (k) {
        try {
          if (localStorage.getItem(k)) {
            localStorage.removeItem(k);
            nuked++;
          }
        } catch (e) {}
      });
      steps.push('Cleared ' + nuked + ' data store(s)');

      // 4. Clear temp/cache/draft/backup keys
      setFixStatus('Step 4/6: Removing temp keys...');
      const tempKeys = [];
      for (let j = localStorage.length - 1; j >= 0; j--) {
        const lsKey = localStorage.key(j);
        if (lsKey && (lsKey.includes('temp') || lsKey.includes('cache') || lsKey.includes('draft') || lsKey.includes('cdn-retry') || lsKey.includes('backup'))) {
          tempKeys.push(lsKey);
        }
      }
      tempKeys.forEach(function (k) {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      });
      steps.push('Removed ' + tempKeys.length + ' temp key(s)');

      // 5. Clear session storage
      setFixStatus('Step 5/6: Clearing session data...');
      sessionStorage.clear();
      steps.push('Session cleared');

      // 6. Reset Firebase connection state
      setFixStatus('Step 6/6: Resetting Firebase connection...');
      try {
        localStorage.removeItem('firebase:previous_websocket_failure');
      } catch (e) {}
      steps.push('Firebase connection reset');

      // Done
      const afterInfo = getStorageInfo();
      const freedMB = (parseFloat(beforeInfo.totalMB) - parseFloat(afterInfo.totalMB)).toFixed(2);
      setStorageInfo(afterInfo);
      setFixStatus('Freed ' + freedMB + ' MB (' + beforeInfo.totalMB + ' MB \u2192 ' + afterInfo.totalMB + ' MB). ' + steps.join('. '));
      setFixDone(true);
    } catch (e) {
      setFixStatus('Error: ' + e.message + '. Steps done: ' + steps.join(', '));
    }
    setIsFixing(false);
  };
  const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2699\uFE0F"), " Settings"), isDeviceAdmin && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-600 mt-1"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDEE1\uFE0F"), " Admin Mode - You can manage device access")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDD10"), " This Device"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3 space-y-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500"
  }, "Type:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, DeviceAuth.deviceInfo?.type)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500"
  }, "Browser:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, DeviceAuth.deviceInfo?.browser)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500"
  }, "Screen:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, DeviceAuth.deviceInfo?.screen)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mt-2"
  }, "Device ID: ", DeviceAuth.deviceId))), (isAdmin || canViewDevices || canRevokeDevices) && isFirebaseConfigured && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCF1"), " Connected Devices", isAdmin && pendingCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"
  }, pendingCount, " pending"), !isAdmin && !canRevokeDevices && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400"
  }, "(View only)")), devices.pending.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-yellow-700 mb-2"
  }, "\u23F3 Pending Approval (", devices.pending.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, devices.pending.map(device => /*#__PURE__*/React.createElement("div", {
    key: device.id,
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, editingDeviceId === device.id ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingDeviceName,
    onChange: e => setEditingDeviceName(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleSaveRename(device.id);
      if (e.key === 'Escape') handleCancelRename();
    },
    className: "border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0",
    autoFocus: true,
    maxLength: 30
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSaveRename(device.id),
    className: "text-green-600 text-sm font-medium px-2",
    disabled: deviceActionLoading === device.id
  }, deviceActionLoading === device.id ? '...' : '✓'), /*#__PURE__*/React.createElement("button", {
    onClick: handleCancelRename,
    className: "text-gray-400 text-sm font-medium px-1"
  }, "\u2715")) : /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-800 flex items-center gap-2"
  }, device.name || 'Unknown Device', isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleStartRename(device),
    className: "text-gray-400 hover:text-gray-600 text-xs ml-1",
    title: "Rename device"
  }, "\u270F\uFE0F")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Requested: ", new Date(device.registeredAt).toLocaleDateString('en-AU'))), isAdmin && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleApproveDevice(device.id),
    className: "bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
  }, "\u2713 Approve"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDenyDevice(device.id),
    className: "bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
  }, "\u2715 Deny"))))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-green-700 mb-2"
  }, "\u2713 Approved Devices (", devices.approved.length, ")"), devices.approved.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "No approved devices yet") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, devices.approved.map(device => /*#__PURE__*/React.createElement("div", {
    key: device.id,
    className: "bg-green-50 border border-green-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, editingDeviceId === device.id ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingDeviceName,
    onChange: e => setEditingDeviceName(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleSaveRename(device.id);
      if (e.key === 'Escape') handleCancelRename();
    },
    className: "border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0",
    autoFocus: true,
    maxLength: 30
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSaveRename(device.id),
    className: "text-green-600 text-sm font-medium px-2",
    disabled: deviceActionLoading === device.id
  }, deviceActionLoading === device.id ? '...' : '✓'), /*#__PURE__*/React.createElement("button", {
    onClick: handleCancelRename,
    className: "text-gray-400 text-sm font-medium px-1"
  }, "\u2715")) : /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-800 flex items-center gap-2"
  }, device.name || 'Unknown Device', device.isAdmin && /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-orange-500 text-white px-2 py-0.5 rounded"
  }, "Admin"), device.canViewDevices && !device.isAdmin && /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-blue-500 text-white px-2 py-0.5 rounded"
  }, "Viewer"), isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleStartRename(device),
    className: "text-gray-400 hover:text-gray-600 text-xs ml-1",
    title: "Rename device"
  }, "\u270F\uFE0F")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Last seen: ", device.lastSeen ? new Date(device.lastSeen).toLocaleString('en-AU') : 'Never')), isAdmin && !device.isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveDevice(device.id),
    className: "text-red-500 text-sm ml-2"
  }, "\uD83D\uDDD1\uFE0F")))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Your Device ID: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, DeviceAuthManager.deviceId)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCC1"), " Google Drive Backup"), !isGoogleDriveConfigured ? /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-yellow-800 font-medium"
  }, "\u26A0\uFE0F Google Drive not configured"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-yellow-700 mt-1"
  }, "Contact your admin to set up Google Drive integration")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-3 h-3 rounded-full ${driveConnected ? 'bg-green-500' : 'bg-gray-300'}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-600"
  }, driveConnected ? 'Connected' : 'Not connected')), driveConnected ? /*#__PURE__*/React.createElement("button", {
    onClick: disconnectDrive,
    className: "text-red-600 text-sm underline"
  }, "Disconnect") : /*#__PURE__*/React.createElement("button", {
    onClick: connectDrive,
    className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
  }, "Connect Google Drive")), driveError && !driveConnected && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-lg p-2 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-700"
  }, "\u274C ", driveError)), driveConnected && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Auto-backup:"), " Every day at 7:00 PM"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Folder:"), " ", DRIVE_FOLDER_NAME), lastBackup && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Last backup:"), " ", lastBackup)), /*#__PURE__*/React.createElement("button", {
    onClick: backupNow,
    disabled: isBackingUp,
    className: `w-full py-3 rounded-lg text-white font-medium ${isBackingUp ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`
  }, isBackingUp ? '⏳ Backing up...' : '☁️ Backup Now'), backupStatus && /*#__PURE__*/React.createElement("p", {
    className: `text-sm mt-2 text-center ${backupStatus.includes('✅') ? 'text-green-600' : backupStatus.includes('❌') ? 'text-red-600' : 'text-gray-600'}`
  }, backupStatus)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "\uD83C\uDFD7\uFE0F Sites"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddSite(!showAddSite),
    className: "bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
  }, "+ Add Site")), showAddSite && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newSite,
    onChange: e => setNewSite(e.target.value),
    className: "flex-1 border rounded-lg p-2 text-sm",
    placeholder: "Enter site name"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addSite,
    className: "bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
  }, "Add")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, currentSites.map(site => /*#__PURE__*/React.createElement("div", {
    key: site,
    className: "flex items-center justify-between p-2 bg-gray-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, site), /*#__PURE__*/React.createElement("button", {
    onClick: () => onUpdateSites(currentSites.filter(s => s !== site)),
    className: "text-red-500"
  }, "\uD83D\uDDD1\uFE0F"))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "\u270D\uFE0F Team Signatures"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddMember(!showAddMember),
    className: "bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
  }, "+ Add Member")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-3"
  }, "Save signatures once and use them automatically in all forms"), showAddMember && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newMemberName,
    onChange: e => setNewMemberName(e.target.value),
    className: "flex-1 border rounded-lg p-2 text-sm",
    placeholder: "Enter team member name"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addNewMember,
    className: "bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
  }, "Add")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, allMembers.map(name => /*#__PURE__*/React.createElement("div", {
    key: name,
    className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, name), signatures[name] ? /*#__PURE__*/React.createElement("img", {
    src: signatures[name],
    alt: `${name}'s signature`,
    className: "h-8 border rounded bg-white px-2"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400 italic"
  }, "No signature saved")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSignaturePad(name),
    className: `px-3 py-1 rounded-lg text-sm ${signatures[name] ? 'bg-orange-100 text-orange-600' : 'bg-green-600 text-white'}`
  }, signatures[name] ? '✏️ Update' : '➕ Add'), signatures[name] && /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteSignature(name),
    className: "text-red-500 text-lg"
  }, "\uD83D\uDDD1\uFE0F"), !defaultMembers.includes(name) && /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteMember(name),
    className: "text-red-500 text-xs underline ml-1"
  }, "Remove")))))), showSignaturePad && /*#__PURE__*/React.createElement(SignaturePad, {
    name: showSignaturePad,
    onSave: sig => saveSignature(showSignaturePad, sig),
    onCancel: () => setShowSignaturePad(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDD27"), " Storage & Maintenance"), storageInfo && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-sm mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Local Storage"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, storageInfo.totalMB, " MB / 5 MB")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-200 rounded-full h-3 overflow-hidden",
    role: "progressbar",
    "aria-valuenow": storageInfo.pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-label": "Local storage usage"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full rounded-full transition-all ${storageInfo.pct > 90 ? 'bg-red-500' : storageInfo.pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`,
    style: {
      width: Math.max(storageInfo.pct, 2) + '%'
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mt-1"
  }, storageInfo.pct, "% used")), /*#__PURE__*/React.createElement("button", {
    onClick: doFixEverything,
    disabled: isFixing,
    className: `w-full py-3 rounded-lg text-white font-bold text-base ${isFixing ? 'bg-gray-400' : 'bg-red-600 active:bg-red-700'}`
  }, isFixing ? 'Working...' : 'Fix Everything'), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-2 text-center"
  }, "Strips photos from cache, clears temp data & caches. Forms & credentials preserved."), fixStatus && /*#__PURE__*/React.createElement("div", {
    className: `mt-3 p-3 rounded-lg text-sm ${fixDone ? 'bg-green-50 border border-green-200 text-green-700' : isFixing ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-red-50 border border-red-200 text-red-700'}`
  }, fixStatus), fixDone && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.location.reload(),
    className: "w-full mt-2 py-3 rounded-lg bg-orange-600 active:bg-orange-700 text-white font-bold text-base"
  }, "Reload App")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCBE"), " Data Export / Import"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-3"
  }, "Export all app data as a JSON file for backup or transfer to another device."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (typeof DataExport !== 'undefined') {
        var result = DataExport.downloadExport();
        if (typeof ToastNotifier !== 'undefined') {
          ToastNotifier.show('Exported ' + result.keys + ' data keys (' + Math.round(result.size / 1024) + ' KB)', 'success');
        }
      }
    },
    className: "flex-1 py-3 rounded-lg bg-blue-600 active:bg-blue-700 text-white font-bold text-sm"
  }, "Export Data"), /*#__PURE__*/React.createElement("label", {
    className: "flex-1 py-3 rounded-lg bg-indigo-500 active:bg-indigo-600 text-white font-bold text-sm text-center cursor-pointer"
  }, "Import Data", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".json",
    className: "hidden",
    onChange: e => {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        if (typeof DataExport !== 'undefined') {
          var result = DataExport.importData(ev.target.result);
          if (result.success) {
            if (typeof ToastNotifier !== 'undefined') {
              ToastNotifier.show('Imported ' + result.restored + ' data keys. Reloading...', 'success');
            }
            setTimeout(function () {
              window.location.reload();
            }, 1500);
          } else {
            ToastNotifier.error('Import failed: ' + (result.error || 'Unknown error'));
          }
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  })))), /*#__PURE__*/React.createElement(SystemHealthCard, null), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "J&M Artsteel Safety App v2.0"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "NSW WHS Act 2011 Compliant")));
}
window.SettingsView = SettingsView;

// === js/components/view-recordings.jsx ===
// RecordingsView Component
// Extracted from views.jsx

/**
 * Job recordings view for capturing and viewing site photos organized by job/date.
 * @param {Object} props
 * @param {Array} props.forms - Array of all saved form objects, used to detect today's prestart for auto-job selection
 * @param {Array} props.sites - List of site name strings for manual job selection
 */
function RecordingsView({
  forms,
  sites
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [savedRecordings, setSavedRecordings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOB_RECORDINGS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Could not parse job recordings:', e);
      return [];
    }
  });
  const [viewingRecording, setViewingRecording] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Smart job detection - find today's prestart
  useEffect(() => {
    if (!selectedJob) {
      const today = new Date().toDateString();
      const todaysPrestarts = forms.filter(f => f.type === 'prestart' && new Date(f.createdAt).toDateString() === today);
      if (todaysPrestarts.length > 0) {
        // Get the most recent prestart from today
        const latestPrestart = todaysPrestarts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setSelectedJob({
          id: latestPrestart.id,
          name: latestPrestart.data?.siteConducted || 'Unknown Site',
          date: latestPrestart.createdAt,
          type: 'prestart'
        });
      }
    }
  }, [forms, selectedJob]);

  // Get available jobs from prestarts and sites
  const getAvailableJobs = () => {
    const jobs = [];

    // Add jobs from recent prestarts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    forms.filter(f => f.type === 'prestart' && new Date(f.createdAt) > sevenDaysAgo).forEach(prestart => {
      const siteName = prestart.data?.siteConducted || 'Unknown Site';
      const dateStr = new Date(prestart.createdAt).toLocaleDateString('en-AU');
      jobs.push({
        id: prestart.id,
        name: siteName,
        date: prestart.createdAt,
        label: `${siteName} (${dateStr})`,
        type: 'prestart'
      });
    });

    // Add available sites (for manual selection)
    const defaultSites = sites.length > 0 ? sites : ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney'];
    defaultSites.forEach(site => {
      // Only add if not already in the list from prestarts
      if (!jobs.find(j => j.name === site)) {
        jobs.push({
          id: `site-${site}`,
          name: site,
          date: new Date().toISOString(),
          label: `${site} (No prestart today)`,
          type: 'site'
        });
      }
    });
    return jobs;
  };

  // Compress image
  const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = event => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = height * maxWidth / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedData = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedData);
        };
        img.onerror = () => resolve(event.target.result);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Handle photo capture
  const handlePhotoCapture = async e => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const compressedData = await compressImage(file);
        if (compressedData) {
          const newPhoto = {
            id: Date.now() + Math.random(),
            name: file.name,
            data: compressedData,
            timestamp: new Date().toISOString()
          };
          setPhotos(prev => [...prev, newPhoto]);
        }
      }
    }
    e.target.value = '';
  };

  // Remove photo
  const removePhoto = photoId => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Save recording locally
  const saveRecordingLocally = () => {
    if (!selectedJob || photos.length === 0) return;
    const recording = {
      id: Date.now(),
      jobId: selectedJob.id,
      jobName: selectedJob.name,
      date: new Date().toISOString(),
      photos: photos,
      driveUploaded: false
    };
    const updatedRecordings = [recording, ...savedRecordings];
    setSavedRecordings(updatedRecordings);
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeRecordingsWrite) {
      StorageQuotaManager.safeRecordingsWrite(updatedRecordings);
    } else {
      localStorage.setItem(STORAGE_KEYS.JOB_RECORDINGS, JSON.stringify(updatedRecordings));
    }
    setPhotos([]);
    setUploadStatus('Saved locally!');
    setTimeout(() => setUploadStatus(''), 3000);
  };

  // Upload to Google Drive
  const uploadToDrive = async () => {
    if (!selectedJob || photos.length === 0) return;
    if (!GoogleDriveSync.isConnected()) {
      setUploadStatus('Please connect Google Drive in Settings first');
      return;
    }
    setIsUploading(true);
    setUploadStatus('Uploading to Google Drive...');
    try {
      const result = await GoogleDriveSync.uploadJobPhotos(photos, selectedJob.name, new Date());
      if (result.success) {
        // Save recording with drive upload status
        const recording = {
          id: Date.now(),
          jobId: selectedJob.id,
          jobName: selectedJob.name,
          date: new Date().toISOString(),
          photos: photos,
          driveUploaded: true,
          driveResults: result.results
        };
        const updatedRecordings = [recording, ...savedRecordings];
        setSavedRecordings(updatedRecordings);
        if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeRecordingsWrite) {
          StorageQuotaManager.safeRecordingsWrite(updatedRecordings);
        } else {
          localStorage.setItem(STORAGE_KEYS.JOB_RECORDINGS, JSON.stringify(updatedRecordings));
        }
        setPhotos([]);
        setUploadStatus(`Uploaded ${result.uploaded} photos to Google Drive!`);
      } else {
        setUploadStatus('Upload failed: ' + result.error);
      }
    } catch (error) {
      setUploadStatus('Upload error: ' + error.message);
    }
    setIsUploading(false);
    setTimeout(() => setUploadStatus(''), 5000);
  };

  // Download photos individually
  const downloadPhotos = () => {
    const downloadable = photos.filter(p => p.data && p.data !== '[in-firebase]');
    if (downloadable.length === 0) {
      ToastNotifier.info('No photos available for local download — they are in the cloud');
      return;
    }
    downloadable.forEach((photo, idx) => {
      downloadPhotoFile(photo.data, `${selectedJob?.name || 'job'}-photo-${idx + 1}.jpg`);
    });
    setUploadStatus(`Downloaded ${downloadable.length} photos!`);
    setTimeout(() => setUploadStatus(''), 3000);
  };

  // Delete saved recording
  const deleteRecording = recordingId => {
    const updatedRecordings = savedRecordings.filter(r => r.id !== recordingId);
    setSavedRecordings(updatedRecordings);
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeRecordingsWrite) {
      StorageQuotaManager.safeRecordingsWrite(updatedRecordings);
    } else {
      localStorage.setItem(STORAGE_KEYS.JOB_RECORDINGS, JSON.stringify(updatedRecordings));
    }
    setViewingRecording(null);
  };
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCF8"), " Job Recordings"), /*#__PURE__*/React.createElement("p", {
    className: "text-teal-100 text-sm mt-1"
  }, "Capture and save photos for your job"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", null, todayDate))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Current Job"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowJobSelector(!showJobSelector),
    "aria-expanded": showJobSelector,
    className: "text-teal-600 text-sm underline"
  }, "Change")), selectedJob ? /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-50 border border-teal-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, selectedJob.type === 'prestart' ? '📋' : '🏗️'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-teal-800"
  }, selectedJob.name), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-teal-600"
  }, selectedJob.type === 'prestart' ? 'Prestart completed' : 'Manual selection', " - ", new Date(selectedJob.date).toLocaleDateString('en-AU'))))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-yellow-800 text-sm"
  }, "No job detected for today. Please select a job.")), showJobSelector && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2 max-h-48 overflow-y-auto"
  }, getAvailableJobs().map(job => /*#__PURE__*/React.createElement("button", {
    key: job.id,
    onClick: () => {
      setSelectedJob(job);
      setShowJobSelector(false);
    },
    className: `w-full text-left p-3 rounded-lg border transition ${selectedJob?.id === job.id ? 'bg-teal-100 border-teal-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, job.type === 'prestart' ? '📋' : '🏗️'), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, job.label)))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, "Take Photos"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => cameraInputRef.current?.click(),
    className: "flex-1 bg-teal-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCF7"), " Camera"), /*#__PURE__*/React.createElement("button", {
    onClick: () => galleryInputRef.current?.click(),
    className: "flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDDBC\uFE0F"), " Gallery"), /*#__PURE__*/React.createElement("input", {
    ref: cameraInputRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: handlePhotoCapture,
    className: "hidden",
    "aria-label": "Take photo with camera"
  }), /*#__PURE__*/React.createElement("input", {
    ref: galleryInputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: handlePhotoCapture,
    className: "hidden",
    "aria-label": "Choose photos from gallery"
  })), photos.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-700"
  }, photos.length, " photo(s) ready"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPhotos([]),
    className: "text-red-500 text-sm underline"
  }, "Clear all")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2"
  }, photos.map(photo => /*#__PURE__*/React.createElement("div", {
    key: photo.id,
    className: "relative"
  }, photo.data && photo.data !== '[in-firebase]' && photo.data.startsWith('data:') ? /*#__PURE__*/React.createElement("img", {
    src: photo.data,
    alt: "captured",
    className: "w-full h-16 object-cover rounded-lg"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400"
  }, "\u2601\uFE0F"), /*#__PURE__*/React.createElement("button", {
    onClick: () => removePhoto(photo.id),
    "aria-label": "Remove photo",
    className: "absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
  }, "\u2715")))))), photos.length > 0 && selectedJob && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Save Photos"), /*#__PURE__*/React.createElement("button", {
    onClick: downloadPhotos,
    className: "w-full bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE5"), " Download to Phone"), /*#__PURE__*/React.createElement("button", {
    onClick: saveRecordingLocally,
    className: "w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCBE"), " Save in App"), /*#__PURE__*/React.createElement("button", {
    onClick: uploadToDrive,
    disabled: isUploading || !GoogleDriveSync.isConnected(),
    className: `w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${GoogleDriveSync.isConnected() ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, isUploading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin"
  }, "\u23F3"), " Uploading...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\u2601\uFE0F"), " Upload to Google Drive")), !GoogleDriveSync.isConnected() && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center"
  }, "Connect Google Drive in Settings to enable cloud upload")), uploadStatus && /*#__PURE__*/React.createElement("div", {
    className: `p-3 rounded-lg text-center ${uploadStatus.includes('error') || uploadStatus.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`
  }, uploadStatus), savedRecordings.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, "Saved Recordings"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, savedRecordings.slice(0, 10).map(recording => /*#__PURE__*/React.createElement("button", {
    key: recording.id,
    onClick: () => setViewingRecording(recording),
    className: "w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCF8"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-800"
  }, recording.jobName), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, new Date(recording.date).toLocaleDateString('en-AU'), " - ", recording.photos.length, " photos"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, recording.driveUploaded && /*#__PURE__*/React.createElement("span", {
    className: "text-green-500 text-sm"
  }, "\u2601\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "\u203A"))))))), viewingRecording && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "recording-modal-title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-600 text-white p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    id: "recording-modal-title",
    className: "text-lg font-bold"
  }, viewingRecording.jobName), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewingRecording(null),
    "aria-label": "Close",
    className: "text-white text-2xl"
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, new Date(viewingRecording.date).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })), viewingRecording.driveUploaded && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-200 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-green-700 text-sm"
  }, "\u2601\uFE0F Uploaded to Google Drive")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, viewingRecording.photos.map((photo, idx) => photo.data && photo.data !== '[in-firebase]' && photo.data.startsWith('data:') ? /*#__PURE__*/React.createElement("img", {
    key: idx,
    src: photo.data,
    alt: `Photo ${idx + 1}`,
    className: "w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80",
    onClick: () => {
      const win = window.open('', '_blank');
      if (!win) {
        const link = document.createElement('a');
        link.href = photo.data;
        link.download = `photo-${idx + 1}.jpg`;
        link.click();
        return;
      }
      const img = win.document.createElement('img');
      img.src = photo.data;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      win.document.body.appendChild(img);
    }
  }) : /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400"
  }, "\u2601\uFE0F In cloud")))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-t border-gray-200 space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      viewingRecording.photos.forEach((photo, idx) => {
        downloadPhotoFile(photo.data, `${viewingRecording.jobName}-photo-${idx + 1}.jpg`);
      });
    },
    className: "w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE5"), " Download All Photos"), /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteRecording(viewingRecording.id),
    className: "w-full bg-red-100 text-red-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Delete Recording")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-blue-800"
  }, "Storage Info"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-700 mt-1"
  }, "Photos are saved to your phone and can be uploaded to Google Drive. Firebase/Drive has plenty of space (~5GB free, affordable beyond that).")))));
}

// Export to window for cross-file access
window.RecordingsView = RecordingsView;