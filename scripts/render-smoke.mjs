import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const server=await createServer({appType:'custom',server:{middlewareMode:true},logLevel:'error'});
try {
  const {default:App}=await server.ssrLoadModule('/src/App.jsx');
  const html=renderToString(React.createElement(App));
  assert.match(html,/Beautiful documents/);
  assert.match(html,/Document workspace/);
  assert.match(html,/SAMPLE DOCUMENT/);
  assert.match(html,/Print \/ Save as PDF/);
  assert.match(html,/Local-first by design/);
  console.log('React server-render smoke test passed.');
} finally {
  await server.close();
}
