// Auth: LoginScreen, AppWithAuth
// Extracted from index.html

function isE2EAuthRuntime() {
  return window.__JMART_E2E__ === true;
}

function hasE2EAuthenticatedSession() {
  if (!isE2EAuthRuntime()) return true;
  try {
    return sessionStorage.getItem('jmart-e2e-authenticated') === 'true';
  } catch (e) {
    return false;
  }
}

function markE2EAuthenticated() {
  if (!isE2EAuthRuntime()) return;
  try {
    sessionStorage.setItem('jmart-e2e-authenticated', 'true');
  } catch (e) {}
}

function LoginScreen({ onAuthenticated, authStatus }) {
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState(() => {
    try { return localStorage.getItem('jmart-device-name') || ''; } catch(e) { return ''; }
  });
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
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters (use a mix of letters and numbers)');
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
          const passwordSaved = await DeviceAuthManager.setPassword(newPassword);
          if (!passwordSaved) throw new Error('setup-password-failed');

          const deviceRegistered = await DeviceAuthManager.registerDevice(deviceName || 'Admin Device');
          if (!deviceRegistered) throw new Error('setup-device-registration-failed');

          const adminApproved = await DeviceAuthManager.approveAsAdmin();
          if (!adminApproved) throw new Error('setup-admin-approval-failed');
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]);
      // Save device name locally so it's remembered forever
      if (deviceName) {
        try { localStorage.setItem('jmart-device-name', deviceName); } catch(e) {}
      }
      onAuthenticated(true);
    } catch (err) {
      if (err.message === 'timeout') {
        console.warn('Setup timed out waiting for Firebase confirmation');
        setError('Setup could not be confirmed within 8 seconds. Check Firebase connectivity and try again.');
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
      // Save device name locally so it's remembered next time
      if (deviceName) {
        try { localStorage.setItem('jmart-device-name', deviceName); } catch(e) {}
      }
      try {
        const status = await DeviceAuthManager.init();

        if (status.canAccess) {
          onAuthenticated(true);
        } else if (status.status === 'new') {
          await DeviceAuthManager.registerDevice(deviceName || 'Unknown Device');
          onAuthenticated(false, 'pending');
        } else if (status.status === 'pending') {
          onAuthenticated(false, 'pending');
        } else if (status.status === 'recovery-required') {
          onAuthenticated(false, 'recovery-required');
        } else if (status.status === 'error') {
          setError('Could not verify device approval right now. Access stays locked until Firebase responds.');
        } else if (status.status === 'denied') {
          setError('This device has been denied access. Please contact an administrator.');
        } else {
          setError('Could not verify device approval. Please try again.');
        }
      } catch (err) {
        setError('Could not verify device approval right now. Please try again.');
      }
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
            <img src="icons/icon-192x192.png" alt="J&M Artsteel" className="w-20 h-20 rounded-2xl mx-auto mb-4" />
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
                aria-label="Device Name"
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
                aria-label="Set App Password"
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
                aria-label="Confirm Password"
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

  if (authStatus === 'recovery-required') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Manual Admin Recovery Required</h1>
          <p className="text-gray-500 mt-2 mb-6">
            No active admin device is available. Automatic browser-based admin recovery has been disabled for security.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-gray-600 mb-2">Device ID</p>
            <p className="font-mono text-xs text-gray-800 break-all mb-3">{DeviceAuthManager.deviceId}</p>
            <p className="text-xs text-gray-600">
              Run <code>npm run recover:admin -- --device-id=&lt;Device ID&gt;</code> from the project folder on an authorized machine, then reload this app.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold"
          >
            Check Again
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
          <img src="icons/icon-192x192.png" alt="J&M Artsteel" className="w-20 h-20 rounded-2xl mx-auto mb-4" />
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
              aria-label="Device Name (optional)"
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
              aria-label="Password"
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
  const [authState, setAuthState] = useState('loading'); // 'loading', 'authenticated', 'unauthenticated', 'pending', 'recovery-required'
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoadingMessage, setAuthLoadingMessage] = useState('Checking device approval...');

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
    let slowAuthTimer = null;
    try {
      setAuthLoadingMessage('Checking device approval...');
      slowAuthTimer = setTimeout(() => {
        setAuthLoadingMessage('Still checking device approval...');
      }, 5000);
      status = await DeviceAuthManager.init();
    } catch (authErr) {
      console.warn('Auth check failed:', authErr.message);
      setAuthState('unauthenticated');
      return;
    } finally {
      if (slowAuthTimer) {
        clearTimeout(slowAuthTimer);
      }
    }
    console.log('Device auth status:', status);

    const requiresE2ELogin = isE2EAuthRuntime() &&
      !!DeviceAuthManager.APP_PASSWORD_HASH &&
      !hasE2EAuthenticatedSession();
    const requiresE2EFirstSetup = isE2EAuthRuntime() &&
      !DeviceAuthManager.APP_PASSWORD_HASH;

    if (status.canAccess && requiresE2EFirstSetup) {
      setAuthState('unauthenticated');
    } else if (status.canAccess && !requiresE2ELogin) {
      setIsAdmin(DeviceAuthManager.isAdmin);
      setAuthState('authenticated');

      // Update last seen
      DeviceAuthManager.updateLastSeen();
    } else if (status.canAccess && requiresE2ELogin) {
      setAuthState('unauthenticated');
    } else if (status.status === 'pending') {
      setAuthState('pending');
    } else if (status.status === 'recovery-required') {
      setAuthState('recovery-required');
    } else if (status.status === 'new' && !DeviceAuthManager.APP_PASSWORD_HASH) {
      // First time setup
      setAuthState('unauthenticated');
    } else {
      setAuthState('unauthenticated');
    }
  };

  const handleAuthenticated = (success, newStatus) => {
    if (success) {
      markE2EAuthenticated();
      setIsAdmin(DeviceAuthManager.isAdmin);
      setAuthState('authenticated');
    } else if (newStatus === 'recovery-required') {
      setAuthState('recovery-required');
    } else if (newStatus === 'pending') {
      setAuthState('pending');
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <img src="icons/icon-192x192.png" alt="J&M Artsteel" className="w-20 h-20 rounded-2xl mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">{authLoadingMessage}</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated' || authState === 'pending' || authState === 'recovery-required') {
    return <LoginScreen onAuthenticated={handleAuthenticated} authStatus={authState} />;
  }

  return <JMartSteelSafetyApp isAdmin={isAdmin} />;
}

// Main App

// Export to window for cross-file access
window.LoginScreen = LoginScreen;
window.AppWithAuth = AppWithAuth;
