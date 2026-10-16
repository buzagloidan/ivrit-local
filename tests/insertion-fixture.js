globalThis.insertionHandlers = [];
globalThis.insertionResults = [];
globalThis.chrome = { runtime: {
  id: 'ivrit-test',
  onMessage: { addListener: (fn) => insertionHandlers.push(fn) },
  sendMessage: async (message) => { insertionResults.push(message); document.getElementById('results').textContent=message.ok?'Text inserted by trusted input. Undo is available.':message.error||'Cancelled'; },
} };
