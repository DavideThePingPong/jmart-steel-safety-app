// Auth: LoginScreen, AppWithAuth
// Extracted from index.html

function LoginScreen({ onAuthenticated, authStatus }) {
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Check if this is first time setup (no password set)
    if (!DeviceAuthManager.APP_PASSWORD_HASH) {
      setIsFirstSetup(true);
    }
  }, []);

  const handleFirstSetup = async () => {
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await Promise.race([
        (async () => {
          await DeviceAuthManager.setPassword(newPassword);
          await DeviceAuthManager.registerDevice(deviceName || 'Admin Device');
          await DeviceAuthManager.approveAsAdmin();
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]);
      onAuthenticated(true);
    } catch (err) {
      if (err.message === 'timeout') {
        console.warn('Setup timed out waiting for Firebase, proceeding anyway');
        onAuthenticated(true);
      } else {
        setError('Setup failed. Please try again.');
      }
    }

    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!password) {
      setError('Please enter the password');
      return;
    }

    setIsLoading(true);
    setError('');

    if (await DeviceAuthManager.verifyPassword(password)) {
      // Password correct - grant access IMMEDIATELY
      onAuthenticated(true);
      // Fire-and-forget device registration
      Promise.race([
        DeviceAuthManager.init(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]).then(status => {
        if (status.status === 'new') {
          DeviceAuthManager.registerDevice(deviceName || 'Unknown Device').catch(() => {});
        }
      }).catch(() => {});
    } else {
      setError('Incorrect password');
    }

    setIsLoading(false);
  };

  // First time setup screen
  if (isFirstSetup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🛡️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">J&M Artsteel Safety</h1>
            <p className="text-gray-500 mt-2">First Time Setup</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Jeff's iPhone"
                className="w-full border border-gray-300 rounded-lg p-3 text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set App Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full border border-gray-300 rounded-lg p-3 text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full border border-gray-300 rounded-lg p-3 text-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleFirstSetup()}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleFirstSetup}
              disabled={isLoading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400"
            >
              {isLoading ? '⏳ Setting up...' : '🔐 Complete Setup'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              This password will be required for all devices accessing the app.
              Share it only with authorized team members.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pending approval screen
  if (authStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Awaiting Approval</h1>
          <p className="text-gray-500 mt-2 mb-6">
            Your device is waiting for admin approval.
            Please ask Jeff or your supervisor to approve this device.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">Device ID:</p>
            <p className="font-mono text-xs text-gray-800 break-all">{DeviceAuthManager.deviceId}</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold"
          >
            🔄 Check Again
          </button>
        </div>
      </div>
    );
  }

  // Normal login screen
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🛡️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">J&M Artsteel Safety</h1>
          <p className="text-gray-500 mt-2">Enter password to access</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device Name (optional)</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Scott's iPad"
              className="w-full border border-gray-300 rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter app password"
              className="w-full border border-gray-300 rounded-lg p-3 text-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400"
          >
            {isLoading ? '⏳ Checking...' : '🔓 Enter App'}
          </button>
        </div>
      </div>
    </div>
  );
}

// App Wrapper with Authentication
function AppWithAuth() {
  const [authState, setAuthState] = useState('loading'); // 'loading', 'authenticated', 'unauthenticated', 'pending'
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured || !firebaseDb) {
      // No Firebase = no auth required (local mode)
      setAuthState('authenticated');
      return;
    }

    let status;
    try {
      status = await Promise.race([
        DeviceAuthManager.init(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
      ]);
    } catch (timeoutErr) {
      console.warn('Auth check timed out after 5s, showing login screen:', timeoutErr.message);
      setAuthState('unauthenticated');
      return;
    }
    console.log('Device auth status:', status);

    if (status.canAccess) {
      setIsAdmin(DeviceAuthManager.isAdmin);
      setAuthState('authenticated');

      // Update last seen
      DeviceAuthManager.updateLastSeen();
    } else if (status.status === 'pending') {
      setAuthState('pending');
    } else if (status.status === 'new' && !DeviceAuthManager.APP_PASSWORD_HASH) {
      // First time setup
      setAuthState('unauthenticated');
    } else {
      setAuthState('unauthenticated');
    }
  };

  const handleAuthenticated = (success, newStatus) => {
    if (success) {
      setIsAdmin(DeviceAuthManager.isAdmin);
      setAuthState('authenticated');
    } else if (newStatus === 'pending') {
      setAuthState('pending');
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🛡️</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated' || authState === 'pending') {
    return <LoginScreen onAuthenticated={handleAuthenticated} authStatus={authState} />;
  }

  return <JMartSteelSafetyApp isAdmin={isAdmin} />;
}

// Main App

// Export to window for cross-file access
window.LoginScreen = LoginScreen;
window.AppWithAuth = AppWithAuth;
