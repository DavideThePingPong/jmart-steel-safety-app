// TrainingView Component
// Uses TRAINING_COURSES from trainingCourseData.js
// Uses TrainingCertGenerator from trainingCertGenerator.js

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
    const saved = localStorage.getItem('jmart-completed-training');
    return saved ? JSON.parse(saved) : [];
  });

  // Course data from external file
  const courses = TRAINING_COURSES;

  const handleAnswer = (questionIndex, answerIndex) => {
    setAnswers({...answers, [questionIndex]: answerIndex});
  };

  const calculateScore = () => {
    if (!selectedCourse) return 0;
    let correct = 0;
    selectedCourse.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    return Math.round((correct / selectedCourse.questions.length) * 100);
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
      localStorage.setItem('jmart-completed-training', JSON.stringify(newCompleted));
    }
    setShowResults(true);
  };

  const resetCourse = () => {
    setSelectedCourse(null);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  const isCompleted = (courseId) => completedCourses.some(c => c.courseId === courseId);

  const generateCertificate = () => {
    TrainingCertGenerator.generate(workerName, selectedCourse, signatureData, calculateScore);
  };

  const getAppUrl = () => 'https://davidethepingpong.github.io/jmart-steel-safety-app/index.html';

  // Course List View
  if (!selectedCourse) {
    return (
      <div className="space-y-4">
        {showQRCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowQRCode(false)}>
            <div className="bg-white rounded-xl p-6 max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-3">📱 Share J&M Artsteel Safety App</h3>
              <p className="text-sm text-gray-600 mb-4">Workers can scan this QR code to install the Safety App on their phone</p>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <img src={'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(getAppUrl())} alt="QR Code" className="mx-auto" />
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-xs break-all text-gray-600 mb-4">{getAppUrl()}</div>
              <button onClick={() => {navigator.clipboard.writeText(getAppUrl()); alert('Link copied!');}} className="w-full bg-orange-600 text-white p-3 rounded-lg font-semibold mb-2">📋 Copy Link</button>
              <button onClick={() => setShowQRCode(false)} className="w-full bg-gray-200 p-3 rounded-lg font-semibold">Close</button>
            </div>
          </div>
        )}

        {viewingStandards && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setViewingStandards(null)}>
            <div className="bg-white rounded-xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-3">📋 {viewingStandards.title} - Standards</h3>
              <p className="text-sm text-gray-600 mb-4">This training references the following Australian Standards:</p>
              <div className="space-y-3">
                {viewingStandards.standards && viewingStandards.standards.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="block bg-blue-50 p-3 rounded-lg hover:bg-blue-100 transition-colors">
                    <p className="font-medium text-blue-800 text-sm">{s.code}</p>
                    <p className="text-xs text-blue-600 mt-1">🔗 View Standard →</p>
                  </a>
                ))}
              </div>
              <button onClick={() => setViewingStandards(null)} className="w-full bg-gray-200 p-3 rounded-lg font-semibold mt-4">Close</button>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">📚 Training Courses</h2>
              <p className="text-sm opacity-90 mt-1">Complete courses to stay safe on site</p>
            </div>
            <button onClick={() => setShowQRCode(true)} className="bg-white bg-opacity-20 p-2 rounded-lg hover:bg-opacity-30" title="Share with workers">
              <span className="text-2xl">📱</span>
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {courses.map(course => (
            <div key={course.id} className="bg-white p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{course.image}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{course.title}</h3>
                    {isCompleted(course.id) && <span className="text-green-500 text-lg">✅</span>}
                  </div>
                  <p className="text-sm text-gray-600">{course.description}</p>
                  <p className="text-xs text-gray-400 mt-1">⏱️ {course.duration} • {course.questions.length} questions</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setSelectedCourse(course)} className="flex-1 bg-orange-600 text-white p-2 rounded-lg font-semibold text-sm">
                  Start Course ▶
                </button>
                {course.standards && (
                  <button onClick={() => setViewingStandards(course)} className="bg-blue-100 text-blue-700 p-2 rounded-lg text-sm font-medium">
                    📋 Standards
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {completedCourses.length > 0 && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4">
            <h3 className="font-semibold text-green-800">🎉 Completed Training</h3>
            <p className="text-sm text-green-600">{completedCourses.length} of {courses.length} courses completed</p>
          </div>
        )}
      </div>
    );
  }

  // Results View
  if (showResults) {
    const score = calculateScore();
    const passed = score >= 80;

    if (showSignature) {
      return (
        <SignaturePad
          name={workerName}
          onSave={(sig) => {
            setSignatureData(sig);
            setShowSignature(false);
            setShowCertificate(true);
          }}
          onCancel={() => setShowSignature(false)}
        />
      );
    }

    if (showCertificate) {
      return (
        <div className="space-y-4">
          <div className="bg-green-500 text-white p-6 rounded-xl text-center">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold">Certificate Ready!</h2>
            <p className="mt-2">Your training certificate has been prepared</p>
          </div>

          <div className="bg-white rounded-xl p-4 space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-2">{selectedCourse.image}</p>
              <h3 className="font-bold text-lg">{selectedCourse.title}</h3>
              <p className="text-green-600 font-semibold">Score: {score}% ✓</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2"><strong>Worker:</strong> {workerName}</p>
              <p className="text-sm text-gray-600 mb-2"><strong>Date:</strong> {new Date().toLocaleDateString('en-AU')}</p>
              {signatureData && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Signature:</p>
                  <img src={signatureData} alt="Signature" className="h-12 border rounded" />
                </div>
              )}
            </div>

            {selectedCourse.standards && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-2">📋 Standards Referenced:</p>
                {selectedCourse.standards.map((s, i) => (
                  <p key={i} className="text-xs text-blue-700">• {s.code}</p>
                ))}
              </div>
            )}
          </div>

          <button onClick={generateCertificate} className="w-full bg-green-600 text-white p-4 rounded-xl font-semibold">
            📥 Download Certificate
          </button>

          <button onClick={resetCourse} className="w-full bg-gray-200 text-gray-700 p-4 rounded-xl font-semibold">
            Back to Courses
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className={`${passed ? 'bg-green-500' : 'bg-red-500'} text-white p-6 rounded-xl text-center`}>
          <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold">{passed ? 'Congratulations!' : 'Keep Learning!'}</h2>
          <p className="text-4xl font-bold mt-2">{score}%</p>
          <p className="mt-2">{passed ? 'You passed the course!' : 'You need 80% to pass. Try again!'}</p>
        </div>

        {passed && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">📝 Sign & Get Certificate</h3>
            <p className="text-sm text-gray-600">Enter your name and sign to receive your training certificate.</p>
            <input
              type="text"
              placeholder="Enter your full name"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
            <button
              onClick={() => setShowSignature(true)}
              disabled={!workerName.trim()}
              className={`w-full p-3 rounded-lg font-semibold ${workerName.trim() ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}
            >
              ✍️ Sign Certificate
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Review Your Answers</h3>
          {selectedCourse.questions.map((q, i) => (
            <div key={i} className={`p-3 rounded-lg ${answers[i] === q.correct ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="font-medium text-sm">{q.question}</p>
              <p className="text-xs mt-1">Your answer: {q.options[answers[i]]}</p>
              {answers[i] !== q.correct && (
                <p className="text-xs text-green-700 mt-1">Correct: {q.options[q.correct]}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>
            </div>
          ))}
        </div>

        <button onClick={resetCourse} className="w-full bg-orange-600 text-white p-4 rounded-xl font-semibold">
          Back to Courses
        </button>
      </div>
    );
  }

  // Quiz View
  const question = selectedCourse.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / selectedCourse.questions.length) * 100;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <button onClick={resetCourse} className="text-gray-500">✕ Exit</button>
          <span className="text-sm text-gray-500">{currentQuestion + 1} / {selectedCourse.questions.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width: progress + '%'}}></div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="text-center mb-4">
          <span className="text-4xl">{selectedCourse.image}</span>
          <h2 className="font-bold text-lg mt-2">{selectedCourse.title}</h2>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="font-medium text-gray-900">{question.question}</p>
        </div>

        <div className="space-y-2">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(currentQuestion, i)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                answers[currentQuestion] === i
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {currentQuestion > 0 && (
          <button
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
            className="flex-1 bg-gray-200 p-4 rounded-xl font-semibold"
          >
            ← Previous
          </button>
        )}
        {currentQuestion < selectedCourse.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            disabled={answers[currentQuestion] === undefined}
            className={`flex-1 p-4 rounded-xl font-semibold ${
              answers[currentQuestion] !== undefined
                ? 'bg-orange-600 text-white'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={completeCourse}
            disabled={answers[currentQuestion] === undefined}
            className={`flex-1 p-4 rounded-xl font-semibold ${
              answers[currentQuestion] !== undefined
                ? 'bg-green-600 text-white'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            Complete ✓
          </button>
        )}
      </div>
    </div>
  );
}

// Error Boundary for debugging
class DebugErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error: error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo: errorInfo }); console.error('ERROR BOUNDARY CAUGHT:', error.message, error.stack); }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: '20px', background: '#fee', border: '2px solid red', margin: '10px', borderRadius: '8px' } },
        React.createElement('h2', { style: { color: 'red' } }, 'Component Error'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontSize: '12px' } }, String(this.state.error)),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontSize: '10px', marginTop: '10px' } }, this.state.errorInfo ? this.state.errorInfo.componentStack : 'no stack')
      );
    }
    return this.props.children;
  }
}

// Export to window for cross-file access
window.TrainingView = TrainingView;
window.DebugErrorBoundary = DebugErrorBoundary;
