export function ConfigMissing({ missing }: { missing: string[] }) {
  return (
    <div className="login-page">
      <div className="card login-card" style={{ width: 'min(100%, 560px)', textAlign: 'left', alignItems: 'stretch' }}>
        <h1>Firebase is not configured</h1>
        <p className="muted">The following environment variables are missing:</p>
        <ul className="config-list">
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
        <p>
          Copy <span className="code-inline">.env.example</span> to <span className="code-inline">.env</span>, fill in
          the values from your Firebase project settings and restart the dev server. On Netlify, add the same
          variables under <em>Site configuration → Environment variables</em> and redeploy.
        </p>
      </div>
    </div>
  );
}
