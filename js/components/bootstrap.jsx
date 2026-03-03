// App bootstrap: ReactDOM.createRoot
// Extracted from index.html

console.log('[BOOTSTRAP] Starting React render...');
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <ErrorBoundary>
      <AppWithAuth />
    </ErrorBoundary>
  );
  console.log('[BOOTSTRAP] React render initiated successfully (with ErrorBoundary)');
} catch (err) {
  console.error('[BOOTSTRAP] Render error:', err);
  document.getElementById('root').innerHTML =
    '<div style="padding:20px;color:red;font-family:system-ui;">' +
    '<h2>App Error</h2><pre>' + err.message + '</pre></div>';
}
