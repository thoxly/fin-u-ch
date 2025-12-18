async function verify() {
  const PORT = process.env.PORT || 4000;
  const url = `http://localhost:${PORT}/api/demo/start-session`;
  console.log(`Testing ${url}...`);

  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Status ${res.status}: ${res.statusText} - ${text}`);
    }
    const body: any = await res.json();
    console.log('Response:', JSON.stringify(body, null, 2));

    if (body.success && body.data && body.data.accessToken) {
      console.log('✅ Verification SUCCESS: Session started, token received.');
    } else {
      console.error('❌ Verification FAILED: Invalid response structure.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Verification FAILED:', err);
    // If connection refused, try 3000
    if ((err as any).cause?.code === 'ECONNREFUSED' && PORT === 4000) {
      console.log('Retrying on port 3000...');
      process.env.PORT = '3000';
      return verify();
    }
    process.exit(1);
  }
}

verify();
